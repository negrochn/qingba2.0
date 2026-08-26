// 打卡存储工具
// 存储结构: qingba_checkins = Record<dayStr(YYYY-MM-DD), Checkin[]>
// Checkin: { id, stageId, stageName, groupKey, groupLabel, resourceName, durationMinutes, timestamp }

const STORAGE_KEY = 'qingba_checkins'
const DEFAULT_REMARK_KEY = 'qingba_default_remarks'
const READ_COUNT_KEY = 'qingba_read_counts'
const CURRENT_STAGE_KEY = 'qingba_current_stage'

function todayStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function genId() {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function getAll() {
  try {
    return wx.getStorageSync(STORAGE_KEY) || {}
  } catch (e) {
    return {}
  }
}

function saveAll(data) {
  try {
    wx.setStorageSync(STORAGE_KEY, data)
  } catch (e) {}
}

// 新增打卡记录
// opts: { stageId, stageName, groupKey, groupLabel, resourceName, durationMinutes, remark }
function addCheckin(opts) {
  const all = getAll()
  const day = todayStr()
  const list = all[day] || []
  const record = {
    id: genId(),
    day,
    stageId: opts.stageId || '',
    stageName: opts.stageName || '',
    groupKey: opts.groupKey || '',
    groupLabel: opts.groupLabel || '',
    resourceName: opts.resourceName || '',
    durationMinutes: Number(opts.durationMinutes) || 0,
    remark: opts.remark || '',
    timestamp: Date.now()
  }
  list.push(record)
  all[day] = list
  saveAll(all)
  return record
}

// 默认备注存储: { "stageId|groupKey|resourceName": remark }
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

function _remarkKey(stageId, groupKey, resourceName) {
  return `${stageId}|${groupKey}|${resourceName}`
}

// 获取某资源的默认备注
function getDefaultRemark(stageId, groupKey, resourceName) {
  const all = _getDefaultRemarks()
  return all[_remarkKey(stageId, groupKey, resourceName)] || ''
}

// 保存某资源的默认备注
function saveDefaultRemark(stageId, groupKey, resourceName, remark) {
  const all = _getDefaultRemarks()
  const key = _remarkKey(stageId, groupKey, resourceName)
  const text = String(remark || '').trim()
  if (text) {
    all[key] = text
  } else {
    delete all[key]
  }
  _saveDefaultRemarks(all)
}

// 获取某天所有打卡
function getByDay(day) {
  const d = day || todayStr()
  const all = getAll()
  return all[d] || []
}

// 汇总某阶段内某资源今日累计时长(分钟)
function todayTotalByResource(stageId, groupKey, resourceName) {
  const list = getByDay(todayStr())
  return list
    .filter(c => c.stageId === stageId && c.groupKey === groupKey && c.resourceName === resourceName)
    .reduce((s, c) => s + c.durationMinutes, 0)
}

// 汇总某阶段今日累计时长
function todayTotalByStage(stageId) {
  const list = getByDay(todayStr())
  return list
    .filter(c => c.stageId === stageId)
    .reduce((s, c) => s + c.durationMinutes, 0)
}

// 汇总今日总时长
function todayTotalMinutes() {
  return getByDay(todayStr()).reduce((s, c) => s + c.durationMinutes, 0)
}

// 获取最近 N 天打卡记录用于展示
function recentDays(n) {
  const all = getAll()
  const days = []
  const now = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const day = todayStr(d)
    days.push({ day, list: all[day] || [] })
  }
  return days
}

// 获取某月所有打卡记录
// ym: 'YYYY-MM'
function getByMonth(ym) {
  const all = getAll()
  const list = []
  for (const day in all) {
    if (day.startsWith(ym)) {
      list.push(...all[day])
    }
  }
  return list
}

// 汇总某月总时长（分钟）
function monthTotalMinutes(ym) {
  return getByMonth(ym).reduce((s, c) => s + c.durationMinutes, 0)
}

// 统计某月打卡天数
function monthDaysCount(ym) {
  const all = getAll()
  let count = 0
  for (const day in all) {
    if (day.startsWith(ym) && all[day].length > 0) count++
  }
  return count
}

// 统计某月打卡次数
function monthCheckinCount(ym) {
  return getByMonth(ym).length
}

// 汇总本周总时长（分钟），以周一为起点
function weekTotalMinutes() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday)
  const all = getAll()
  let sum = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const list = all[key] || []
    for (const c of list) sum += c.durationMinutes
  }
  return sum
}

// 累计总时长（分钟）
function totalMinutesAll() {
  const all = getAll()
  let sum = 0
  for (const day in all) {
    for (const c of all[day]) sum += c.durationMinutes
  }
  return sum
}

// 累计打卡次数
function totalCountAll() {
  const all = getAll()
  let n = 0
  for (const day in all) n += all[day].length
  return n
}

// 累计打卡天数
function totalDaysAll() {
  const all = getAll()
  let n = 0
  for (const day in all) if (all[day].length > 0) n++
  return n
}

// 某阶段累计总时长（分钟）
function totalMinutesByStage(stageId) {
  if (!stageId) return 0
  const all = getAll()
  let sum = 0
  for (const day in all) {
    for (const c of all[day]) {
      if (c.stageId === stageId) sum += c.durationMinutes
    }
  }
  return sum
}

// 某阶段累计读完次数（所有资源读完次数之和）
function totalReadCountByStage(stageId) {
  const byStage = getReadCountByStage(stageId)
  let total = 0
  for (const k in byStage) total += byStage[k]
  return total
}

// 根据 id 删除打卡记录
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
      saveAll(all)
      return true
    }
  }
  return false
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

// ===== 读完次数 =====
// 存储结构: { "stageId|groupKey|resourceName": count }

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

function _readCountKey(stageId, groupKey, resourceName) {
  return `${stageId}|${groupKey}|${resourceName}`
}

// 获取某资源的已读次数
function getReadCount(stageId, groupKey, resourceName) {
  const all = _getReadCounts()
  return all[_readCountKey(stageId, groupKey, resourceName)] || 0
}

// 某资源已读次数 +1
function incrementReadCount(stageId, groupKey, resourceName) {
  const all = _getReadCounts()
  const key = _readCountKey(stageId, groupKey, resourceName)
  all[key] = (all[key] || 0) + 1
  _saveReadCounts(all)
  return all[key]
}

// 获取所有已读次数原始数据
function getAllReadCounts() {
  return _getReadCounts()
}

// 累计所有阶段的已读次数
function totalReadCountAll() {
  const all = _getReadCounts()
  let total = 0
  for (const k in all) total += all[k]
  return total
}

// 获取某阶段所有资源的已读次数 { "groupKey|resourceName": count }
function getReadCountByStage(stageId) {
  const all = _getReadCounts()
  const result = {}
  for (const key in all) {
    const parts = key.split('|')
    if (parts[0] === stageId) {
      result[`${parts[1]}|${parts[2]}`] = all[key]
    }
  }
  return result
}

// 当前阶段相关
function getCurrentStage() {
  try {
    return wx.getStorageSync(CURRENT_STAGE_KEY) || null
  } catch (e) {
    return null
  }
}

function setCurrentStage(stageData) {
  try {
    wx.setStorageSync(CURRENT_STAGE_KEY, stageData)
    return true
  } catch (e) {
    return false
  }
}

// ===== 周期统计接口 =====
// periodType: 'week' | 'month' | 'year' | 'all'
// 返回: [{ id, period, label, minutes, isToday }]
function getPeriodStats(periodType) {
  const now = new Date()
  const all = getAll()
  const result = []

  if (periodType === 'week') {
    // 最近7天
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const day = todayStr(d)
      const list = all[day] || []
      const minutes = list.reduce((s, c) => s + c.durationMinutes, 0)
      const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
      result.push({
        id: day,
        period: day,
        label: i === 0 ? '今天' : weekday,
        minutes,
        isToday: i === 0
      })
    }
  } else if (periodType === 'month') {
    // 最近30天
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const day = todayStr(d)
      const list = all[day] || []
      const minutes = list.reduce((s, c) => s + c.durationMinutes, 0)
      result.push({
        id: day,
        period: day,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        minutes,
        isToday: i === 0
      })
    }
  } else if (periodType === 'year') {
    // 最近12个月
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      let minutes = 0
      for (const day in all) {
        if (day.startsWith(ym)) {
          minutes += all[day].reduce((s, c) => s + c.durationMinutes, 0)
        }
      }
      result.push({
        id: ym,
        period: ym,
        label: `${d.getMonth() + 1}月`,
        minutes,
        isToday: false
      })
    }
  } else if (periodType === 'all') {
    // 全部数据按年分组
    const years = new Set()
    for (const day in all) {
      years.add(day.substring(0, 4))
    }
    const sortedYears = Array.from(years).sort().reverse()
    for (const year of sortedYears) {
      let minutes = 0
      for (const day in all) {
        if (day.startsWith(year)) {
          minutes += all[day].reduce((s, c) => s + c.durationMinutes, 0)
        }
      }
      result.push({
        id: year,
        period: year,
        label: `${year}年`,
        minutes,
        isToday: false
      })
    }
  }

  return result
}

module.exports = {
  STORAGE_KEY,
  DEFAULT_REMARK_KEY,
  READ_COUNT_KEY,
  CURRENT_STAGE_KEY,
  todayStr,
  addCheckin,
  deleteCheckin,
  getAll,
  getByDay,
  getByMonth,
  monthTotalMinutes,
  weekTotalMinutes,
  monthDaysCount,
  monthCheckinCount,
  totalMinutesAll,
  totalCountAll,
  totalDaysAll,
  totalMinutesByStage,
  totalReadCountByStage,
  todayTotalByResource,
  todayTotalByStage,
  todayTotalMinutes,
  recentDays,
  fmtMinutes,
  getDefaultRemark,
  saveDefaultRemark,
  getReadCount,
  incrementReadCount,
  getReadCountByStage,
  getAllReadCounts,
  totalReadCountAll,
  getCurrentStage,
  setCurrentStage,
  getPeriodStats
}
