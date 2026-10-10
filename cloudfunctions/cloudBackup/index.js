// 云函数 cloudBackup：免费云备份（每人 1 份覆盖式快照）
// action:
//   get —— 按 openid 取当前快照（压缩串 payload_z 或旧明文 payload + meta）
//   put —— 校验并覆盖写入快照（10 分钟频控防连点）
//   delete —— 删除该用户全部快照文档（正常 1 份，历史重复一并清理）
//
// 数据存集合 cloud_backups（免费版不引入云存储）：
//   新路径 { openid, payload_z(gzip+base64), size_z, size(原文), childCount, recordCount, updatedAt }
//   旧路径 { openid, payload(v3 JSON 字符串), size, ... }（旧版本前端写入，兼容读取）
// 压缩收益：打卡记录 JSON 重复度高，gzip 压缩率 5-10 倍；存压缩串绕开
// 云数据库单文档 512KB 硬限制，原文上限放宽至 2MB。
// 安全设计：集合权限设为「仅创建者可读写」；云函数写入的文档不带 _openid，
// 小程序端直连数据库读不到任何文档，读写只能走本函数，配额无法被绕过。

const cloud = require('wx-server-sdk')
const zlib = require('zlib')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command // 更新指令（_.remove() 清除字段用）
const COL = 'cloud_backups'
const MAX_BYTES = 500 * 1024        // 旧明文路径上限（贴文档 512KB 硬限制，仅旧版本前端会走）
const MAX_RAW_BYTES = 2 * 1024 * 1024 // 压缩路径：解压后原文上限（防御压缩炸弹 + 防御性上限）
const MAX_Z_B64 = 380 * 1024        // 压缩路径：base64 串上限（文档总大小留足 512KB 余量）
const DEDUP_MS = 10 * 60 * 1000 // 同用户 10 分钟内重复上传直接去重返回

function ok(data) {
  return Object.assign({ ok: true }, data || {})
}

function fail(code, message) {
  return { ok: false, code, message }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return fail('NO_AUTH', '无法获取用户身份')

  const action = event && event.action
  try {
    if (action === 'get') return await handleGet(OPENID)
    if (action === 'put') return await handlePut(OPENID, event)
    if (action === 'delete') return await handleDelete(OPENID)
    return fail('BAD_ACTION', '未知操作')
  } catch (e) {
    console.error('cloudBackup error', e)
    return fail('SERVER_ERROR', '云端服务异常，请稍后再试')
  }
}

async function handleGet(openid) {
  const res = await db.collection(COL)
    .where({ openid })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()

  if (!res.data.length) return ok({ empty: true })

  const doc = res.data[0]
  // 压缩串优先返回；旧明文快照走 payload 字段（前端按非空判断分流）
  return ok({
    payload_z: doc.payload_z || '',
    payload: doc.payload || '',
    meta: {
      updatedAt: doc.updatedAt,
      size: doc.size,
      childCount: doc.childCount,
      recordCount: doc.recordCount
    }
  })
}

// 删除该用户全部快照文档（每人正常 1 份，历史重复文档一并兜底清理；幂等）
async function handleDelete(openid) {
  const res = await db.collection(COL).where({ openid }).remove()
  return ok({ removed: (res.stats && res.stats.removed) || 0 })
}

async function handlePut(openid, event) {
  const z = event && event.payload_z
  const legacy = event && event.payload
  let text = ''   // 解压后的 v3 JSON 原文（统一校验口径）
  let size = 0    // 原文字节数
  let storeZ = '' // 待存储的压缩串（明文路径为空）

  if (typeof z === 'string' && z) {
    // 新路径：gzip + base64，先验压缩串大小再解压（防压缩炸弹）
    if (z.length > MAX_Z_B64) {
      return fail('TOO_LARGE', `备份压缩后 ${Math.ceil(z.length / 1024)}KB，超出上限 ${Math.floor(MAX_Z_B64 / 1024)}KB`)
    }
    let buf
    try {
      buf = zlib.gunzipSync(Buffer.from(z, 'base64'))
    } catch (e) {
      return fail('BAD_JSON', '备份数据解压失败')
    }
    size = buf.length
    if (size > MAX_RAW_BYTES) {
      return fail('TOO_LARGE', `备份数据 ${Math.ceil(size / 1024)}KB，超出快照上限 ${MAX_RAW_BYTES / 1024 / 1024}MB`)
    }
    text = buf.toString('utf8')
    storeZ = z
  } else if (typeof legacy === 'string' && legacy) {
    // 旧路径：旧版本前端直传明文
    size = Buffer.byteLength(legacy, 'utf8')
    if (size > MAX_BYTES) {
      return fail('TOO_LARGE', `备份数据 ${Math.ceil(size / 1024)}KB，超出快照上限 ${Math.floor(MAX_BYTES / 1024)}KB`)
    }
    text = legacy
  } else {
    return fail('EMPTY', '备份内容为空')
  }

  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    return fail('BAD_JSON', '备份数据格式错误')
  }
  if (!Array.isArray(data.children) || !data.children.length) {
    return fail('BAD_FORMAT', '备份缺少孩子数据')
  }

  const childCount = data.children.length
  const recordCount = data.children.reduce(
    (n, c) => n + (Array.isArray(c.checkin_records) ? c.checkin_records.length : 0), 0)

  const now = Date.now()
  // 按 updatedAt 降序取最新一份：并发首次备份可能产生 2 份文档，取到旧的会读写错位
  const exist = await db.collection(COL).where({ openid }).orderBy('updatedAt', 'desc').limit(1).get()

  // 压缩/明文互斥：覆盖更新时清掉另一路径的旧字段，避免两个大字段共存撑爆文档
  const baseData = { size, childCount, recordCount, updatedAt: now }
  const updateData = storeZ
    ? Object.assign({ payload_z: storeZ, size_z: Buffer.byteLength(storeZ, 'utf8'),
        payload: _.remove() }, baseData)
    : Object.assign({ payload: legacy, payload_z: _.remove(), size_z: _.remove() }, baseData)

  // 已有快照：频控 + 覆盖更新。频控仅在内容指纹一致时去重（防同一设备连点）；
  // 指纹不同说明是另一台设备的新数据，必须真覆盖——无条件 dedup 会静默丢掉
  // 10 分钟窗口内跨设备上传的有效备份
  if (exist.data.length) {
    const prev = exist.data[0]
    const sameContent = prev.size === size
      && prev.childCount === childCount
      && prev.recordCount === recordCount
    if (now - prev.updatedAt < DEDUP_MS && sameContent) {
      return ok({ deduped: true, updatedAt: prev.updatedAt })
    }
    await db.collection(COL).doc(prev._id).update({ data: updateData })
    return ok({ updatedAt: now })
  }

  // 首次备份：显式写 openid 字段（云函数写入不会自动注入 _openid）
  const addData = storeZ
    ? Object.assign({ openid, payload_z: storeZ, size_z: Buffer.byteLength(storeZ, 'utf8') }, baseData)
    : Object.assign({ openid, payload: legacy }, baseData)
  await db.collection(COL).add({ data: addData })
  return ok({ updatedAt: now })
}
