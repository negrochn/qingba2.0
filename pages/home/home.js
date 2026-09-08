const checkin = require('../../utils/checkin.js')

const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

// 按小时给出时间问候
function greetByHour(h) {
  if (h < 6) return '凌晨好'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  if (h < 22) return '晚上好'
  return '夜深了'
}

// 分钟 -> 小时文本（去尾零：12.5 / 0 / 60）
function fmtHours(minutes) {
  const v = Number(minutes) / 60
  if (!v) return '0'
  return v % 1 === 0 ? String(v) : v.toFixed(1)
}

// 解析目标时长: '60-80H' -> {min:60,max:80}，'60H' -> {min:60,max:60}
function parseTarget(text) {
  if (!text) return null
  const range = String(text).match(/(\d+)\s*-\s*(\d+)/)
  if (range) return { min: +range[1], max: +range[2] }
  const single = String(text).match(/(\d+)/)
  if (single) return { min: +single[1], max: +single[1] }
  return null
}

Page({
  data: {
    fontClass: '',
    greetText: '',
    dateText: '',
    stageName: '',
    weekHours: '0',
    weekDeltaText: '—',
    weekBars: [],
    todayHours: '0',
    totalHours: '0',
    stagePercent: 0,
    checkinDays: 0
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this._refresh()
  },

  // 主刷新：全部以「当前阶段」为口径聚合
  _refresh() {
    const now = new Date()
    const h = now.getHours()
    const wd = now.getDay()
    const dateText = `${now.getMonth() + 1}月${now.getDate()}日 ${WEEK_CN[wd]}`

    const cur = checkin.getCurrentStage()
    const stageId = cur ? cur.id : ''

    // 本周一（周一为周起点）
    const daysSinceMonday = wd === 0 ? 6 : wd - 1
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday)
    const todayStr = checkin.todayStr(now)
    const weekStartStr = checkin.todayStr(monday)
    // 上周同区间起点（前 7 天）
    const lastMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7)
    const lastWeekStartStr = checkin.todayStr(lastMonday)

    const all = checkin.getAll()
    const weekDayMinutes = {}
    let thisWeek = 0
    let lastWeek = 0
    let todayMinutes = 0
    let totalMinutes = 0
    const daysSet = new Set()

    for (const day in all) {
      const list = all[day] || []
      for (const r of list) {
        if (r.stageId !== stageId) continue          // 只统计当前阶段
        const min = Number(r.durationMinutes) || 0
        totalMinutes += min                            // 累计时长（当前阶段）
        daysSet.add(day)
        if (day === todayStr) todayMinutes += min
        if (day >= weekStartStr && day <= todayStr) {
          weekDayMinutes[day] = (weekDayMinutes[day] || 0) + min
          thisWeek += min
        } else if (day >= lastWeekStartStr && day < weekStartStr) {
          lastWeek += min
        }
      }
    }

    // 柱状图：本周 7 天（周一~周日），按周内最大值归一
    let maxVal = 0
    const bars = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      const ds = checkin.todayStr(d)
      const val = weekDayMinutes[ds] || 0
      if (val > maxVal) maxVal = val
      bars.push({ day: ds, label: DAY_LABELS[i], isToday: ds === todayStr })
    }
    const weekBars = bars.map(b => ({
      day: b.day,
      label: b.label,
      isToday: b.isToday,
      percent: maxVal > 0 ? Math.max(6, Math.round(weekDayMinutes[b.day] / maxVal * 100)) : 6
    }))

    // 周环比
    let weekDeltaText = '—'
    if (thisWeek > 0 && lastWeek > 0) {
      const pct = Math.round((thisWeek - lastWeek) / lastWeek * 100)
      weekDeltaText = pct >= 0 ? `较上周 +${pct}%` : `较上周 ${pct}%`
    } else if (thisWeek > 0) {
      weekDeltaText = '较上周 +100%'
    }

    // 阶段进度（对目标下限）
    let stagePercent = 0
    if (cur && cur.timeInvestment) {
      const target = parseTarget(cur.timeInvestment)
      if (target && target.min > 0) {
        stagePercent = Math.min(100, Math.round((totalMinutes / 60) / target.min * 100))
      }
    }

    this.setData({
      greetText: greetByHour(h),
      dateText,
      stageName: cur ? (cur.name || '') : '',
      weekHours: fmtHours(thisWeek),
      weekDeltaText,
      weekBars,
      todayHours: fmtHours(todayMinutes),
      totalHours: fmtHours(totalMinutes),   // 当前阶段累计，非全阶段
      stagePercent,
      checkinDays: daysSet.size
    })
  }
})
