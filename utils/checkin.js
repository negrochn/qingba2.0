// 打卡存储工具
// 存储结构: qingba_checkins = Record<dayStr(YYYY-MM-DD), Checkin[]>
// Checkin: { id, stageId, stageName, groupKey, groupLabel, resourceId, resourceName, durationMinutes, factor?, timestamp }
// 说明：resourceId 为资源唯一 id（官方 o_ 前缀 / 自定义 u_ 前缀）；
//      老记录可能缺少 resourceId，此时按「阶段+分组+名称」回退匹配；
//      factor 为时长折算系数（熏听分组按阶段取 0 / 0.5 / 0.8），缺省视为 1，故只在 ≠1 时写入

const { ROUTES, listeningFactor } = require('./data.js')
const { getActiveChildId, getPrimaryChildId } = require('./children.js')

const STORAGE_KEY = 'qingba_checkins'
const CHUNK_PREFIX = 'qingba_checkins_' // 按月分片: qingba_checkins_<childId>_2021-06
// 分片写入的临时 key 子前缀：先把全部分片写到临时 key，全部成功后再逐个改名为正式 key，
// 保证任何一步失败都不会破坏已存在的分片（见 saveAll）
const TMP_CHUNK_SUB = 'tmp_'
const DEFAULT_REMARK_KEY = 'qingba_default_remarks'
const READ_COUNT_KEY = 'qingba_read_counts'
const CURRENT_STAGE_KEY = 'qingba_current_stage'
const CURRENT_ROUTE_KEY = 'qingba_current_route'   // 当前路线 id：'regular' | 'bigloop'
const YOUQU_PLAN_KEY = 'qingba_youqu_plan'
const LISTENING_ENABLED_KEY = 'qingba_listening_enabled'   // 熏听分组开关（控制分组显示与录入）
const STAGE_DONE_KEY = 'qingba_stage_done'   // 已完成阶段 id 列表
const TARGET_MODE_KEY = 'qingba_target_mode'       // 阶段目标档位：'lower' | 'upper'（默认 upper）
const TARGET_CUSTOM_KEY = 'qingba_target_custom'   // 逐阶段自定义目标：{ [stageId]: hours }

// ===== 多孩：per-child 键构造 =====
// 会话级数据键在尾部叠加当前孩子 id 段（qingba_xxx_<childId>），
// 切换孩子后各页面 onShow 重读 per-child 键即为新孩子视图，页面层零改动。
// 例外：默认备注、熏听开关为家庭级设置，保持全局共享。

function _childSeg() {
  const id = getActiveChildId()
  return id ? '_' + id : ''
}

// 是否主孩子（children[0]）：legacy 单孩数据的兜底迁移仅对主孩子生效，
// 否则「升级首启后立刻添加孩子 #2 并切换」会把旧键数据兜底读到 #2 名下（§3.3）
function _isPrimaryChild() {
  const pid = getPrimaryChildId()
  return !!pid && pid === getActiveChildId()
}

// 通用 per-child 读：新键优先；主孩子且新键无值时兜底读 legacy 键，读到即迁移并删除
// 注意「无值」判定：wx.getStorageSync 对不存在的键返回 ''；false / 0 / {} 都是合法值
function _pcGet(baseKey, extraSeg, defaultValue) {
  const extra = extraSeg || ''
  const key = baseKey + _childSeg() + extra
  try {
    const v = wx.getStorageSync(key)
    if (v !== '' && v !== null && v !== undefined) return v
    if (_isPrimaryChild()) {
      const legacy = wx.getStorageSync(baseKey + extra)
      if (legacy !== '' && legacy !== null && legacy !== undefined) {
        try { wx.setStorageSync(key, legacy) } catch (e2) {}
        try { wx.removeStorageSync(baseKey + extra) } catch (e3) {}
        return legacy
      }
    }
  } catch (e) {}
  return defaultValue
}

function _pcSet(baseKey, extraSeg, value) {
  try {
    wx.setStorageSync(baseKey + _childSeg() + (extraSeg || ''), value)
    return true
  } catch (e) {
    return false
  }
}

function _pcRemove(baseKey, extraSeg) {
  try {
    wx.removeStorageSync(baseKey + _childSeg() + (extraSeg || ''))
    return true
  } catch (e) {
    return false
  }
}

// 单条 storage 上限（字节），留余量
const MAX_ITEM_BYTES = 900 * 1024 // 约 900KB，微信上限 1MB

// 存储总量预警阈值（占总上限 10MB 的比例）
const STORAGE_WARN_RATIO = 0.8
// 会话级开关：避免重复弹窗
let _storageWarned = false
let _saveFailedWarned = false

// 检查本地存储总量，超过阈值则弹一次提醒
function _checkStorageQuota() {
  try {
    const info = wx.getStorageInfoSync()
    const limit = info.limitSize || 10240 // KB，微信上限 10MB
    const current = info.currentSize || 0
    if (current >= limit * STORAGE_WARN_RATIO && !_storageWarned) {
      _storageWarned = true
      wx.showModal({
        title: '本地存储空间提醒',
        content: `打卡数据已占用约 ${(current / 1024).toFixed(1)}MB / 10MB。建议前往"设置"页导出备份，避免后续数据因超限而丢失。`,
        showCancel: false,
        confirmText: '知道了'
      })
    }
  } catch (e) {}
}

// 实际保存失败时弹一次提醒（空间已满）
function _onSaveFail() {
  if (_saveFailedWarned) return
  _saveFailedWarned = true
  wx.showModal({
    title: '保存失败',
    content: '本地存储空间已满，部分打卡数据可能未能保存。请到"设置"页导出备份后清理旧数据。',
    showCancel: false,
    confirmText: '知道了'
  })
}

function todayStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 校验并归一化 day 字符串（YYYY-MM-DD），非法返回 ''
function normalizeDay(day) {
  const s = String(day || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return ''
  const parts = s.split('-').map(Number)
  const d = new Date(parts[0], parts[1] - 1, parts[2])
  const ok = d.getFullYear() === parts[0] && d.getMonth() === parts[1] - 1 && d.getDate() === parts[2]
  return ok ? s : ''
}

// 由日期字符串构造时间戳（该日 12:00），供补录记录排序与展示使用
// 显式用年月日构造，避免 iOS 对 "YYYY-MM-DD" 字符串解析不一致
function dayToTimestamp(day) {
  const parts = String(day).split('-').map(Number)
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0).getTime()
}

function genId() {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function _dayToMonth(dayStr) {
  return dayStr.substring(0, 7) // "2021-06-01" -> "2021-06"
}

// 打卡数据主 key（per-child）：qingba_checkins_<childId>
function _mainKey() {
  return STORAGE_KEY + _childSeg()
}

// 当前孩子的分片 key 前缀：qingba_checkins_<childId>_
// ⚠️ 分片遍历/清理必须用它而非 CHUNK_PREFIX，否则会跨孩子误读误删（串数据）
function _chunkPrefix() {
  return CHUNK_PREFIX + getActiveChildId() + '_'
}

function _chunkKey(ym) {
  return _chunkPrefix() + ym
}

// 临时分片 key（写入中间态）
function _tmpChunkKey(ym) {
  return _chunkPrefix() + TMP_CHUNK_SUB + ym
}

// 清理当前孩子的所有分片 key（月度分片 + 极端单日分片），用于存储模式切换/重写时清理旧数据
// 否则 getAll 合并时旧分片会覆盖主 key，导致已删除/已修改的记录"复活"
function _removeChunkKeys() {
  try {
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach(k => {
      if (k.startsWith(_chunkPrefix())) {
        try { wx.removeStorageSync(k) } catch (e) {}
      }
    })
  } catch (e) {}
}

// 估算 JSON 序列化后的字节数（UTF-8）
function _estimateBytes(obj) {
  try {
    const str = JSON.stringify(obj)
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str).length
    }
    // Fallback: 手动计算 UTF-8 字节数
    let bytes = 0
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i)
      if (code < 0x80) {
        bytes += 1
      } else if (code < 0x800) {
        bytes += 2
      } else if (code >= 0xD800 && code <= 0xDBFF) {
        // 高位代理：与其后的低位代理合成 1 个码点，UTF-8 占 4 字节（emoji 等）
        // 备注里允许 emoji，漏算会让分片限额判断偏乐观
        bytes += 4
        i++   // 跳过低位代理
      } else {
        bytes += 3
      }
    }
    return bytes
  } catch(e) {
    try { return JSON.stringify(obj).length } catch(e2) { return 0 }
  }
}

// 估算数据条目数（用于判断是否需要分片）
function _estimateItemCount(data) {
  let count = 0
  for (const day in data) {
    if (Array.isArray(data[day])) count += data[day].length
    else count++
  }
  return count
}

// ===== 分片读写 =====

// 列出所有分片 key
// getStorageInfoSync 不可用时，按月份范围探测，避免分片态数据"凭空消失"
function _listChunkKeys() {
  try {
    const info = wx.getStorageInfoSync()
    if (info && Array.isArray(info.keys)) {
      // 只匹配当前孩子的分片前缀；排除临时分片：它是写入中间态，若参与合并会读到"半成品"数据
      const prefix = _chunkPrefix()
      return info.keys.filter(k => {
        const s = String(k)
        return s.startsWith(prefix) && !s.startsWith(prefix + TMP_CHUNK_SUB)
      })
    }
  } catch (e) {
    console.error('getStorageInfoSync failed:', e)
  }

  // 回退：按月份回溯探测（10 年）
  const found = []
  const now = new Date()
  for (let i = 0; i < 120; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    try {
      const v = wx.getStorageSync(_chunkKey(ym))
      if (v && typeof v === 'object') found.push(_chunkKey(ym))
    } catch (e) {}
  }
  return found
}

// 是否处于分片存储模式
function _isChunkMode() {
  return _listChunkKeys().length > 0
}

// 旧单孩打卡数据 → 主孩子槽位（主键 + 分片，含极端单日分片），一次性迁移
// 幂等（迁移完旧键即删）；会话级标记保证仅首个读路径真正执行，也避免「清空后复活」
let _legacyCheckinsDone = false
function _migrateLegacyCheckins() {
  if (_legacyCheckinsDone) return
  _legacyCheckinsDone = true
  if (!_isPrimaryChild()) return
  try {
    // 1) 旧主键 → 孩子主键（同日以孩子槽位已有数据优先，正常时序下不会共存）
    const legacyMain = wx.getStorageSync(STORAGE_KEY)
    if (legacyMain && typeof legacyMain === 'object') {
      const cur = wx.getStorageSync(_mainKey())
      const merged = (cur && typeof cur === 'object') ? { ...cur } : {}
      for (const day in legacyMain) {
        if (merged[day] === undefined) merged[day] = legacyMain[day]
      }
      try { wx.setStorageSync(_mainKey(), merged) } catch (e2) {}
      try { wx.removeStorageSync(STORAGE_KEY) } catch (e3) {}
    }

    // 2) 旧分片改名为孩子分片；旧 tmp 中间态直接清理
    //    旧分片后缀为 YYYY-MM 或 YYYY-MM_DD（childId 以 ch_ 开头，不会误匹配）
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach(k => {
      const s = String(k)
      if (!s.startsWith(CHUNK_PREFIX)) return
      const rest = s.slice(CHUNK_PREFIX.length)
      if (rest.startsWith(TMP_CHUNK_SUB)) {
        try { wx.removeStorageSync(s) } catch (e2) {}
        return
      }
      if (/^\d{4}-\d{2}(_\d{2})?$/.test(rest)) {
        const v = wx.getStorageSync(s)
        if (v && typeof v === 'object') {
          try { wx.setStorageSync(_chunkPrefix() + rest, v) } catch (e2) {}
        }
        try { wx.removeStorageSync(s) } catch (e3) {}
      }
    })
  } catch (e) {
    console.error('_migrateLegacyCheckins failed:', e)
  }
}

function getAll() {
  try {
    // 主孩子兜底迁移（正常路径在 onLaunch migrateLegacyData 已完成，此处为容灾双保险）
    if (_isPrimaryChild()) _migrateLegacyCheckins()
    const main = wx.getStorageSync(_mainKey()) || {}
    const chunkKeys = _listChunkKeys()

    // 无分片：直接返回主 key（空对象即表示确实没有数据）
    if (chunkKeys.length === 0) return main

    // 合并主 key + 所有分片
    const merged = { ...main }
    chunkKeys.forEach(k => {
      try {
        const chunk = wx.getStorageSync(k)
        if (chunk && typeof chunk === 'object') {
          for (const day in chunk) {
            if (Array.isArray(chunk[day]) && chunk[day].length > 0) {
              merged[day] = chunk[day]
            }
          }
        }
      } catch(e) {}
    })
    return merged
  } catch (e) {
    console.error('getAll failed:', e)
    return {}
  }
}

// 保存全部数据
// 分片模式采用「两阶段写」：先把所有分片写到临时 key，全部成功后再逐个改名为正式 key。
// 任何一步失败都只涉及临时 key，已存在的分片内容始终保持完整（不会被"回滚"删掉）
// @returns {boolean} 是否保存成功
function saveAll(data) {
  try {
    // 保存前检查总量，超阈值弹一次提醒
    _checkStorageQuota()

    const bytes = _estimateBytes(data)
    const itemCount = _estimateItemCount(data)

    // 数据量小且条目少：直接存主 key（兼容旧版）
    if (bytes <= MAX_ITEM_BYTES && itemCount < 500) {
      let ok = true
      try {
        wx.setStorageSync(_mainKey(), data)
      } catch (e) {
        ok = false
        _onSaveFail()
      }
      // 只有写入成功才删除旧分片（写入失败时旧分片仍在，可兜底）
      if (ok) _removeChunkKeys()
      return ok
    }

    // 数据量大：按月分片存储
    const months = {}
    for (const day in data) {
      const ym = _dayToMonth(day)
      if (!months[ym]) months[ym] = {}
      months[ym][day] = data[day]
    }

    const oldKeys = _listChunkKeys()
    const pending = []   // [{ tmp, key, data }] 待改名的分片，data 暂存内存避免二次读取
    const written = []   // 本次已写入的临时 key，失败时按此回滚

    // 1) 先全部写入临时 key —— 旧分片全程未被触碰，失败也不会丢数据
    for (const ym in months) {
      const chunkData = months[ym]
      const chunkBytes = _estimateBytes(chunkData)
      const chunkItems = _estimateItemCount(chunkData)
      try {
        if (chunkBytes <= MAX_ITEM_BYTES && chunkItems < 500) {
          const tmp = _tmpChunkKey(ym)
          wx.setStorageSync(tmp, chunkData)
          written.push(tmp)
          pending.push({ tmp, key: _chunkKey(ym), data: chunkData })
        } else {
          // 极端情况：某月数据量极大，按天逐条存
          for (const day in chunkData) {
            const suffix = ym + '_' + day.substring(8)
            const tmp = _tmpChunkKey(suffix)
            const piece = { [day]: chunkData[day] }
            wx.setStorageSync(tmp, piece)
            written.push(tmp)
            pending.push({ tmp, key: _chunkKey(suffix), data: piece })
          }
        }
      } catch (e) {
        // 回滚：只删本次写入的临时 key（旧分片原样保留）
        written.forEach(k => {
          try { wx.removeStorageSync(k) } catch (e2) {}
        })
        _onSaveFail()
        return false
      }
    }

    // 2) 临时分片全部就绪，逐个「改名」为正式 key（此阶段才会覆盖旧分片）
    const newKeys = []
    for (const p of pending) {
      try {
        wx.setStorageSync(p.key, p.data)
        try { wx.removeStorageSync(p.tmp) } catch (e) {}
        newKeys.push(p.key)
      } catch (e) {
        // 改名中途失败：已改名的分片是完整新数据、未改名的仍是完整旧数据，
        // 剩余新数据留在临时 key（不删，下次保存覆盖），主 key 也还没删 —— 不会丢数据
        _onSaveFail()
        return false
      }
    }

    // 3) 全部改名成功后，再清理主 key 与不再使用的旧分片
    try { wx.removeStorageSync(_mainKey()) } catch(e) {}
    oldKeys.forEach(k => {
      if (newKeys.indexOf(k) < 0) {
        try { wx.removeStorageSync(k) } catch (e) {}
      }
    })

    return true
  } catch (e) {
    console.error('saveAll failed:', e)
    return false
  }
}

// 新增打卡记录
// opts: { day?, stageId, stageName, groupKey, groupLabel, resourceId, resourceName, durationMinutes, remark, backfilled? }
// day 缺省为今天；传入历史日期（YYYY-MM-DD）即为补录：timestamp 定在该日 12:00 并打 backfilled 标记
// @returns {Object|null} 成功返回记录，保存失败返回 null
function addCheckin(opts) {
  const o = opts || {}
  const day = normalizeDay(o.day) || todayStr()
  const backfilled = !!o.backfilled || day !== todayStr()
  const record = {
    id: genId(),
    day,
    stageId: o.stageId || '',
    stageName: o.stageName || '',
    groupKey: o.groupKey || '',
    groupLabel: o.groupLabel || '',
    resourceId: o.resourceId || '',
    resourceName: o.resourceName || '',
    durationMinutes: Number(o.durationMinutes) || 0,
    remark: o.remark || '',
    timestamp: backfilled ? dayToTimestamp(day) : Date.now()
  }
  if (backfilled) record.backfilled = true

  // 熏听分组按阶段固化折算系数（其余分组恒为 1，不落字段，与老记录形态一致）
  const factor = listeningFactor(record.stageId, record.groupKey)
  if (factor !== 1) record.factor = factor

  // 快路径：分片模式下只读写该日所在月份的分片，避免全量 I/O
  if (_isChunkMode()) {
    try {
      const key = _chunkKey(_dayToMonth(day))
      const chunk = wx.getStorageSync(key)
      if (chunk && typeof chunk === 'object') {
        const list = Array.isArray(chunk[day]) ? chunk[day].slice() : []
        list.push(record)
        chunk[day] = list
        // 该分片未超限才走快路径，否则回退全量以重新分片
        if (_estimateBytes(chunk) <= MAX_ITEM_BYTES && _estimateItemCount(chunk) < 500) {
          wx.setStorageSync(key, chunk)
          return record
        }
      }
    } catch (e) {
      console.error('addCheckin fast path failed:', e)
    }
  }

  // 慢路径：全量读写
  const all = getAll()
  const list = all[day] || []
  list.push(record)
  all[day] = list
  return saveAll(all) ? record : null
}

/**
 * 批量新增「同一天」的多条打卡记录（一次读 / 一次写）
 * 补录页一天填多行时用它落盘：比循环调 addCheckin 少 N-1 轮全量 I/O，
 * 且要么全部写入、要么全不写，不会出现「只写进去一半」的脏数据。
 * @param {string} day 'YYYY-MM-DD'（非法返回 null）
 * @param {Array} records [{ stageId, stageName, groupKey, groupLabel, resourceId, resourceName, durationMinutes }]
 * @returns {{ ok: boolean, count: number, minutes: number, day: string }|null}
 */
function addCheckinsOnDay(day, records) {
  const d = normalizeDay(day)
  if (!d) return null
  const list = Array.isArray(records) ? records : []
  if (!list.length) return null

  const backfilled = d !== todayStr()

  try {
    // 一次全量读
    const all = getAll()
    const dayList = Array.isArray(all[d]) ? all[d] : []
    let count = 0
    let minutes = 0

    // 字段口径与 addCheckin 完全一致（含 backfilled / timestamp 规则）
    list.forEach(o => {
      if (!o) return
      const record = {
        id: genId(),
        day: d,
        stageId: o.stageId || '',
        stageName: o.stageName || '',
        groupKey: o.groupKey || '',
        groupLabel: o.groupLabel || '',
        resourceId: o.resourceId || '',
        resourceName: o.resourceName || '',
        durationMinutes: Number(o.durationMinutes) || 0,
        remark: o.remark || '',
        timestamp: backfilled ? dayToTimestamp(d) : Date.now()
      }
      if (backfilled) record.backfilled = true

      // 折算系数口径与 addCheckin 一致（熏听分组才落 factor）
      const factor = listeningFactor(record.stageId, record.groupKey)
      if (factor !== 1) record.factor = factor

      dayList.push(record)
      count++
      minutes += record.durationMinutes
    })

    if (!count) return null

    all[d] = dayList

    // 一次全量写（跨月 / 分片由 saveAll 自动重组）
    if (!saveAll(all)) return null

    return { ok: true, count, minutes, day: d }
  } catch (e) {
    console.error('addCheckinsOnDay failed:', e)
    return null
  }
}

// 默认备注存储: { "stageId|groupKey|resourceId": remark }
// （迁移前遗留的 name key 由 migrateResourceKeysToId() / migrateResourceRecords() 处理）
function _getDefaultRemarks() {
  try {
    return wx.getStorageSync(DEFAULT_REMARK_KEY) || {}
  } catch (e) {
    return {}
  }
}

function _saveDefaultRemarks(data) {
  try {
    wx.setStorageSync(DEFAULT_REMARK_KEY, data)
  } catch (e) {}
}

function _remarkKey(stageId, groupKey, resourceId) {
  return `${stageId}|${groupKey}|${resourceId}`
}

// 获取某资源的默认备注
function getDefaultRemark(stageId, groupKey, resourceId) {
  const all = _getDefaultRemarks()
  return all[_remarkKey(stageId, groupKey, resourceId)] || ''
}

// 保存某资源的默认备注
function saveDefaultRemark(stageId, groupKey, resourceId, remark) {
  const all = _getDefaultRemarks()
  const key = _remarkKey(stageId, groupKey, resourceId)
  const text = String(remark || '').trim()
  if (text) {
    all[key] = text
  } else {
    delete all[key]
  }
  _saveDefaultRemarks(all)
}

// ===== 小小优趣成长计划开关（feature flag） =====
// 默认开启；用户可在设置页显式关闭，关闭后按存储的布尔值判断
function isYouquPlanEnabled() {
  // 从未设置过（非布尔值）时默认开启；显式设置过则返回其布尔值（per-child）
  const v = _pcGet(YOUQU_PLAN_KEY, '', undefined)
  return typeof v === 'boolean' ? v : true
}

function setYouquPlanEnabled(enabled) {
  if (!_pcSet(YOUQU_PLAN_KEY, '', !!enabled)) {
    console.error('setYouquPlanEnabled failed')
    return false
  }
  return true
}

// ===== 熏听开关（feature flag） =====
// 语义：开 = 阶段页显示「熏听」分组并可打卡；关 = 该分组隐藏
// （已挂在熏听分组下的自定义资源不删除，重新开启即恢复）
// 只影响「显示与录入」，不改历史统计口径：记录里的 factor 已固化，统计照常按它折算
// 默认关闭（官方数据里熏听分组没有任何素材，默认开着也只是个空分组）
function isListeningEnabled() {
  try {
    const v = wx.getStorageSync(LISTENING_ENABLED_KEY)
    return typeof v === 'boolean' ? v : false
  } catch (e) {
    return false
  }
}

function setListeningEnabled(enabled) {
  try {
    wx.setStorageSync(LISTENING_ENABLED_KEY, !!enabled)
    return true
  } catch (e) {
    console.error('setListeningEnabled failed:', e)
    return false
  }
}

// ===== 阶段目标时长口径（默认档位 + 逐阶段自定义） =====
// 语义见 utils/data.js 的 getRequiredHours：
//   生效目标 = custom[stageId] ?? (mode === 'lower' ? 官方区间下限 : 官方区间上限)
// 默认档位取「上限」—— 与 about 页「每阶段时间投入需按 80H 来算」的建议一致。
// ⚠️ 覆盖值是绝对值，不与档位联动：调档位不会改变已自定义阶段的目标。
const TARGET_MODES = ['lower', 'upper']

function getTargetMode() {
  // 从未设置过 / 脏数据时默认上限（per-child）
  const v = _pcGet(TARGET_MODE_KEY, '', '')
  return TARGET_MODES.indexOf(v) >= 0 ? v : 'upper'
}

function setTargetMode(mode) {
  if (TARGET_MODES.indexOf(mode) < 0) {
    console.error('setTargetMode: invalid mode', mode)
    return false
  }
  if (!_pcSet(TARGET_MODE_KEY, '', mode)) {
    console.error('setTargetMode failed')
    return false
  }
  return true
}

// 读取逐阶段自定义目标（逐项过滤：只保留正数，脏数据静默丢弃，不让它污染进度计算）
function getCustomTargets() {
  const raw = _pcGet(TARGET_CUSTOM_KEY, '', null)
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const id in raw) {
    const h = Number(raw[id])
    if (id && isFinite(h) && h > 0) out[id] = h
  }
  return out
}

function getCustomTarget(stageId) {
  return getCustomTargets()[stageId]
}

// 设置某阶段的自定义目标；hours 非法（非正数 / 非数字）时等同于「恢复默认」
function setCustomTarget(stageId, hours) {
  if (!stageId) return false
  const all = getCustomTargets()
  const h = Number(hours)
  if (isFinite(h) && h > 0) {
    all[stageId] = h
  } else {
    delete all[stageId]
  }
  if (!_pcSet(TARGET_CUSTOM_KEY, '', all)) {
    console.error('setCustomTarget failed')
    return false
  }
  return true
}

function clearCustomTarget(stageId) {
  return setCustomTarget(stageId, 0)
}

// 整体替换逐阶段自定义目标（导入备份用），非法项丢弃
function replaceCustomTargets(obj) {
  const clean = {}
  if (obj && typeof obj === 'object') {
    for (const id in obj) {
      const h = Number(obj[id])
      if (id && isFinite(h) && h > 0) clean[id] = h
    }
  }
  if (!_pcSet(TARGET_CUSTOM_KEY, '', clean)) {
    console.error('replaceCustomTargets failed')
    return false
  }
  return true
}

// 供 getRequiredHours(stage, opt) 直接透传：{ mode, custom }
function getTargetOption(stageId) {
  return { mode: getTargetMode(), custom: getCustomTarget(stageId) }
}

// 单条记录的有效时长（分钟）= 原始时长 × factor
// factor 缺省 1（老记录没有该字段）；熏听分组在常规1/2 的 factor 为 0，即「可听但不计入」
// ⚠️ 不能用 `r.factor || 1`：0 是合法值，会被误判为 1
function effectiveMinutes(record) {
  const r = record || {}
  const f = typeof r.factor === 'number' ? r.factor : 1
  return (Number(r.durationMinutes) || 0) * f
}

// 获取某天所有打卡
function getByDay(day) {
  const d = day || todayStr()
  const all = getAll()
  return all[d] || []
}

// 批量汇总某天某阶段下各资源的累计时长
// 只需一次 getAll，避免在页面循环里对每个资源重复全量读取
// key 口径：来自打卡记录，按 "groupKey|resourceName" 聚合（resourceName 为记录里的名称快照）
// 两个口径都给：minutes = 折算后的有效时长（统计口径），rawMinutes = 原始投入（展示口径）
// 阶段页用 rawMinutes 判断「今天是否打过卡」—— 熏听在常规1/2 的有效时长为 0，
// 若按有效值判断，这些行会被当成没打过卡（徽标与分组头都不显示）
// @returns {Object} { minutes: {...}, rawMinutes: {...} }
function getDayTotalsByStage(stageId, day) {
  const minutes = {}
  const rawMinutes = {}
  try {
    const list = getByDay(day || todayStr())
    for (const c of list) {
      if (!c || c.stageId !== stageId) continue
      const k = `${c.groupKey}|${c.resourceName}`
      const raw = Number(c.durationMinutes) || 0
      rawMinutes[k] = (rawMinutes[k] || 0) + raw
      minutes[k] = (minutes[k] || 0) + effectiveMinutes(c)
    }
  } catch (e) {
    console.error('getDayTotalsByStage failed:', e)
  }
  return { minutes, rawMinutes }
}

// 获取某月所有打卡记录
// ym: 'YYYY-MM'
function getByMonth(ym) {
  const all = getAll()
  const list = []
  for (const day in all) {
    if (!day.startsWith(ym)) continue
    // 脏数据（该日不是数组）跳过，避免展开非可迭代值抛错
    const dayList = all[day]
    if (!Array.isArray(dayList)) continue
    list.push(...dayList)
  }
  return list
}

// 累计打卡次数
function totalCountAll() {
  const all = getAll()
  let n = 0
  for (const day in all) {
    if (Array.isArray(all[day])) n += all[day].length
  }
  return n
}

// 某阶段累计读完次数（所有资源读完次数之和）
function totalReadCountByStage(stageId) {
  const byStage = getReadCountByStage(stageId)
  let total = 0
  for (const k in byStage) total += byStage[k]
  return total
}

// 根据 id 删除打卡记录
// @returns {boolean} 是否删除并保存成功
function deleteCheckin(id) {
  const all = getAll()
  for (const day in all) {
    const list = all[day]
    const idx = list.findIndex(c => c.id === id)
    if (idx >= 0) {
      list.splice(idx, 1)
      if (list.length === 0) {
        delete all[day]
      } else {
        all[day] = list
      }
      return !!saveAll(all)
    }
  }
  return false
}

// 按 id 取单条打卡记录（找不到返回 null）
// day 字段以存储位置兜底：极老的数据可能没有记录内 day
function getCheckinById(id) {
  if (!id) return null
  const all = getAll()
  for (const day in all) {
    const list = all[day]
    if (!Array.isArray(list)) continue
    const hit = list.find(c => c && c.id === id)
    if (hit) return { ...hit, day: hit.day || day }
  }
  return null
}

// 更新一条打卡记录（编辑）
// opts: { day, stageId, stageName, groupKey, groupLabel, resourceId, resourceName, durationMinutes, remark }
// 语义约定：
// - 日期未变：保留原 timestamp（只改时长/备注时不应改动展示时间）
// - 日期改变：改到今天用 Date.now()，改到历史日期用该日 12:00（与 addCheckin 的补录口径一致）
// - backfilled 按新日期重算（== 今天则清掉该标记）
// - 跨日 / 跨月移动由 saveAll 按月重组分片自然处理，无需特殊分支
// 注意：不会迁移 qingba_read_counts（读完次数是用户主动标记的独立计数，
//       与打卡记录并非 1:1，无法从记录可靠反推，故编辑不改动它）
// @returns {{ ok: boolean, moved: boolean, day: string, record: Object|null }}
function updateCheckin(id, opts) {
  const o = opts || {}
  if (!id) return { ok: false, moved: false, day: '', record: null }
  try {
    const all = getAll()

    // 1) 定位：按存储位置找，不能只信记录内的 day 字段
    let oldDay = ''
    let oldIdx = -1
    let cur = null
    for (const day in all) {
      const list = all[day]
      if (!Array.isArray(list)) continue
      const i = list.findIndex(c => c && c.id === id)
      if (i >= 0) {
        oldDay = day
        oldIdx = i
        cur = list[i]
        break
      }
    }
    if (!cur) return { ok: false, moved: false, day: '', record: null }

    const newDay = normalizeDay(o.day) || normalizeDay(cur.day) || oldDay
    const backfilled = newDay !== todayStr()

    const next = {
      ...cur,
      day: newDay,
      stageId: o.stageId || '',
      stageName: o.stageName || '',
      groupKey: o.groupKey || '',
      groupLabel: o.groupLabel || '',
      resourceId: o.resourceId || '',
      resourceName: o.resourceName || '',
      durationMinutes: Number(o.durationMinutes) || 0,
      remark: o.remark || ''
    }
    // 折算系数按「新的阶段 + 新的分组」重算：改阶段（常规3 → 常规4）或改分组
    // （熏听 → 主线）都必须跟着变，否则会把旧系数带到新记录上
    const factor = listeningFactor(next.stageId, next.groupKey)
    if (factor !== 1) {
      next.factor = factor
    } else {
      delete next.factor
    }
    if (backfilled) {
      next.backfilled = true
    } else {
      delete next.backfilled
    }
    if (newDay !== oldDay) {
      next.timestamp = backfilled ? dayToTimestamp(newDay) : Date.now()
    }

    // 2) 从原 day 摘除，写入新 day
    const oldList = all[oldDay]
    oldList.splice(oldIdx, 1)
    if (oldList.length === 0) delete all[oldDay]
    const newList = Array.isArray(all[newDay]) ? all[newDay] : []
    newList.push(next)
    all[newDay] = newList

    if (!saveAll(all)) return { ok: false, moved: false, day: oldDay, record: null }
    return { ok: true, moved: newDay !== oldDay, day: newDay, record: next }
  } catch (e) {
    console.error('updateCheckin failed:', e)
    return { ok: false, moved: false, day: '', record: null }
  }
}

// 某阶段打卡记录条数（只读，不删任何数据；供清空范围页等展示「将清空多少条」）
function countCheckinsByStage(stageId) {
  try {
    const all = getAll()
    let count = 0
    for (const day in all) {
      const list = all[day]
      if (!Array.isArray(list)) continue
      list.forEach(c => {
        if (c && c.stageId === stageId) count++
      })
    }
    return count
  } catch (e) {
    return 0
  }
}

// 清除某阶段的全部打卡记录（同时清除该阶段的已读次数与默认备注）
// 保留其它阶段数据，返回被删除的记录条数
function clearCheckinsByStage(stageId) {
  try {
    const all = getAll()
    let removed = 0
    const remain = {}

    for (const day in all) {
      const list = all[day]
      if (!Array.isArray(list)) continue
      const kept = list.filter(c => c && c.stageId !== stageId)
      removed += list.length - kept.length
      if (kept.length > 0) {
        remain[day] = kept
      }
    }

    // 同步清除该阶段的已读次数（key 格式: stageId|groupKey|resourceId）
    const counts = _getReadCounts()
    const prefix = `${stageId}|`
    let changed = false
    for (const k in counts) {
      if (String(k).indexOf(prefix) === 0) {
        delete counts[k]
        changed = true
      }
    }
    if (changed) _saveReadCounts(counts)

    // 同步清除该阶段的默认备注（key 格式: stageId|groupKey|resourceId）
    // 否则重新添加同名资源时，清空前保存过的备注会"复活"
    const remarks = _getDefaultRemarks()
    let remarkChanged = false
    for (const k in remarks) {
      if (String(k).indexOf(prefix) === 0) {
        delete remarks[k]
        remarkChanged = true
      }
    }
    if (remarkChanged) _saveDefaultRemarks(remarks)

    // 同步从已完成名单移除该阶段
    const done = getCompletedStages()
    const di = done.indexOf(stageId)
    if (di >= 0) {
      done.splice(di, 1)
      _pcSet(STAGE_DONE_KEY, '', done)
    }

    if (removed > 0) saveAll(remain)
    return removed
  } catch (e) {
    return 0
  }
}

// 获取某阶段累计学习时长（分钟）
function getStageMinutes(stageId) {
  const all = getAll()
  let minutes = 0
  for (const day in all) {
    if (!Array.isArray(all[day])) continue
    for (const r of all[day]) {
      if (r && r.stageId === stageId) {
        minutes += effectiveMinutes(r)
      }
    }
  }
  return minutes
}

// 获取从常规1到指定常规阶段的累计时长（分钟），用于常规6/准桥梁晋级校验
function getAccumulatedMinutes(stageId) {
  const all = getAll()
  let minutes = 0
  // 只累计常规阶段 regular_1 ~ regular_N
  const targetMatch = String(stageId || '').match(/^regular_(\d+)$/)
  const targetNum = targetMatch ? +targetMatch[1] : 6
  for (const day in all) {
    if (!Array.isArray(all[day])) continue
    for (const r of all[day]) {
      const m = String(r && r.stageId || '').match(/^regular_(\d+)$/)
      if (m && +m[1] <= targetNum) {
        minutes += effectiveMinutes(r)
      }
    }
  }
  return minutes
}

// 格式化分钟: >=60 自动换算 XhYm, <60 直接 Xm
function fmtMinutes(totalMin) {
  const m = Math.round(Number(totalMin) || 0)
  if (m <= 0) return '0m'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return rm ? `${h}h${rm}m` : `${h}h`
}

// 分钟 -> 中文时长文案（如「20小时10分钟」/「2小时」/「45分钟」）
// 用于统计页排行榜等需要完整中文口径的场景
function fmtMinutesCN(totalMin) {
  const m = Math.round(Number(totalMin) || 0)
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h > 0 && mm > 0) return `${h}小时${mm}分钟`
  if (h > 0) return `${h}小时`
  return `${mm}分钟`
}

// ===== 读完次数 =====
// 存储结构: { "stageId|groupKey|resourceId": count }
// （迁移前遗留的 name key 由 migrateResourceKeysToId() 一次性改写）

function _getReadCounts() {
  const v = _pcGet(READ_COUNT_KEY, '', null)
  return (v && typeof v === 'object') ? v : {}
}

function _saveReadCounts(data) {
  _pcSet(READ_COUNT_KEY, '', data)
}

// 整份读次数（当前孩子）：导出备份用（页面不应直摸存储键）
function getReadCounts() {
  return _getReadCounts()
}

// 覆盖式写入整份读次数（当前孩子）：导入备份用
function replaceReadCounts(data) {
  const src = (data && typeof data === 'object') ? data : {}
  return _pcSet(READ_COUNT_KEY, '', src)
}

function _readCountKey(stageId, groupKey, resourceId) {
  return `${stageId}|${groupKey}|${resourceId}`
}

// 获取某资源的已读次数
function getReadCount(stageId, groupKey, resourceId) {
  const all = _getReadCounts()
  return all[_readCountKey(stageId, groupKey, resourceId)] || 0
}

// 某资源已读次数 +1
function incrementReadCount(stageId, groupKey, resourceId) {
  const all = _getReadCounts()
  const key = _readCountKey(stageId, groupKey, resourceId)
  all[key] = (all[key] || 0) + 1
  _saveReadCounts(all)
  return all[key]
}

// 某资源已读次数 -1（撤销一次「读完」）
// 减到 0 时直接删除该 key，避免残留 0 值影响排行 / 汇总
// @returns {number} 撤销后的次数（不小于 0）
function decrementReadCount(stageId, groupKey, resourceId) {
  const all = _getReadCounts()
  const key = _readCountKey(stageId, groupKey, resourceId)
  const next = (Number(all[key]) || 0) - 1
  if (next > 0) {
    all[key] = next
  } else {
    delete all[key]
  }
  _saveReadCounts(all)
  return next > 0 ? next : 0
}

// 获取某阶段所有资源的已读次数
// 采用「剥掉 {stageId}| 前缀」的写法（key 为 "stageId|groupKey|resourceId"）
// @returns {Object} { "groupKey|resourceId": count }
function getReadCountByStage(stageId) {
  const all = _getReadCounts()
  const result = {}
  const prefix = `${stageId}|`
  for (const key in all) {
    if (String(key).indexOf(prefix) === 0) {
      result[String(key).substring(prefix.length)] = all[key]
    }
  }
  return result
}

// 某阶段已读完排行：按资源聚合读完次数，降序，仅含 count>0
// 名称解析优先级：记录里的名称快照（资源已删除也能显示）→ 资源视图 → id
// @returns {Array} [{ groupKey, groupLabel, resourceId, resourceName, count }]
function getReadRankingByStage(stageId) {
  const all = getAll()
  const labelMap = {}
  const snapshotNames = {} // { "groupKey|resourceId": resourceName }
  for (const day in all) {
    for (const r of all[day]) {
      if (!r || r.stageId !== stageId || !r.groupKey) continue
      labelMap[r.groupKey] = r.groupLabel
      if (r.resourceId) snapshotNames[`${r.groupKey}|${r.resourceId}`] = r.resourceName
    }
  }

  // 延迟 require，避免 resources.js ↔ customResources.js ↔ checkin.js 循环依赖
  let view = null
  try { view = require('./resources.js') } catch (e) { view = null }

  const counts = getReadCountByStage(stageId)
  const list = []
  for (const key in counts) {
    if (!counts[key]) continue
    const idx = String(key).indexOf('|')
    const groupKey = key.substring(0, idx)
    const resourceId = key.substring(idx + 1)
    let resourceName = snapshotNames[key] || ''
    if (!resourceName && view) {
      resourceName = view.getResourceName(stageId, groupKey, resourceId, '')
    }
    list.push({
      groupKey,
      groupLabel: labelMap[groupKey] || '',
      resourceId,
      resourceName: resourceName || resourceId,
      count: counts[key]
    })
  }
  list.sort((a, b) => b.count - a.count)
  return list
}

// ===== 资源 id 化迁移 =====
// 老数据 key 为 "stageId|groupKey|资源名"，迁移为 "stageId|groupKey|资源id"
// 找不到对应官方资源的 key 原样保留（不丢数据）

let _idsMigrated = false
let _officialIdMap = null

// 官方资源索引：{ [stageId]: { [groupKey]: { [name]: id } } }
function _getOfficialIdMap() {
  if (_officialIdMap) return _officialIdMap
  const map = {}
  // 全路线收集（两路线 stage_id 命名空间隔离，不会互撞）
  const stages = []
  Object.keys(ROUTES).forEach(rid => {
    ;(ROUTES[rid].stages || []).forEach(st => stages.push(st))
  })
  stages.forEach(st => {
    const stageMap = {}
    const res = st.resources || {}
    for (const groupKey in res) {
      const items = res[groupKey]
      if (!Array.isArray(items)) continue
      const byName = {}
      items.forEach(it => {
        if (it && it.id && it.name) byName[it.name] = it.id
      })
      stageMap[groupKey] = byName
    }
    map[st.stage_id] = stageMap
  })
  _officialIdMap = map
  return map
}

function _lookupOfficialId(stageId, groupKey, name) {
  const stageMap = _getOfficialIdMap()[stageId]
  if (!stageMap) return ''
  const byName = stageMap[groupKey]
  if (!byName) return ''
  return byName[name] || ''
}

// 拆解 "stageId|groupKey|资源名 或 资源id"
function _parseResourceKey(key) {
  const s = String(key)
  const i1 = s.indexOf('|')
  if (i1 < 0) return null
  const i2 = s.indexOf('|', i1 + 1)
  if (i2 < 0) return null
  return {
    stageId: s.substring(0, i1),
    groupKey: s.substring(i1 + 1, i2),
    rest: s.substring(i2 + 1)
  }
}

// 一次性迁移：已读次数 + 默认备注 的 name key → id key
// 幂等（内部 _idsMigrated 标记），重复调用无副作用
// @param {boolean} force 忽略本会话已迁移标记（导入旧备份后需要重新迁移时传 true）
// @returns {boolean} 是否有数据被改写
function migrateResourceKeysToId(force) {
  if (_idsMigrated && !force) return false

  let changed = false
  try {
    // 1) 已读次数
    const counts = _getReadCounts()
    let countsChanged = false
    for (const key in counts) {
      const parsed = _parseResourceKey(key)
      if (!parsed) continue
      const id = _lookupOfficialId(parsed.stageId, parsed.groupKey, parsed.rest)
      if (!id || id === parsed.rest) continue
      const newKey = `${parsed.stageId}|${parsed.groupKey}|${id}`
      counts[newKey] = (counts[newKey] || 0) + (counts[key] || 0)
      delete counts[key]
      countsChanged = true
    }
    if (countsChanged) {
      _saveReadCounts(counts)
      changed = true
    }

    // 2) 默认备注
    const remarks = _getDefaultRemarks()
    let remarksChanged = false
    for (const key in remarks) {
      const parsed = _parseResourceKey(key)
      if (!parsed) continue
      const id = _lookupOfficialId(parsed.stageId, parsed.groupKey, parsed.rest)
      if (!id || id === parsed.rest) continue
      const newKey = `${parsed.stageId}|${parsed.groupKey}|${id}`
      if (!remarks[newKey]) remarks[newKey] = remarks[key]
      delete remarks[key]
      remarksChanged = true
    }
    if (remarksChanged) {
      _saveDefaultRemarks(remarks)
      changed = true
    }
  } catch (e) {
    console.error('migrateResourceKeysToId failed:', e)
    return false
  }
  // 迁移真正跑完才置位幂等标记：中途异常时本次不置位，下次调用仍会重试
  _idsMigrated = true
  return changed
}

// 改归属 / 改名：打卡记录 + 已读次数 + 默认备注 三处一起迁
// opts: {
//   resourceId, resourceName,          // 原资源 id / 名称
//   fromStageId, fromGroupKey,
//   toStageId, toGroupKey,
//   toStageName, toGroupLabel,
//   toResourceName                     // 可选：改名时的新名称（缺省沿用 resourceName）
// }
// @returns {{ ok: boolean }}
function migrateResourceRecords(opts) {
  const o = opts || {}
  const resourceId = o.resourceId || ''
  const resourceName = o.resourceName || ''
  const toResourceName = o.toResourceName || resourceName
  if (!resourceId && !resourceName) return { ok: false }

  // 目标 key（id 优先）
  const targetKey = resourceId
    ? `${o.toStageId}|${o.toGroupKey}|${resourceId}`
    : `${o.toStageId}|${o.toGroupKey}|${toResourceName}`
  // 兼容迁移前遗留的 name key
  const oldKeys = []
  if (resourceId) oldKeys.push(`${o.fromStageId}|${o.fromGroupKey}|${resourceId}`)
  if (resourceName) oldKeys.push(`${o.fromStageId}|${o.fromGroupKey}|${resourceName}`)

  try {
    // 1) 打卡记录：id 优先 + 名称回退，命中后改写归属并补上 resourceId（自愈）
    const all = getAll()
    let recordsChanged = false
    for (const day in all) {
      const list = all[day]
      if (!Array.isArray(list)) continue
      for (const r of list) {
        if (!r) continue
        const same = r.resourceId
          ? (!!resourceId && r.resourceId === resourceId)
          : (r.stageId === o.fromStageId && r.groupKey === o.fromGroupKey && r.resourceName === resourceName)
        if (!same) continue
        r.stageId = o.toStageId
        r.stageName = o.toStageName
        r.groupKey = o.toGroupKey
        r.groupLabel = o.toGroupLabel
        r.resourceName = toResourceName
        if (resourceId) r.resourceId = resourceId
        recordsChanged = true
      }
    }
    if (recordsChanged && !saveAll(all)) return { ok: false }

    // 2) 已读次数
    const counts = _getReadCounts()
    let countsChanged = false
    oldKeys.forEach(k => {
      if (k === targetKey || counts[k] === undefined) return
      counts[targetKey] = (counts[targetKey] || 0) + (counts[k] || 0)
      delete counts[k]
      countsChanged = true
    })
    if (countsChanged) _saveReadCounts(counts)

    // 3) 默认备注
    const remarks = _getDefaultRemarks()
    let remarksChanged = false
    oldKeys.forEach(k => {
      if (k === targetKey || remarks[k] === undefined) return
      if (!remarks[targetKey]) remarks[targetKey] = remarks[k]
      delete remarks[k]
      remarksChanged = true
    })
    if (remarksChanged) _saveDefaultRemarks(remarks)

    return { ok: true }
  } catch (e) {
    console.error('migrateResourceRecords failed:', e)
    return { ok: false }
  }
}

// 某资源的打卡汇总（记录里的名称是快照，资源删除后统计仍可用）
// 匹配规则：记录有 resourceId 时按 id，否则按「阶段+分组+名称」回退
// 【当前无调用方】保留作为「资源 id 口径」的参考实现：时长类聚合目前仍按名称匹配
// （stats 排行榜、stage 页徽标），后续统一口径时可直接改用它
// @returns {{ count: number, minutes: number }} count=打卡条数
function getResourceCheckinSummary(resourceId, resourceName, stageId, groupKey) {
  const all = getAll()
  let count = 0
  let minutes = 0
  for (const day in all) {
    const list = all[day]
    if (!Array.isArray(list)) continue
    for (const r of list) {
      if (!r) continue
      const same = r.resourceId
        ? (!!resourceId && r.resourceId === resourceId)
        : (r.stageId === stageId && r.groupKey === groupKey && r.resourceName === resourceName)
      if (!same) continue
      count++
      minutes += effectiveMinutes(r)
    }
  }
  return { count, minutes }
}

// ===== 当前路线（per-child + 按路线）=====
// 所有页面只服务当前路线（打卡记录/统计/资源均按路线隔离，见方案文档第四节）
function getCurrentRouteId() {
  const id = _pcGet(CURRENT_ROUTE_KEY, '', '')
  return ROUTES[id] ? id : 'regular'
}

function setCurrentRouteId(id) {
  return _pcSet(CURRENT_ROUTE_KEY, '', ROUTES[id] ? id : 'regular')
}

// 当前路线完整对象 { id, name, stages }，页面用它替代写死的 routeData
function getCurrentRoute() {
  return ROUTES[getCurrentRouteId()] || ROUTES.regular
}

// ===== 当前阶段（per-child + 按路线存槽位，切孩子/切路线互不污染）=====
// 键：qingba_current_stage_<childId>_<routeId>
// 两级 legacy 兜底（均仅主孩子生效，读到即迁移并删除旧键）：
//   v2 按路线槽位键 qingba_current_stage_<routeId>（由 _pcGet 统一处理）
//   v1 单键 qingba_current_stage（仅在常规路线下兼容）
function _currentStageSeg() {
  return '_' + getCurrentRouteId()
}

function getCurrentStage() {
  const saved = _pcGet(CURRENT_STAGE_KEY, _currentStageSeg(), null)
  if (saved) return saved
  // v1 旧单键兜底（仅主孩子 + 常规路线）：迁移后删除，否则「清空路线数据」后又被兜底读回
  if (_isPrimaryChild() && getCurrentRouteId() === 'regular') {
    try {
      const legacyV1 = wx.getStorageSync(CURRENT_STAGE_KEY)
      if (legacyV1) {
        _pcSet(CURRENT_STAGE_KEY, _currentStageSeg(), legacyV1)
        wx.removeStorageSync(CURRENT_STAGE_KEY)
        return legacyV1
      }
    } catch (e) {}
  }
  return null
}

function setCurrentStage(stageData) {
  return _pcSet(CURRENT_STAGE_KEY, _currentStageSeg(), stageData)
}

function clearCurrentStage() {
  return _pcRemove(CURRENT_STAGE_KEY, _currentStageSeg())
}

// 当前孩子的两路线阶段槽位整组读（备份导出用；当前路线之外的槽位 getCurrentStage 读不到）
function getCurrentStagesMap() {
  return {
    regular: _pcGet(CURRENT_STAGE_KEY, '_regular', null),
    bigloop: _pcGet(CURRENT_STAGE_KEY, '_bigloop', null)
  }
}

// 整组恢复两路线阶段槽位（备份导入用，作用于当前孩子；缺字段/空值跳过不覆盖）
function restoreCurrentStages(map) {
  if (!map || typeof map !== 'object') return false
  if (map.regular) _pcSet(CURRENT_STAGE_KEY, '_regular', map.regular)
  if (map.bigloop) _pcSet(CURRENT_STAGE_KEY, '_bigloop', map.bigloop)
  return true
}

// ===== 已完成阶段（含最后阶段，用于显式标记“达成目标”；per-child）=====
function getCompletedStages() {
  const arr = _pcGet(STAGE_DONE_KEY, '', null)
  return Array.isArray(arr) ? arr : []
}

function isStageDone(stageId) {
  if (!stageId) return false
  return getCompletedStages().indexOf(stageId) >= 0
}

function markStageDone(stageId) {
  if (!stageId) return false
  const list = getCompletedStages()
  if (list.indexOf(stageId) >= 0) return true
  list.push(stageId)
  return _pcSet(STAGE_DONE_KEY, '', list)
}

// 批量覆盖已完成阶段名单（供选择阶段时标记前序阶段）
function setCompletedStages(list) {
  return _pcSet(STAGE_DONE_KEY, '', Array.isArray(list) ? list : [])
}

// ===== 多孩：级联删除与启动迁移 =====

// 某孩子的数据摘要（切换弹层 / 管理页 / 路线页 cell 展示用）
// 遍历该孩子的打卡主键与分片聚合：打卡条数、有效时长（分钟，按 factor 折算）、今日次数
// 主键态与分片态不共存（saveAll 保证），两者都读亦无害
// @returns {{ count: number, minutes: number, todayCount: number }}
function getChildSummary(childId) {
  const summary = { count: 0, minutes: 0, todayCount: 0 }
  if (!childId) return summary
  const today = todayStr()
  const mainKey = STORAGE_KEY + '_' + childId
  const chunkPrefix = CHUNK_PREFIX + childId + '_'
  const fold = data => {
    for (const day in data) {
      const list = data[day]
      if (!Array.isArray(list)) continue
      for (const r of list) {
        if (!r) continue
        summary.count++
        summary.minutes += effectiveMinutes(r)
        if (day === today) summary.todayCount++
      }
    }
  }
  try {
    const main = wx.getStorageSync(mainKey)
    if (main && typeof main === 'object') fold(main)
    let keys = []
    try {
      const info = wx.getStorageInfoSync()
      keys = (info.keys || []).filter(k => {
        const s = String(k)
        return s.startsWith(chunkPrefix) && !s.startsWith(chunkPrefix + TMP_CHUNK_SUB)
      })
    } catch (e2) {}
    keys.forEach(k => {
      try {
        const chunk = wx.getStorageSync(k)
        if (chunk && typeof chunk === 'object') fold(chunk)
      } catch (e3) {}
    })
  } catch (e) {}
  return summary
}

// 删除某孩子的全部打卡侧 per-child 数据（供 children.removeChild 级联调用）
// 遍历 keys 按前缀删除；getStorageInfoSync 不可用时按已知组合键显式删除兜底
function removeChildData(childId) {
  if (!childId) return 0
  const mainKey = STORAGE_KEY + '_' + childId
  const chunkPrefix = CHUNK_PREFIX + childId + '_'
  const stagePrefix = CURRENT_STAGE_KEY + '_' + childId + '_'
  const exactKeys = [
    mainKey,
    READ_COUNT_KEY + '_' + childId,
    STAGE_DONE_KEY + '_' + childId,
    CURRENT_ROUTE_KEY + '_' + childId,
    TARGET_MODE_KEY + '_' + childId,
    TARGET_CUSTOM_KEY + '_' + childId,
    YOUQU_PLAN_KEY + '_' + childId,
    stagePrefix + 'regular',
    stagePrefix + 'bigloop'
  ]

  let removed = 0
  const tryRemove = k => {
    try { wx.removeStorageSync(k); removed++ } catch (e) {}
  }
  try {
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach(k => {
      const s = String(k)
      if (s === mainKey || s.startsWith(chunkPrefix) || s.startsWith(stagePrefix)) {
        tryRemove(s)
      }
    })
  } catch (e) {}
  exactKeys.forEach(tryRemove) // removeStorageSync 对不存在的键无副作用，重复删除无害
  return removed
}

// 旧单孩数据 → 主孩子槽位的主动全量迁移（app.js onLaunch 调用）
// 幂等：各键「读到旧值才迁移并删除」，读路径的兜底逻辑作容灾双保险（§3.3）
function migrateLegacyData() {
  if (!getActiveChildId()) return
  _migrateLegacyCheckins()          // 打卡主键 + 分片
  getCurrentRouteId()               // 当前路线（触发 _pcGet 兜底）
  getCurrentStage()                 // 当前路线的阶段槽位
  const other = getCurrentRouteId() === 'regular' ? 'bigloop' : 'regular'
  _pcGet(CURRENT_STAGE_KEY, '_' + other, null)  // 另一条路线的阶段槽位
  _pcGet(READ_COUNT_KEY, '', null)              // 读次数
  _pcGet(STAGE_DONE_KEY, '', null)              // 已完成阶段
  _pcGet(TARGET_MODE_KEY, '', null)             // 目标档位
  _pcGet(TARGET_CUSTOM_KEY, '', null)           // 逐阶段自定义目标
  _pcGet(YOUQU_PLAN_KEY, '', null)              // 有趣计划开关
  try { require('./customResources.js').migrateLegacyData() } catch (e) {} // 自定义资源
}

module.exports = {
  DEFAULT_REMARK_KEY,
  READ_COUNT_KEY,
  CURRENT_STAGE_KEY,
  todayStr,
  normalizeDay,
  dayToTimestamp,
  addCheckin,
  addCheckinsOnDay,
  getCheckinById,
  updateCheckin,
  deleteCheckin,
  countCheckinsByStage,
  clearCheckinsByStage,
  getAll,
  getByMonth,
  totalCountAll,
  totalReadCountByStage,
  getDayTotalsByStage,
  fmtMinutes,
  fmtMinutesCN,
  getDefaultRemark,
  saveDefaultRemark,
  getReadCount,
  incrementReadCount,
  decrementReadCount,
  getReadCountByStage,
  getReadRankingByStage,
  getReadCounts,
  replaceReadCounts,
  migrateResourceKeysToId,
  migrateResourceRecords,
  migrateLegacyData,
  removeChildData,
  getChildSummary,
  getCurrentStagesMap,
  restoreCurrentStages,
  getResourceCheckinSummary,
  getCurrentStage,
  setCurrentStage,
  clearCurrentStage,
  getCurrentRouteId,
  setCurrentRouteId,
  getCurrentRoute,
  getCompletedStages,
  isStageDone,
  markStageDone,
  setCompletedStages,
  saveAll,
  isYouquPlanEnabled,
  setYouquPlanEnabled,
  isListeningEnabled,
  setListeningEnabled,
  getTargetMode,
  setTargetMode,
  getCustomTargets,
  getCustomTarget,
  setCustomTarget,
  clearCustomTarget,
  replaceCustomTargets,
  getTargetOption,
  effectiveMinutes,
  getStageMinutes,
  getAccumulatedMinutes
}
