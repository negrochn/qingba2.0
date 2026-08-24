// 打卡存储工具
// 存储结构: qingba_checkins = Record<dayStr(YYYY-MM-DD), Checkin[]>
// Checkin: { id, stageId, stageName, groupKey, groupLabel, resourceName, durationMinutes, timestamp }

const STORAGE_KEY = 'qingba_checkins'

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
// opts: { stageId, stageName, groupKey, groupLabel, resourceName, durationMinutes }
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
    timestamp: Date.now()
  }
  list.push(record)
  all[day] = list
  saveAll(all)
  return record
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

module.exports = {
  STORAGE_KEY,
  todayStr,
  addCheckin,
  deleteCheckin,
  getByDay,
  getByMonth,
  monthTotalMinutes,
  monthDaysCount,
  todayTotalByResource,
  todayTotalByStage,
  todayTotalMinutes,
  recentDays,
  fmtMinutes
}
