// 云备份工具：免费云备份（微信云开发，每人 1 份覆盖式快照）
// 职责：
//  1. 云能力可用性判断（wx.cloud 缺失 / 初始化失败时降级，本地功能零感知）
//  2. 云端快照状态展示（本地缓存 + 进页异步刷新）
//  3. 备份到云端（复用 backup.collectBackupJson 的 v3 序列化）
//  4. 从云端恢复（复用 backup.importFromText 的确认弹窗与落库流程）
// 页面层只做 UI 与流程胶水，数据与判断都收口在本文件。

const backup = require('./backup.js')
const pako = require('./pako.min.js')
const timeText = require('./timeText.js')

const FUNC_NAME = 'cloudBackup'
const STATE_KEY = 'qingba_cloud_backup_state' // 家庭级：{ updatedAt, childCount, recordCount }

function _get(key) {
  try { return wx.getStorageSync(key) } catch (e) { return '' }
}

function _set(key, value) {
  try { wx.setStorageSync(key, value) } catch (e) {}
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
function _doUpload(json, hooks) {
  // gzip 压缩 + base64：打卡记录 JSON 重复度高，压缩率 5-10 倍，
  // 云端存压缩串绕开云数据库单文档 512KB 硬限制（原文上限 2MB）
  let payloadZ = ''
  try {
    payloadZ = _u8ToBase64(pako.gzip(json))
  } catch (e) {
    console.error('云端快照压缩失败', e)
    wx.showToast({ title: '备份失败', icon: 'none' })
    if (hooks.onDone) hooks.onDone({ ok: false })
    return
  }
  console.log('[云备份] 压缩后', Math.round(payloadZ.length / 1024), 'KB（base64 口径）')

  wx.showLoading({ title: '上传中...', mask: true })
  wx.cloud.callFunction({
    name: FUNC_NAME,
    data: { action: 'put', payload_z: payloadZ },
    success: (res) => {
      wx.hideLoading()
      const r = res && res.result
      if (r && r.ok) {
        _saveStateFromPayload(json, r.updatedAt || Date.now())
        backup.markBackedUp() // 云端有快照即视为已备份，复用现有 30 天提醒口径
        wx.showToast({ title: r.deduped ? '已是最新' : '已备份到云端', icon: 'success' })
        if (hooks.onDone) hooks.onDone({ ok: true })
      } else {
        wx.showToast({ title: (r && r.message) || '备份失败', icon: 'none' })
        if (hooks.onDone) hooks.onDone({ ok: false })
      }
    },
    fail: (err) => {
      wx.hideLoading()
      console.error('云端上传失败', err)
      wx.showToast({ title: '网络异常，上传失败', icon: 'none' })
      if (hooks.onDone) hooks.onDone({ ok: false })
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
        wx.showToast({ title: (r && r.message) || '获取失败', icon: 'none' })
        if (hooks.onDone) hooks.onDone({ ok: false })
        return
      }
      if (r.empty) {
        wx.showToast({ title: '云端还没有备份', icon: 'none' })
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
          wx.showToast({ title: '云端数据异常', icon: 'none' })
          if (hooks.onDone) hooks.onDone({ ok: false })
          return
        }
      } else if (r.payload) {
        text = r.payload
      } else {
        wx.showToast({ title: '云端数据异常', icon: 'none' })
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
        if (hooks.onDone) hooks.onDone({ ok: true })
      } else {
        wx.showToast({ title: (r && r.message) || '删除失败', icon: 'none' })
        if (hooks.onDone) hooks.onDone({ ok: false })
      }
    },
    fail: (err) => {
      wx.hideLoading()
      console.error('云端删除失败', err)
      wx.showToast({ title: '网络异常，删除失败', icon: 'none' })
      if (hooks.onDone) hooks.onDone({ ok: false })
    }
  })
}

// 清本地快照状态缓存：说明卡回「数据保存在本机」态，同时断开「上次备份」
// 的云端回落链——只云备份过的用户回到「从未备份」并恢复 30 天提醒，属正确语义
function _clearState() {
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
  uploadToCloud,
  restoreFromCloud,
  deleteFromCloud
}
