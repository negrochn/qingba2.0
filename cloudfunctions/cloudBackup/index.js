// 云函数 cloudBackup：云备份（每人 1 份覆盖式快照）+ 备份权益闸门
// action:
//   get —— 按 openid 取当前快照（压缩串 payload_z 或旧明文 payload + meta）
//   put —— 校验并覆盖写入快照（10 分钟频控防连点）；需备份权益：会员或广告点数 ≥1，
//          或广告拉起失败的免费放行（free_fallback，每日 ≤ DAILY_FREE_LIMIT 次）
//   delete —— 删除该用户全部快照文档（正常 1 份，历史重复一并清理）
//   entitlement —— 查询当前权益状态（会员 / 剩余广告点数 / 今日已看次数）
//   unlock —— 激励视频完整观看后登记，+1 备份点数（每日上限防刷）
//   createOrder —— 永久会员购买下单：SKU 价格收口云端，生成业务订单（vp_orders，
//                   pending）并返回虚拟支付签名参数（前端 wx.requestVirtualPayment
//                   拉起收银台）；发货由独立回调云函数 payNotify 完成，本函数不写权益
//   redeem —— 邀请码兑换永久会员：一次性码原子核销（unused → used，防并发双兑）+
//             写 membership（与 payNotify.onDeliver 同构）；已是永久会员拒绝且码不消耗
//
// 权益模型（商业化定案）：
//   备份设墙、恢复/删除不设墙——取回自己的数据永远免费；
//   云端数据永不过期不删除；权益判定收口云函数，前端广告回调不可信。
//   会员：虚拟支付道具直购（mode=short_series_goods）买断制早鸟价，payNotify
//   回调写 membership { type, expireAt, sku, pricePaid }，退款回调回收——
//   前端展示价仅为文案，实收价以云函数 SKU 表为准。
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
const crypto = require('crypto')
const https = require('https')

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
const REDEEM_COL = 'redeem_codes' // 邀请码（一次性：unused → used；code 存去横线大写纯码）
const DAILY_AD_LIMIT = 5 // 每日最多通过广告获得的备份次数（防刷兜底，前端无感）
const DAILY_FREE_LIMIT = 2 // 每日广告拉起失败的免费放行上限（审核安全兜底：广告无填充时备份仍可用）

// ===== 虚拟支付（永久会员买断，道具直购 mode=short_series_goods）=====
// 签名口径（官方「签名详解」）：paySig = HMAC-SHA256(appKey, 'requestVirtualPayment&' + signData)，
// signature = HMAC-SHA256(sessionKey, signData)，均输出 hex。env=0 现网 / 1 沙箱，
// appKey 必须与 env 对应环境匹配，错配直接签名失败；iOS（Apple 支付）仅支持现网 env=0。
const VP_COL = 'vp_orders'
const PAY_OFFER_ID = '1450675891'
const PAY_ENV = 1 // 1=沙箱（开发联调用），切正式：改 0 + 填 PAY_APP_KEY_PROD + 后台道具「发布至现网版本」
const PAY_APP_KEY_SANDBOX = 'oW9kZ51eW4KQqG0m63e5e2wunXp6ml0Q'
const PAY_APP_KEY_PROD = '58iiBQ5nkDuXDjUdTwXh8Ah7o7Ozox7M'
// SKU 表（道具 ID 必须与后台道具管理一致；改价只动这里，前端价格文案记得同步）
const PAY_SKUS = {
  member_lifetime: { title: '永久会员', price: 990, type: 'lifetime' } // price 单位：分（990 = ¥9.9 早鸟价）
}

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
    if (action === 'createOrder') return await handleCreateOrder(OPENID, event)
    if (action === 'redeem') return await handleRedeem(OPENID, event)
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

// ===== 支付层：永久会员买断（虚拟支付道具直购，发货收口 payNotify 回调） =====

function _hmacHex(key, msg) {
  return crypto.createHmac('sha256', key).update(msg, 'utf8').digest('hex')
}

function _payAppKey() {
  const key = PAY_ENV === 1 ? PAY_APP_KEY_SANDBOX : PAY_APP_KEY_PROD
  if (!key) throw new Error('PAY_APP_KEY 未配置（env=' + PAY_ENV + '）')
  return key
}

// 会员购买下单：wx.login code → jscode2session 换 sessionKey（用户态签名密钥），
// 价格/商品收口云端 SKU 表（前端传价不可信），订单先落 vp_orders（pending）。
// 返回的签名参数前端必须原样透传 wx.requestVirtualPayment（signData 字符串不再
// 二次序列化，保证与签名一致）。发货在 payNotify 回调完成，本函数不写任何权益——
// 前端 success 回调可能因微信异常退出丢失，权益发放只信服务端推送/对账。

// ===== 登录态换取：auth.code2Session 不在云调用开放接口列表（调用报 errCode 604100），
// 改为云函数直连官方 jscode2session HTTPS 接口，需 AppSecret =====
const WX_APP_SECRET = '64e9b76da3d564eb7f53bbb3596a16c8'

function _code2Session(loginCode) {
  const appid = (cloud.getWXContext() && cloud.getWXContext().APPID) || ''
  if (!WX_APP_SECRET) return Promise.reject(new Error('WX_APP_SECRET 未配置'))
  if (!appid) return Promise.reject(new Error('APPID 获取失败'))
  const url = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + appid
    + '&secret=' + WX_APP_SECRET + '&js_code=' + loginCode
    + '&grant_type=authorization_code'
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let buf = ''
      res.on('data', (c) => { buf += c })
      res.on('end', () => {
        try { resolve(JSON.parse(buf)) }
        catch (e) { reject(new Error('响应解析失败: ' + buf.slice(0, 80))) }
      })
    })
    req.on('error', reject)
    req.setTimeout(8000, () => { req.destroy(new Error('jscode2session 请求超时')) })
  })
}

async function handleCreateOrder(openid, event) {
  const skuId = event && event.product_id
  const sku = PAY_SKUS[skuId]
  if (!sku) return fail('BAD_SKU', '商品不存在')
  const loginCode = event && event.login_code
  if (!loginCode) return fail('NO_LOGIN_CODE', '登录态缺失，请重试')

  // wx.login 的 code 一次性：用过/过期直接报错，前端每次购买前现取即可
  let sessionKey = ''
  try {
    const sess = await _code2Session(loginCode)
    if (sess && sess.errcode) {
      // 常见：40029 code无效 / 40163 code已用 / 40013 appid不匹配 / 40125 secret错误
      return fail('LOGIN_EXPIRED', '登录态获取失败[errCode:' + sess.errcode + ']')
    }
    sessionKey = (sess && sess.session_key) || ''
    // code 换出的 openid 与调用方不一致 = code 与账号错配，拒绝（防御串号）
    if (sess && sess.openid && sess.openid !== openid) {
      return fail('LOGIN_EXPIRED', '登录态校验失败[openid不匹配]')
    }
  } catch (e) {
    console.error('code2Session 失败', e)
    return fail('LOGIN_EXPIRED', '登录态获取失败[' + String((e && e.message) || e || '未知错误').slice(0, 60) + ']')
  }
  if (!sessionKey) return fail('LOGIN_EXPIRED', '登录态获取失败[session_key为空]')

  // 业务订单号：8-32 位字母数字（微信要求），VP + 时间戳36进制 + 4 位随机
  const outTradeNo = ('VP' + Date.now().toString(36)
    + Math.random().toString(36).slice(2, 6)).toUpperCase()
  const now = Date.now()
  await db.collection(VP_COL).add({
    data: {
      openid, outTradeNo, productId: skuId, skuType: sku.type, title: sku.title,
      pricePaid: sku.price, env: PAY_ENV, status: 'pending', createdAt: now
    }
  })

  // signData 字段顺序即 JSON 序列化顺序：构造后不再改动
  const signData = JSON.stringify({
    buyQuantity: 1,
    env: PAY_ENV,
    offerId: PAY_OFFER_ID,
    currencyType: 'CNY',
    productId: skuId,
    goodsPrice: sku.price,
    outTradeNo,
    attach: skuId
  })
  return ok({
    signData,
    paySig: _hmacHex(_payAppKey(), 'requestVirtualPayment&' + signData),
    signature: _hmacHex(sessionKey, signData),
    mode: 'short_series_goods',
    outTradeNo,
    title: sku.title,
    price: sku.price
  })
}

// ===== 邀请码兑换：送码开通永久会员（不经支付链路，发放收口服务端） =====

// 规整用户输入为纯码口径：去空格/横线、转大写（生成脚本与库内 code 均为纯码）
function _normalizeCode(raw) {
  return String(raw || '').toUpperCase().replace(/[\s-]/g, '')
}

// 兑换永久会员：码一次性，unused → used 原子核销（where 条件更新，并发双兑天然被挡）；
// 已是永久会员则拒绝且不消耗码（可转赠）。发放结构与 payNotify.onDeliver 同构
// （sku: redeem_lifetime 标记兑换来源，pricePaid 0），写入用 doc().set() 整文档替换
// ——存量 membership 为 null 时嵌套 update 会报「Cannot create field」，set 无此问题。
// 核销成功但权益写入失败时回滚核销（条件更新只回滚本人刚核销的单），码回到可用态。
async function handleRedeem(openid, event) {
  const code = _normalizeCode(event && event.code)
  if (code.length < 8 || code.length > 32) {
    return fail('BAD_CODE', '请输入正确的邀请码')
  }

  const ent = await _loadEnt(openid)
  const m = ent && ent.membership
  if (m && m.type === 'lifetime' && (!m.expireAt || m.expireAt > Date.now())) {
    return fail('ALREADY_LIFETIME', '你已是永久会员，无需兑换。邀请码未消耗，可转赠他人')
  }

  const now = Date.now()
  const burn = await db.collection(REDEEM_COL)
    .where({ code, status: 'unused' })
    .update({ data: { status: 'used', usedBy: openid, usedAt: now } })
  if (!burn.stats || burn.stats.updated === 0) {
    return fail('BAD_CODE', '邀请码无效或已被使用')
  }

  const membership = {
    type: 'lifetime',
    expireAt: null,
    sku: 'redeem_lifetime',
    pricePaid: 0,
    paidAt: now,
    source: 'redeem',
    code
  }
  try {
    if (ent && ent._id) {
      await db.collection(ENT_COL).doc(ent._id).set({
        data: {
          openid: ent.openid,
          credits: ent.credits || 0,
          dailyDate: ent.dailyDate || '',
          dailyEarned: ent.dailyEarned || 0,
          freeDate: ent.freeDate || '',
          freeUsed: ent.freeUsed || 0,
          membership,
          updatedAt: Date.now()
        }
      })
    } else {
      // 权益档不存在（_loadEnt 建档失败的极端情况）：与 _loadEnt 建档结构同构
      await db.collection(ENT_COL).add({
        data: {
          openid, credits: 0, dailyDate: '', dailyEarned: 0,
          freeDate: '', freeUsed: 0, membership, updatedAt: Date.now()
        }
      })
    }
  } catch (e) {
    console.error('redeem 写权益失败，回滚核销', code, e)
    await db.collection(REDEEM_COL)
      .where({ code, status: 'used', usedBy: openid })
      .update({ data: { status: 'unused', usedBy: _.remove(), usedAt: _.remove() } })
    throw e
  }
  console.log('redeem 已开通', code, '->', openid)
  return ok({ member: true })
}
