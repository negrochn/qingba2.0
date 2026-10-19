// 云函数 payNotify：虚拟支付消息推送回调（发货 / 退款 / iOS 退款问询）
// 配置入口：微信开发者工具 → 云开发 → 设置 → 其他设置 → 消息推送（推送模式选「云函数」），
// 订阅 xpay_goods_deliver_notify / xpay_refund_notify 等事件并绑定本函数。
//
// 铁律：
//  1. 正常路径一律返回 { ErrCode: 0 }；返回非 0 微信会按 2/4/8/16s 递增间隔重推（最多 15 次）
//  2. 发货幂等：按订单 status 判重，已 delivered 直接返回 0
//  3. 权益发放只信服务端推送——前端支付 success 回调可能丢失（微信异常退出）
//  4. 环境隔离：event.Env 与订单 env 不一致时不发货（防沙箱单误发正式权益）
//  5. 集合分流：回调报文不带 env_tag，按订单所在集合定位——先查正式 vp_orders，
//     未命中再查 dev 侧 vp_orders_dev（开发版测试单，沙箱支付）；权益写入跟随订单
//     来源集合（vp_orders → entitlements，vp_orders_dev → entitlements_dev）。
//     正式单全流程零变化（仅在正式集合查不到订单时多一次 dev 兜底查询）
//
// 订单状态机（vp_orders / vp_orders_dev 的 status）：pending → delivered / refunded
// 权益结构（entitlements.membership）：{ type, expireAt(null=永久), sku, pricePaid, paidAt }

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const ENT_COL = 'entitlements'
const VP_COL = 'vp_orders'
const ENT_COL_DEV = 'entitlements_dev' // dev 测试权益（与 cloudBackup cols.ent 对应）
const VP_COL_DEV = 'vp_orders_dev'     // dev 测试订单（沙箱支付，与 cloudBackup cols.vp 对应）

exports.main = async (event) => {
  const { Event } = event || {}
  try {
    console.log('[payNotify]', Event, event && event.OutTradeNo,
      'env=' + (event && event.Env), event && event.OpenId)
    // 完整报文落日志：三类 xpay 推送结构可能有差异（退款通知真机实测顶层无 OutTradeNo），
    // 排查取值问题以此为准
    console.log('[payNotify] raw', JSON.stringify(event))

    if (Event === 'xpay_goods_deliver_notify') return await onDeliver(event)
    if (Event === 'xpay_refund_notify') return await onRefund(event)
    if (Event === 'xpay_subscribe_ios_refund_query_notify') return onIosRefundQuery()
    // 投诉/订阅签约等其他事件：记录即可，均应答成功避免无意义重推
    return ok0()
  } catch (e) {
    console.error('[payNotify] 处理异常', Event, e)
    // 数据库抖动等可自愈错误：返回非 0 让微信重推
    return { ErrCode: -1, ErrMsg: (e && e.message) || 'error' }
  }
}

function ok0(extra) {
  return Object.assign({ ErrCode: 0, ErrMsg: 'success' }, extra || {})
}

// 按商户单号找订单：先正式集合，未命中兜底 dev 集合（回调报文不带 env_tag）。
// 返回订单及其来源集合（vpCol = 订单回写集合，entCol = 权益写入集合），找不到返回 null
async function _findOrder(outTradeNo) {
  let q = await db.collection(VP_COL).where({ outTradeNo }).limit(1).get()
  if (q.data.length) return { order: q.data[0], vpCol: VP_COL, entCol: ENT_COL }
  q = await db.collection(VP_COL_DEV).where({ outTradeNo }).limit(1).get()
  if (q.data.length) return { order: q.data[0], vpCol: VP_COL_DEV, entCol: ENT_COL_DEV }
  return null
}

// 发货：写 membership（会员即时生效）→ 订单置 delivered。
// 两步非原子：中间失败会因异常返回 -1 触发重推；重推落在「已发货未置态」时，
// membership 覆盖式写入（同 sku 重复写无副作用）+ 订单置态幂等更新，自愈安全
async function onDeliver(event) {
  const hit = await _findOrder(event.OutTradeNo)
  if (!hit) {
    console.error('[payNotify] 订单不存在，放弃（重推也无法补发）', event.OutTradeNo)
    return ok0()
  }
  const { order, vpCol, entCol } = hit
  if (order.status === 'delivered') return ok0()
  if ((event.Env | 0) !== (order.env | 0)) {
    console.error('[payNotify] 环境不匹配，不发货', 'event.Env=' + event.Env,
      'order.env=' + order.env, event.OutTradeNo)
    return ok0()
  }

  // 发放永久会员：expireAt: null 即永久（cloudBackup._isMember 对缺省 expireAt 判永久）
  const membership = {
    type: order.skuType || 'lifetime',
    expireAt: null,
    sku: order.productId,
    pricePaid: order.pricePaid,
    paidAt: Date.now()
  }
  const entQ = await db.collection(entCol).where({ openid: order.openid }).limit(1).get()
  if (entQ.data.length) {
    // doc().set() 整文档替换而非 update：update 会把对象拍平成 membership.xxx 点路径，
    // 存量文档 membership 为 null（_loadEnt 建档初值 / 旧版退款置空）时报
    // 「Cannot create field 'expireAt' in element {membership: null}」；set 无此问题。
    // 代价是覆盖整文档，故带上全部存量字段防丢（重推幂等，自愈安全）
    const ent = entQ.data[0]
    await db.collection(entCol).doc(ent._id).set({
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
    // 权益档不存在（从未触碰过权益流）：建档与 cloudBackup._loadEnt 同构
    await db.collection(entCol).add({
      data: {
        openid: order.openid, credits: 0, dailyDate: '', dailyEarned: 0,
        freeDate: '', freeUsed: 0, membership, updatedAt: Date.now()
      }
    })
  }

  await db.collection(vpCol).doc(order._id).update({
    data: {
      status: 'delivered', payOpenid: event.OpenId || '',
      paidAt: Date.now(), deliveredAt: Date.now()
    }
  })
  console.log('[payNotify] 已发货', event.OutTradeNo, order.productId, '->', order.openid)
  return ok0()
}

// 退款：回收会员（membership 置空，_isMember 即刻失效）→ 订单置 refunded。
// 仅当当前 membership 对应本单商品时才清，防误清后续新购的权益
async function onRefund(event) {
  // 退款通知报文与发货通知结构不同（官方字段表）：
  // 无 OutTradeNo / Env——原支付单商户单号在 MchOrderId，退款结果在 RetCode（0=成功）
  const outTradeNo = event.MchOrderId || event.OutTradeNo
  if (!outTradeNo) {
    console.error('[payNotify] 退款通知缺单号，结构异常，放弃（raw 日志可查报文）',
      JSON.stringify(event))
    return ok0()
  }
  if ((event.RetCode | 0) !== 0) {
    console.error('[payNotify] 退款未成功，不回收权益', outTradeNo,
      'RetCode=' + event.RetCode, event.RetMsg)
    return ok0()
  }
  const hit = await _findOrder(outTradeNo)
  if (!hit) {
    console.error('[payNotify] 退款订单不存在', outTradeNo)
    return ok0()
  }
  const { order, vpCol, entCol } = hit
  if (order.status === 'refunded') return ok0()

  const entQ = await db.collection(entCol).where({ openid: order.openid }).limit(1).get()
  if (entQ.data.length) {
    const ent = entQ.data[0]
    const m = ent.membership
    if (m && m.sku === order.productId) {
      // set 整文档替换（不带 membership 键 = 删字段）：与 onDeliver 的 set 化对称，
      // 避开 update 对嵌套字段/操作符的拍平兼容坑；带全部存量字段防丢（同 onDeliver）
      await db.collection(entCol).doc(ent._id).set({
        data: {
          openid: ent.openid,
          credits: ent.credits || 0,
          dailyDate: ent.dailyDate || '',
          dailyEarned: ent.dailyEarned || 0,
          freeDate: ent.freeDate || '',
          freeUsed: ent.freeUsed || 0,
          updatedAt: Date.now()
        }
      })
      console.log('[payNotify] 已回收会员', order.openid)
    }
  }
  await db.collection(vpCol).doc(order._id).update({
    data: { status: 'refunded', refundAt: Date.now() }
  })
  console.log('[payNotify] 退款处理完成', outTradeNo)
  return ok0()
}

// iOS 退款问询（Apple 最多三次问询，需 3 秒内响应）：虚拟商品已即时到账，拦截退款。
// result_code: 1=拦截拒绝退款；evidence 必填（退款审计用，不能只写「不同意」）
function onIosRefundQuery() {
  return ok0({
    IosRefundQueryResponse: {
      result_code: 1,
      result_info: '虚拟商品已到账',
      evidence: '永久会员为虚拟商品，支付成功后立即到账并持续提供云端备份服务，购买页已注明不支持退款'
    }
  })
}
