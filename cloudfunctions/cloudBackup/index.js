// 云函数 cloudBackup：云备份（每人 1 份覆盖式快照）+ 备份权益闸门
// action:
//   get —— 按 openid 取当前快照（压缩串 payload_z 或旧明文 payload + meta）
//   put —— 校验并覆盖写入快照（10 分钟频控防连点）；需备份权益：会员或广告点数 ≥1，
//          或广告拉起失败的免费放行（free_fallback，每日 ≤ DAILY_FREE_LIMIT 次）
//   delete —— 删除该用户全部快照文档（正常 1 份，历史重复一并清理）
//   entitlement —— 查询当前权益状态（会员 / 剩余广告点数 / 今日已看次数）
//   unlock —— 激励视频完整观看后登记，+1 备份点数（每日上限防刷）
//
// 权益模型（商业化定案）：
//   备份设墙、恢复/删除不设墙——取回自己的数据永远免费；
//   云端数据永不过期不删除；权益判定收口云函数，前端广告回调不可信。
//   会员字段 membership 预留（type/expireAt），支付通道就绪后仅增购买写入入口。
//   广告兜底：激励视频拉起失败（审核环境无填充 / 广告位冷启动）时免费放行，每日
//   限额防滥用——保证「备份到云端」在任何环境下都可用，消除审核侧功能不可用拒审风险。
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
// 权益集合与配置（商业化：备份需会员或广告点数）
const ENT_COL = 'entitlements'
const DAILY_AD_LIMIT = 5 // 每日最多通过广告获得的备份次数（防刷兜底，前端无感）
const DAILY_FREE_LIMIT = 2 // 每日广告拉起失败的免费放行上限（审核安全兜底：广告无填充时备份仍可用）

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
    if (action === 'entitlement') return await handleEntitlement(OPENID)
    if (action === 'unlock') return await handleUnlock(OPENID)
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
      return ok({ deduped: true, updatedAt: prev.updatedAt }) // 内容未变不算新备份，不消耗权益
    }
    const gate = await consumeBackupCredit(openid, !!(event && event.free_fallback))
    if (!gate.ok) return gate
    await db.collection(COL).doc(prev._id).update({ data: updateData })
    return ok({ updatedAt: now })
  }

  // 首次备份：权益闸门 + 显式写 openid 字段（云函数写入不会自动注入 _openid）
  const gate = await consumeBackupCredit(openid, !!(event && event.free_fallback))
  if (!gate.ok) return gate
  const addData = storeZ
    ? Object.assign({ openid, payload_z: storeZ, size_z: Buffer.byteLength(storeZ, 'utf8') }, baseData)
    : Object.assign({ openid, payload: legacy }, baseData)
  await db.collection(COL).add({ data: addData })
  return ok({ updatedAt: now })
}

// ===== 权益层：会员 / 广告点数（备份设墙，恢复与删除不设墙） =====

// 北京时间日期串（云函数服务器为 UTC，按东八区归日）
function _bjDate(now) {
  return new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

// 会员是否有效（membership 预留结构 { type, expireAt }；expireAt 缺省视为永久）
function _isMember(ent) {
  return !!(ent && ent.membership
    && (!ent.membership.expireAt || ent.membership.expireAt > Date.now()))
}

// 读取该用户权益文档，不存在则惰性创建（并发重复创建无害，读取恒取第一条）
// 注意：wx-server-sdk 的 db 可能没有 createCollection（管理端能力），集合缺失时
// 依赖手动在云开发控制台建 entitlements 集合；此处保留尝试并记录真实错误便于排查
async function _loadEnt(openid) {
  let q
  try {
    q = await db.collection(ENT_COL).where({ openid }).limit(1).get()
  } catch (e) {
    console.error(`[entitlements] 集合查询失败（检查云端是否已建 ${ENT_COL} 集合）`, e && e.message)
    try {
      if (typeof db.createCollection === 'function') await db.createCollection(ENT_COL)
    } catch (e2) {
      console.error('[entitlements] 自动创建集合失败', e2 && e2.message)
    }
    q = await db.collection(ENT_COL).where({ openid }).limit(1).get()
  }
  if (q.data.length) return q.data[0]
  try {
    await db.collection(ENT_COL).add({
      data: { openid, credits: 0, dailyDate: '', dailyEarned: 0, freeDate: '', freeUsed: 0, membership: null, updatedAt: Date.now() }
    })
  } catch (e) { /* 并发下重复创建忽略 */ }
  const q2 = await db.collection(ENT_COL).where({ openid }).limit(1).get()
  return q2.data[0] || null
}

// 备份闸门：会员放行；广告拉起失败走免费放行通道（每日限额，防审核环境判功能不可用）；
// 否则原子扣 1 点（credits ≥1 条件更新，防并发双扣）
// 放行返回 { ok: true }，无权益返回 NEED_ENTITLEMENT（前端据此引导看广告）
async function consumeBackupCredit(openid, freeFallback) {
  const ent = await _loadEnt(openid)
  if (_isMember(ent)) return ok()
  if (freeFallback) {
    if (await _grantFreeFallback(openid)) return ok({ free: true })
    return fail('NEED_ENTITLEMENT', '今日免费备份次数已用完，看一段视频即可继续')
  }
  const res = await db.collection(ENT_COL)
    .where({ openid, credits: _.gte(1) })
    .update({ data: { credits: _.inc(-1), updatedAt: Date.now() } })
  if (res.stats && res.stats.updated > 0) return ok()
  return fail('NEED_ENTITLEMENT', '看一段视频或开通会员后可备份到云端')
}

// 免费放行计数：按东八区自然日限额（与 handleUnlock 同款「跨日重置 + 条件自增」
// 原子模式，并发直调不会超限）；freeDate 字段缺失的老权益文档会被跨日重置一并补齐
async function _grantFreeFallback(openid) {
  const today = _bjDate(Date.now())
  await db.collection(ENT_COL)
    .where({ openid, freeDate: _.neq(today) })
    .update({ data: { freeDate: today, freeUsed: 0 } })
  const res = await db.collection(ENT_COL)
    .where({ openid, freeDate: today, freeUsed: _.lt(DAILY_FREE_LIMIT) })
    .update({ data: { freeUsed: _.inc(1), updatedAt: Date.now() } })
  return !!(res.stats && res.stats.updated > 0)
}

// 查询权益状态（前端按钮态与「看视频解锁」入口的展示依据）
async function handleEntitlement(openid) {
  const ent = await _loadEnt(openid)
  const today = _bjDate(Date.now())
  const dailyEarned = ent && ent.dailyDate === today ? (ent.dailyEarned | 0) : 0
  return ok({
    member: _isMember(ent),
    credits: ent ? Math.max(0, ent.credits | 0) : 0,
    dailyEarned,
    dailyLimit: DAILY_AD_LIMIT
  })
}

// 激励视频完整观看后登记：+1 备份点数，每日上限 DAILY_AD_LIMIT 防刷
// 前端只在此登记成功后才发起备份；伪造直调 put 无权益仍会被闸门拦下
async function handleUnlock(openid) {
  const today = _bjDate(Date.now())
  await _loadEnt(openid)
  // 跨日重置计数器（条件更新，天然幂等）
  await db.collection(ENT_COL)
    .where({ openid, dailyDate: _.neq(today) })
    .update({ data: { dailyDate: today, dailyEarned: 0 } })
  // 条件自增：今日已获次数 < 上限才生效，绕过上限的直调在此被拦
  const res = await db.collection(ENT_COL)
    .where({ openid, dailyDate: today, dailyEarned: _.lt(DAILY_AD_LIMIT) })
    .update({ data: { dailyEarned: _.inc(1), credits: _.inc(1), updatedAt: Date.now() } })
  if (!res.stats || res.stats.updated === 0) {
    return fail('DAILY_LIMIT', `今日看视频获得的次数已达上限（${DAILY_AD_LIMIT} 次），明天再来`)
  }
  const ent = await _loadEnt(openid)
  return ok({
    member: _isMember(ent),
    credits: ent ? Math.max(0, ent.credits | 0) : 1,
    dailyEarned: ent && ent.dailyDate === today ? (ent.dailyEarned | 0) : 1,
    dailyLimit: DAILY_AD_LIMIT
  })
}
