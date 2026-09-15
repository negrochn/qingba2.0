// 打卡存储工具
// 存储结构: qingba_checkins = Record<dayStr(YYYY-MM-DD), Checkin[]>
// Checkin: { id, stageId, stageName, groupKey, groupLabel, resourceId, resourceName, durationMinutes, timestamp }
// 说明：resourceId 为资源唯一 id（官方 o_ 前缀 / 自定义 u_ 前缀）；
//      老记录可能缺少 resourceId，此时按「阶段+分组+名称」回退匹配

const { routeData } = require('./data.js')

const STORAGE_KEY = 'qingba_checkins'
const CHUNK_PREFIX = 'qingba_checkins_' // 按月分片: qingba_checkins_2021-06
// 分片写入的临时 key 前缀：先把全部分片写到临时 key，全部成功后再逐个改名为正式 key，
// 保证任何一步失败都不会破坏已存在的分片（见 saveAll）
const TMP_CHUNK_PREFIX = CHUNK_PREFIX + 'tmp_'
const DEFAULT_REMARK_KEY = 'qingba_default_remarks'
const READ_COUNT_KEY = 'qingba_read_counts'
const CURRENT_STAGE_KEY = 'qingba_current_stage'
const YOUQU_PLAN_KEY = 'qingba_youqu_plan'
const STAGE_DONE_KEY = 'qingba_stage_done'   // 已完成阶段 id 列表

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

function _chunkKey(ym) {
  return CHUNK_PREFIX + ym
}

// 临时分片 key（写入中间态）
function _tmpChunkKey(ym) {
  return TMP_CHUNK_PREFIX + ym
}

// 清理所有分片 key（月度分片 + 极端单日分片），用于存储模式切换/重写时清理旧数据
// 否则 getAll 合并时旧分片会覆盖主 key，导致已删除/已修改的记录"复活"
function _removeChunkKeys() {
  try {
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach(k => {
      if (k.startsWith(CHUNK_PREFIX)) {
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
      // 排除临时分片：它是写入中间态，若参与合并会读到"半成品"数据
      return info.keys.filter(k => {
        const s = String(k)
        return s.startsWith(CHUNK_PREFIX) && !s.startsWith(TMP_CHUNK_PREFIX)
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

function getAll() {
  try {
    const main = wx.getStorageSync(STORAGE_KEY) || {}
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
        wx.setStorageSync(STORAGE_KEY, data)
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
    try { wx.removeStorageSync(STORAGE_KEY) } catch(e) {}
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
  try {
    const v = wx.getStorageSync(YOUQU_PLAN_KEY)
    // 从未设置过（取到的是空串等非布尔值）时默认开启；显式设置过则返回其布尔值
    return typeof v === 'boolean' ? v : true
  } catch (e) {
    return true
  }
}

function setYouquPlanEnabled(enabled) {
  try {
    wx.setStorageSync(YOUQU_PLAN_KEY, !!enabled)
  } catch (e) {
    console.error('setYouquPlanEnabled failed:', e)
  }
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
// @returns {Object} { minutes: { "groupKey|resourceName": min } }
function getDayTotalsByStage(stageId, day) {
  const minutes = {}
  try {
    const list = getByDay(day || todayStr())
    for (const c of list) {
      if (!c || c.stageId !== stageId) continue
      const k = `${c.groupKey}|${c.resourceName}`
      minutes[k] = (minutes[k] || 0) + (Number(c.durationMinutes) || 0)
    }
  } catch (e) {
    console.error('getDayTotalsByStage failed:', e)
  }
  return { minutes }
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

// 清除所有打卡数据（包括分片）
function clearAllCheckins() {
  try {
    let allKeys = []
    try {
      const info = wx.getStorageInfoSync()
      allKeys = info.keys || []
    } catch(e) {}

    const toRemove = []

    // 收集所有相关的 key
    allKeys.forEach(k => {
      if (k === STORAGE_KEY ||
          k.startsWith(CHUNK_PREFIX)) {
        toRemove.push(k)
      }
    })

    // 清空完成阶段名单（回到初始状态）
    toRemove.push(STAGE_DONE_KEY)

    // 批量删除
    toRemove.forEach(k => {
      try { wx.removeStorageSync(k) } catch (e) {}
    })

    return toRemove.length
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
      try { wx.setStorageSync(STAGE_DONE_KEY, done) } catch (e) {}
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
        minutes += Number(r.durationMinutes) || 0
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
        minutes += Number(r.durationMinutes) || 0
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
  try {
    return wx.getStorageSync(READ_COUNT_KEY) || {}
  } catch (e) {
    return {}
  }
}

function _saveReadCounts(data) {
  try {
    wx.setStorageSync(READ_COUNT_KEY, data)
  } catch (e) {}
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
  const stages = (routeData && routeData.stages) || []
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
      minutes += Number(r.durationMinutes) || 0
    }
  }
  return { count, minutes }
}

// 当前阶段相关（无存储时返回 null，表示用户尚未设置）
function getCurrentStage() {
  try {
    const saved = wx.getStorageSync(CURRENT_STAGE_KEY)
    if (saved) return saved
  } catch (e) {}
  return null
}

function setCurrentStage(stageData) {
  try {
    wx.setStorageSync(CURRENT_STAGE_KEY, stageData)
    return true
  } catch (e) {
    return false
  }
}

function clearCurrentStage() {
  try {
    wx.removeStorageSync(CURRENT_STAGE_KEY)
    return true
  } catch (e) {
    return false
  }
}

// ===== 已完成阶段（含最后阶段，用于显式标记“达成目标”）=====
function getCompletedStages() {
  try {
    const arr = wx.getStorageSync(STAGE_DONE_KEY)
    return Array.isArray(arr) ? arr : []
  } catch (e) {
    return []
  }
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
  try {
    wx.setStorageSync(STAGE_DONE_KEY, list)
    return true
  } catch (e) {
    return false
  }
}

// 批量覆盖已完成阶段名单（供选择阶段时标记前序阶段）
function setCompletedStages(list) {
  try {
    wx.setStorageSync(STAGE_DONE_KEY, Array.isArray(list) ? list : [])
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  DEFAULT_REMARK_KEY,
  READ_COUNT_KEY,
  CURRENT_STAGE_KEY,
  todayStr,
  normalizeDay,
  dayToTimestamp,
  addCheckin,
  getCheckinById,
  updateCheckin,
  deleteCheckin,
  clearAllCheckins,
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
  migrateResourceKeysToId,
  migrateResourceRecords,
  getResourceCheckinSummary,
  getCurrentStage,
  setCurrentStage,
  clearCurrentStage,
  getCompletedStages,
  isStageDone,
  markStageDone,
  setCompletedStages,
  saveAll,
  isYouquPlanEnabled,
  setYouquPlanEnabled,
  getStageMinutes,
  getAccumulatedMinutes
}
