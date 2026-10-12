// 云备份工具：云备份（微信云开发，每人 1 份覆盖式快照）
// 职责：
//  1. 云能力可用性判断（wx.cloud 缺失 / 初始化失败时降级，本地功能零感知）
//  2. 云端快照状态展示（本地缓存 + 进页异步刷新）
//  3. 备份到云端（复用 backup.collectBackupJson 的 v3 序列化）
//  4. 从云端恢复（复用 backup.importFromText 的确认弹窗与落库流程）
//  5. 备份权益流（商业化）：备份需会员或广告点数；put 返回 NEED_ENTITLEMENT
//     时引导看激励视频 → unlock 登记 +1 点 → 自动重试备份。恢复/删除不设墙。
//     广告拉起失败（审核环境无填充 / 广告位冷启动）时弹窗告知免费放行，put 带
//     free_fallback 标记走云函数免费通道（每日 ≤2 次限额），备份功能始终可用。
// 页面层只做 UI 与流程胶水，数据与判断都收口在本文件。

const backup = require('./backup.js')
const pako = require('./pako.min.js')
const timeText = require('./timeText.js')

const FUNC_NAME = 'cloudBackup'
const AD_UNIT_ID = 'adunit-78cec41c9a325278' // 激励视频广告位（流量主后台创建）
const STATE_KEY = 'qingba_cloud_backup_state' // 家庭级：{ updatedAt, childCount, recordCount }

function _get(key) {
  try { return wx.getStorageSync(key) } catch (e) { return '' }
}

function _set(key, value) {
  try { wx.setStorageSync(key, value) } catch (e) {}
}

// 真机上 hideLoading 紧接 showToast 会把提示吞掉（两者共用视图层），
// 延迟一帧再弹提示；loading 本身仍需立即关闭避免残留
function _toastAfterLoading(title, icon) {
  setTimeout(() => {
    wx.showToast({ title, icon: icon || 'none' })
  }, 150)
}

// ===== base64（Uint8Array ↔ string）：小程序无 btoa/atob，自实现，不依赖已停维护的 wx 转换 API =====
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function _u8ToBase64(u8) {
  let out = ''
  const len = u8.length
  for (let i = 0; i < len; i += 3) {
    const b1 = u8[i]
    const hasB2 = i + 1 < len
    const hasB3 = i + 2 < len
    const b2 = hasB2 ? u8[i + 1] : 0
    const b3 = hasB3 ? u8[i + 2] : 0
    out += B64_CHARS[b1 >> 2] +
      B64_CHARS[((b1 & 3) << 4) | (b2 >> 4)] +
      (hasB2 ? B64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : '=') +
      (hasB3 ? B64_CHARS[b3 & 63] : '=')
  }
  return out
}

function _base64ToU8(b64) {
  const clean = String(b64).replace(/\s+/g, '') // 仅去空白；padding '=' 必须保留参与对齐
  const len = clean.length
  const out = new Uint8Array(len ? Math.floor(len * 3 / 4) : 0)
  let p = 0
  for (let i = 0; i + 3 < len; i += 4) {
    const e1 = B64_CHARS.indexOf(clean[i])
    const e2 = B64_CHARS.indexOf(clean[i + 1])
    const c3 = clean[i + 2]
    const c4 = clean[i + 3]
    const e3 = c3 && c3 !== '=' ? B64_CHARS.indexOf(c3) : 0
    const e4 = c4 && c4 !== '=' ? B64_CHARS.indexOf(c4) : 0
    out[p++] = (e1 << 2) | (e2 >> 4)
    if (c3 !== '=') out[p++] = ((e2 & 15) << 4) | (e3 >> 2)
    if (c4 !== '=') out[p++] = ((e3 & 3) << 6) | e4
  }
  return out.subarray(0, p)
}

// 云能力是否可用（低版本基础库 / 非微信宿主 / 初始化失败时为 false）
function isCloudAvailable() {
  return typeof wx !== 'undefined' && !!wx.cloud && typeof wx.cloud.callFunction === 'function'
}

// 上次云端快照状态（本地缓存口径，进页经 refreshCloudState 异步刷新）
function getCachedState() {
  return _get(STATE_KEY) || null
}

// 「今天 14:11 · N孩M条」（智能格式，口径见 timeText.js）；从未云端备份返回 ''
function getStateText() {
  const s = getCachedState()
  if (!s || !s.updatedAt) return ''
  return `${timeText.formatSmart(s.updatedAt)} · ${s.childCount}孩${s.recordCount}条`
}

// 异步刷新云端状态：换手机后本地无缓存也能正确展示（静默失败，沿用缓存）
function refreshCloudState(callback) {
  if (!isCloudAvailable()) {
    if (typeof callback === 'function') callback({ ok: false })
    return
  }
  wx.cloud.callFunction({
    name: FUNC_NAME,
    data: { action: 'get' },
    success: (res) => {
      const r = res && res.result
      if (r && r.ok && !r.empty && r.meta) {
        _set(STATE_KEY, {
          updatedAt: r.meta.updatedAt,
          childCount: r.meta.childCount,
          recordCount: r.meta.recordCount
        })
      } else if (r && r.ok && r.empty) {
        // 云端已无快照（如另一台设备删除），本地过期缓存一并清掉，
        // 否则说明卡/删除弹窗会一直展示不存在的快照
        _clearState()
      }
      if (typeof callback === 'function') callback({ ok: !!r, empty: !!(r && r.empty) })
    },
    fail: () => {
      if (typeof callback === 'function') callback({ ok: false })
    }
  })
}

// 备份到云端：生成 v3 快照 → 空数据防护 → 云函数覆盖写入 → 更新缓存与「上次备份」提醒口径
function uploadToCloud(hooks) {
  hooks = hooks || {}
  if (!isCloudAvailable()) {
    wx.showToast({ title: '云服务不可用', icon: 'none' })
    if (hooks.onDone) hooks.onDone({ ok: false })
    return
  }

  let json = ''
  try {
    json = backup.collectBackupJson()
  } catch (e) {
    console.error('生成云端快照失败', e)
    wx.showToast({ title: '备份失败', icon: 'none' })
    if (hooks.onDone) hooks.onDone({ ok: false })
    return
  }
  console.log('[云备份] 快照大小（字符数口径）', Math.round(json.length / 1024), 'KB')

  // 空快照防护：本机一条打卡记录都没有时，备份只会用空数据覆盖云端唯一的有效快照
  if (_isEmptySnapshot(json)) {
    const hasCloud = !!getCachedState()
    wx.showModal({
      title: '本机没有打卡记录',
      content: hasCloud
        ? '继续备份会用空数据覆盖云端已有的快照（云端仅保留 1 份）。想找回数据请先「从云端恢复」。确定继续备份吗？'
        : '当前将备份一份不含打卡记录的空数据，确定继续吗？',
      confirmText: '继续备份',
      confirmColor: '#FA5151',
      success: (r) => {
        if (r.confirm) _doUpload(json, hooks)
        else if (hooks.onDone) hooks.onDone({ ok: false })
      }
    })
    return
  }

  _doUpload(json, hooks)
}

// 快照中是否一条打卡记录都没有（解析失败按非空处理，不做拦截）
function _isEmptySnapshot(json) {
  try {
    const d = JSON.parse(json)
    const arr = Array.isArray(d.children) ? d.children : []
    return !arr.some(c => Array.isArray(c.checkin_records) && c.checkin_records.length > 0)
  } catch (e) {
    return false
  }
}

// 压缩 + 上传 + 状态更新（首次上传与空数据二次确认后共用）
// retried：权益流重试标记，0=首次（可能触发权益流），1=解锁/免费放行后重试（不再二次引导）
// freeFallback：广告拉起失败的免费放行标记（仅作路由信号，放行与限额判定收口云函数）
function _doUpload(json, hooks, retried, freeFallback) {
  // gzip 压缩 + base64：打卡记录 JSON 重复度高，压缩率 5-10 倍，
  // 云端存压缩串绕开云数据库单文档 512KB 硬限制（原文上限 2MB）
  let payloadZ = ''
  try {
    payloadZ = _u8ToBase64(pako.gzip(json))
  } catch (e) {
    console.error('云端快照压缩失败', e)
    wx.hideLoading()
    _toastAfterLoading('备份失败')
    if (hooks.onDone) hooks.onDone({ ok: false })
    return
  }
  console.log('[云备份] 压缩后', Math.round(payloadZ.length / 1024), 'KB（base64 口径）')

  wx.showLoading({ title: '备份上传中...', mask: true })
  wx.cloud.callFunction({
    name: FUNC_NAME,
    data: freeFallback
      ? { action: 'put', payload_z: payloadZ, free_fallback: true }
      : { action: 'put', payload_z: payloadZ },
    success: (res) => {
      wx.hideLoading()
      const r = res && res.result
      if (r && r.ok) {
        _saveStateFromPayload(json, r.updatedAt || Date.now())
        // 云备份时间以 STATE_KEY 为事实源，不再写 backup.markBackedUp()：
        // getLastBackupTime 取「文件备份时间 / 云端快照时间」较大者，写本地
        // 时间戳会污染文件备份口径，且删除云端后「上次备份」无法正确回落
        _toastAfterLoading(r.deduped ? '已是最新' : '已备份到云端', 'success')
        if (hooks.onDone) hooks.onDone({ ok: true })
        return
      }
      // 无备份权益（非会员且点数为 0）：引导看激励视频，解锁后自动重试
      if (r && r.code === 'NEED_ENTITLEMENT' && !retried) {
        _offerAdUnlock(json, hooks)
        return
      }
      _toastAfterLoading((r && r.message) || '备份失败')
      if (hooks.onDone) hooks.onDone({ ok: false })
    },
    fail: (err) => {
      wx.hideLoading()
      console.error('云端上传失败', err)
      _toastAfterLoading('网络异常，上传失败')
      if (hooks.onDone) hooks.onDone({ ok: false })
    }
  })
}

// 无权益时的引导弹窗 → 拉起激励视频 → 完整观看登记成功 → 重试备份
// 注意：showModal 的 confirmText 真机最多 4 个字符（iOS 超限直接 fail），
// 文案不能超 4 字，且必须带 fail 兜底——否则弹窗失败会静默无反馈并卡住页面忙碌态
function _offerAdUnlock(json, hooks) {
  wx.showModal({
    title: '解锁云备份',
    content: '看一段短视频，即可免费备份一次。开通会员可无限制备份。',
    confirmText: '看视频',
    cancelText: '暂不',
    success: (r) => {
      if (!r.confirm) {
        if (hooks.onDone) hooks.onDone({ ok: false, cancelled: true })
        return
      }
      _runRewardedAd({
        onRewarded: () => _doUpload(json, hooks, 1),
        onBroken: () => {
          if (hooks.onDone) hooks.onDone({ ok: false })
        },
        onError: () => {
          if (hooks.onDone) hooks.onDone({ ok: false })
        },
        onUnavailable: () => _offerFreeFallback(json, hooks)
      })
    },
    fail: (err) => {
      console.error('解锁引导弹窗失败', err)
      wx.showToast({ title: '弹窗调起失败，请重试', icon: 'none' })
      if (hooks.onDone) hooks.onDone({ ok: false })
    }
  })
}

// 广告拉起失败（审核环境无填充 / 广告位冷启动）的免费兜底：告知后直接重试上传，
// put 带 free_fallback 标记；放行与每日限额（≤2 次）判定收口云函数，前端标记不可信
function _offerFreeFallback(json, hooks) {
  wx.showModal({
    title: '广告加载失败',
    content: '广告暂时无法播放，本次备份免费放行，不影响正常使用。',
    confirmText: '继续备份',
    cancelText: '暂不',
    success: (r) => {
      if (r.confirm) _doUpload(json, hooks, 1, true)
      else if (hooks.onDone) hooks.onDone({ ok: false, cancelled: true })
    },
    fail: (err) => {
      console.error('免费放行弹窗失败', err)
      wx.showToast({ title: '弹窗调起失败，请重试', icon: 'none' })
      if (hooks.onDone) hooks.onDone({ ok: false })
    }
  })
}

// 激励视频单例与观看流程：完整观看（isEnded !== false，部分机型不回该字段时
// 按官方建议视为看完，防刷由云函数每日上限兜底）→ unlock 登记 → onRewarded；
// 拉起失败（show 两次失败 / 广告组件不可用）→ onUnavailable 免费放行兜底。
// loading 全程不断：「解锁中...」→「备份上传中...」→ 结果 toast，中途不闪断；
// 因此本文件内所有 loading 生命周期路径都必须保证 hideLoading 恰好一次
let _rewardedAd = null
function _runRewardedAd(hooks) {
  if (!isCloudAvailable() || typeof wx.createRewardedVideoAd !== 'function') {
    // 低版本基础库没有广告组件，与拉起失败同待遇：走免费放行兜底，不让备份死在这
    if (hooks.onUnavailable) hooks.onUnavailable()
    else if (hooks.onError) hooks.onError()
    return
  }
  if (!_rewardedAd) {
    _rewardedAd = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID })
    _rewardedAd.onError((err) => console.error('激励视频异常', err))
  }
  const ad = _rewardedAd
  const onClose = (res) => {
    ad.offClose(onClose)
    if (res && res.isEnded === false) {
      wx.showToast({ title: '需完整观看视频才能解锁', icon: 'none' })
      if (hooks.onBroken) hooks.onBroken()
      return
    }
    wx.showLoading({ title: '解锁中...', mask: true })
    wx.cloud.callFunction({
      name: FUNC_NAME,
      data: { action: 'unlock' },
      success: (ures) => {
        const ur = ures && ures.result
        if (ur && ur.ok) {
          // 不关 loading：文案直接从「解锁中...」过渡为「备份上传中...」，
          // 与紧随的重试备份无缝衔接（避免解锁/上传两次 loading 闪断）
          wx.showLoading({ title: '备份上传中...', mask: true })
          if (hooks.onRewarded) hooks.onRewarded(ur)
        } else {
          wx.hideLoading()
          _toastAfterLoading((ur && ur.message) || '解锁失败')
          if (hooks.onBroken) hooks.onBroken()
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('解锁登记失败', err)
        _toastAfterLoading('网络异常，解锁失败')
        if (hooks.onBroken) hooks.onBroken()
      }
    })
  }
  ad.onClose(onClose)
  ad.show().catch(() => {
    // 首次 show 失败（广告未拉起）：load 后重试一次，仍失败走免费放行兜底——
    // 审核环境广告常无填充，直接报错会让「备份到云端」被判功能不可用
    ad.load().then(() => ad.show()).catch((err) => {
      console.error('激励视频拉起失败', err)
      ad.offClose(onClose)
      if (hooks.onUnavailable) hooks.onUnavailable()
      else if (hooks.onError) hooks.onError()
    })
  })
}

// 查询当前权益（会员 / 剩余点数 / 今日已看次数）：页面展示与静默兜底预留
function getEntitlement(callback) {
  if (!isCloudAvailable()) {
    if (typeof callback === 'function') callback({ ok: false })
    return
  }
  wx.cloud.callFunction({
    name: FUNC_NAME,
    data: { action: 'entitlement' },
    success: (res) => {
      const r = res && res.result
      if (typeof callback === 'function') {
        callback(r && r.ok
          ? { ok: true, member: !!r.member, credits: r.credits | 0,
              dailyEarned: r.dailyEarned | 0, dailyLimit: r.dailyLimit | 0 }
          : { ok: false })
      }
    },
    fail: () => {
      if (typeof callback === 'function') callback({ ok: false })
    }
  })
}

// 从云端恢复：拉取快照 → backup.importFromText 走「确认弹窗 + 覆盖式落库」全流程
// （云端只存 v3 多孩快照，整体恢复，不会触发 v2 选孩子弹层）
function restoreFromCloud(hooks) {
  hooks = hooks || {}
  if (!isCloudAvailable()) {
    wx.showToast({ title: '云服务不可用', icon: 'none' })
    if (hooks.onDone) hooks.onDone({ ok: false })
    return
  }

  wx.showLoading({ title: '获取云端快照...', mask: true })
  wx.cloud.callFunction({
    name: FUNC_NAME,
    data: { action: 'get' },
    success: (res) => {
      wx.hideLoading()
      const r = res && res.result
      if (!r || !r.ok) {
        _toastAfterLoading((r && r.message) || '获取失败')
        if (hooks.onDone) hooks.onDone({ ok: false })
        return
      }
      if (r.empty) {
        _toastAfterLoading('云端还没有备份')
        if (hooks.onDone) hooks.onDone({ ok: false })
        return
      }

      // 压缩快照优先解压；旧明文快照直接用（覆盖备份一次后自动升级为压缩格式）
      let text = ''
      if (r.payload_z) {
        try {
          text = pako.ungzip(_base64ToU8(r.payload_z), { to: 'string' })
        } catch (e) {
          console.error('云端快照解压失败', e)
          _toastAfterLoading('云端数据异常')
          if (hooks.onDone) hooks.onDone({ ok: false })
          return
        }
      } else if (r.payload) {
        text = r.payload
      } else {
        _toastAfterLoading('云端数据异常')
        if (hooks.onDone) hooks.onDone({ ok: false })
        return
      }

      backup.importFromText(text, 'overwrite', {
        onDone: (result) => {
          if (hooks.onDone) hooks.onDone(result)
        }
      })
    },
    fail: (err) => {
      wx.hideLoading()
      console.error('云端拉取失败', err)
      wx.showToast({ title: '网络异常，获取失败', icon: 'none' })
      if (hooks.onDone) hooks.onDone({ ok: false })
    }
  })
}

// 删除云端快照：确认弹窗 → 云函数删除 → 清本地状态缓存 → 回调
// （确认弹窗收在本文件，与空快照防护、恢复确认同层，页面只做胶水）
function deleteFromCloud(hooks) {
  hooks = hooks || {}
  if (!isCloudAvailable()) {
    wx.showToast({ title: '云服务不可用', icon: 'none' })
    if (hooks.onDone) hooks.onDone({ ok: false })
    return
  }

  const summary = getStateText()
  wx.showModal({
    title: '删除云端备份',
    content: summary
      ? `将删除云端快照（${summary}），删除后无法找回，本机数据不受影响。如需留存请先「备份到文件」。`
      : '将删除云端快照，删除后无法找回，本机数据不受影响。如需留存请先「备份到文件」。',
    confirmText: '删除',
    confirmColor: '#FA5151',
    success: (r) => {
      if (r.confirm) _doDelete(hooks)
      else if (hooks.onDone) hooks.onDone({ ok: false, cancelled: true })
    }
  })
}

function _doDelete(hooks) {
  wx.showLoading({ title: '删除中...', mask: true })
  wx.cloud.callFunction({
    name: FUNC_NAME,
    data: { action: 'delete' },
    success: (res) => {
      wx.hideLoading()
      const r = res && res.result
      if (r && r.ok) {
        _clearState()
        _toastAfterLoading('已删除', 'success')
        if (hooks.onDone) hooks.onDone({ ok: true })
      } else {
        _toastAfterLoading((r && r.message) || '删除失败')
        if (hooks.onDone) hooks.onDone({ ok: false })
      }
    },
    fail: (err) => {
      wx.hideLoading()
      console.error('云端删除失败', err)
      _toastAfterLoading('网络异常，删除失败')
      if (hooks.onDone) hooks.onDone({ ok: false })
    }
  })
}

// 清本地快照状态缓存：说明卡回「数据保存在本机」态，同时断开「上次备份」
// 的云端回落链——只云备份过的用户回到「从未备份」并恢复 30 天提醒，属正确语义。
// 存量兼容：旧版本云备份会把时间戳写入备份模块本地 key，等值时一并清掉
function _clearState() {
  try {
    const s = wx.getStorageSync(STATE_KEY)
    if (s && Number(s.updatedAt) > 0) backup.clearLastBackupIf(s.updatedAt)
  } catch (e) {}
  try { wx.removeStorageSync(STATE_KEY) } catch (e) {}
}

// 上传成功后按快照内容更新本地状态缓存（不存原文，只存概要）
function _saveStateFromPayload(json, updatedAt) {
  try {
    const data = JSON.parse(json)
    const childrenArr = Array.isArray(data.children) ? data.children : []
    _set(STATE_KEY, {
      updatedAt,
      childCount: childrenArr.length,
      recordCount: childrenArr.reduce(
        (n, c) => n + (Array.isArray(c.checkin_records) ? c.checkin_records.length : 0), 0)
    })
  } catch (e) {}
}

module.exports = {
  isCloudAvailable,
  getCachedState,
  getStateText,
  refreshCloudState,
  getEntitlement,
  uploadToCloud,
  restoreFromCloud,
  deleteFromCloud
}
