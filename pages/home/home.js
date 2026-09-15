const checkin = require('../../utils/checkin.js')
const { routeData, getRequiredHours } = require('../../utils/data.js')

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// 按小时给出时间问候（英文）
function greetByHour(h) {
  if (h < 6) return 'Early morning'
  if (h < 11) return 'Good morning'
  if (h < 13) return 'Good noon'
  if (h < 18) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Good night'
}

// 分钟 -> 小时文本（去尾零：12.5 / 0 / 60）
function fmtHours(minutes) {
  const v = Number(minutes) / 60
  if (!v) return '0'
  return v % 1 === 0 ? String(v) : v.toFixed(1)
}

Page({
  data: {
    fontClass: '',
    dateText: '',
    greetText: '',
    stageName: '',
    todayCount: 0,
    weekHours: '0',
    weekDeltaText: '—',
    weekBars: [],
    todayHours: '0',
    totalHours: '0',
    stagePercent: 0,
    dayNumber: 0,
    streakDays: 0,
    hasStage: false,
    // 今日明细弹窗（今日时长 / 今日打卡 共用一套面板，随入口切换度量）
    sheetVisible: false,
    sheetMode: 'minutes',
    sheetTitle: '',
    sheetSummaryMain: '',
    sheetSummarySub: '',
    sheetItems: [],
    firstStageName: routeData.stages[0].stage_name,
    lastStageName: routeData.stages[routeData.stages.length - 1].stage_name
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this._refresh()
    // 弹窗处于打开态时同步重建，避免展示上一次的内容
    if (this.data.sheetVisible) this._buildSheet(this.data.sheetMode)
  },

  // 主刷新：全部以「当前阶段」为口径聚合
  _refresh() {
    const now = new Date()
    const h = now.getHours()
    const wd = now.getDay()
    const dateText = `${MONTH_EN[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

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
    let todayCount = 0
    let totalMinutes = 0
    let firstDayStr = ''
    const daysSet = new Set()

    for (const day in all) {
      const list = all[day] || []
      for (const r of list) {
        if (r.stageId !== stageId) continue          // 只统计当前阶段
        const min = Number(r.durationMinutes) || 0
        totalMinutes += min                            // 阶段时长（当前阶段）
        daysSet.add(day)
        if (!firstDayStr || day < firstDayStr) firstDayStr = day   // 阶段首次打卡日（YYYY-MM-DD 字典序即时间序）
        if (day === todayStr) {
          todayMinutes += min
          todayCount += 1                          // 今日打卡次数（当前阶段口径）
        }
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

    // 连续打卡天数（当前阶段口径）：今天未打卡则从昨天起算，避免当天还没打就归零
    let streakDays = 0
    const startOffset = daysSet.has(todayStr) ? 0 : 1
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      if (daysSet.has(checkin.todayStr(d))) streakDays++
      else break
    }

    // Day N：当前阶段首次打卡日 -> 今天（含首尾，首次当天为 Day 1；跨阶段自动重新计数）
    let dayNumber = 0
    if (firstDayStr) {
      const diffDays = Math.round(
        (checkin.dayToTimestamp(todayStr) - checkin.dayToTimestamp(firstDayStr)) / 86400000
      )
      dayNumber = Math.max(1, diffDays + 1)
    }

    // 欢迎语：时段问候 + Day N（当前阶段尚无记录时不显示）
    const greet = greetByHour(h)
    const greetText = dayNumber > 0 ? `${greet}, ` : `${greet}, start today`

    // 阶段进度（与 route / stage 详情页完全同口径）
    let stagePercent = 0
    if (cur) {
      const stageFull = routeData.stages.find(s => s.stage_id === cur.id)
      if (stageFull) {
        const required = getRequiredHours(stageFull)
        const minutes = required.type === 'accumulated'
          ? checkin.getAccumulatedMinutes(cur.id)
          : totalMinutes
        stagePercent = required.hours > 0
          ? Math.min(100, Math.floor((minutes / 60) / required.hours * 100))
          : 0
      }
    }

    this.setData({
      dateText,
      greetText,
      stageName: cur ? (cur.name || '') : '',
      weekHours: fmtHours(thisWeek),
      weekDeltaText,
      weekBars,
      todayHours: fmtHours(todayMinutes),
      todayCount,
      totalHours: fmtHours(totalMinutes),   // 当前阶段累计，非全阶段
      stagePercent,
      dayNumber,
      streakDays,
      hasStage: !!cur
    })
  },

  // 欢迎卡主操作：去选择当前阶段（stagePicker 选完 navigateBack 回首页）
  goStagePicker() {
    wx.navigateTo({ url: '/pages/stagePicker/stagePicker' })
  },

  // 点「今日时长」/「今日打卡」打开今日明细弹窗（mode: minutes | count）
  openTodaySheet(e) {
    const mode = e.currentTarget.dataset.mode === 'count' ? 'count' : 'minutes'
    this._buildSheet(mode)
    this.setData({ sheetVisible: true })
  },

  closeSheet() {
    this.setData({ sheetVisible: false })
  },

  // 阻止弹层内容区点击 / 触摸冒泡（列表滚动区不挂，否则滚不动）
  noop() {},

  // 构建今日明细：口径与卡片完全一致（仅当前阶段、仅今天）
  // mode='minutes' 按时长降序；mode='count' 按次数降序
  // 行样式与占比口径对齐统计页「时长排行榜 / 读完排行榜」：榜首为 100%
  _buildSheet(mode) {
    const now = new Date()
    const todayStr = checkin.todayStr(now)
    const cur = checkin.getCurrentStage()
    const stageId = cur ? cur.id : ''
    const list = (checkin.getAll()[todayStr] || []).filter(r => r && r.stageId === stageId)

    const map = {}
    const order = []
    let totalMinutes = 0
    let totalCount = 0

    for (const r of list) {
      const groupKey = r.groupKey || ''
      // 聚合口径：资源 id 优先（与已读次数 key 一致），老记录回退「分组 + 名称」
      const key = r.resourceId ? `${groupKey}|${r.resourceId}` : `${groupKey}|${r.resourceName}`
      let it = map[key]
      if (!it) {
        it = { key, name: r.resourceName || '未命名资源', minutes: 0, count: 0 }
        map[key] = it
        order.push(it)
      }
      const min = Number(r.durationMinutes) || 0
      it.minutes += min
      it.count += 1
      totalMinutes += min
      totalCount += 1
    }

    const byCount = mode === 'count'
    order.sort((a, b) => byCount
      ? (b.count - a.count || b.minutes - a.minutes)
      : (b.minutes - a.minutes || b.count - a.count))

    // 占比分母为该统计范围的累计值（今日总时长 / 今日总次数），各行相加为 100%
    const base = byCount ? totalCount : totalMinutes
    const items = order.map(it => {
      const val = byCount ? it.count : it.minutes
      return {
        key: it.key,
        name: it.name,
        char: (it.name || '').trim().charAt(0) || '·',
        percent: base > 0 ? Math.round(val / base * 100) : 0,
        valueText: byCount ? `${it.count}次` : checkin.fmtMinutesCN(it.minutes)
      }
    })

    this.setData({
      sheetMode: mode,
      sheetTitle: byCount ? '今日打卡' : '今日时长',
      sheetSummaryMain: byCount ? `${totalCount} 次` : `${fmtHours(totalMinutes)}h`,
      sheetSummarySub: `${items.length} 本`,
      sheetItems: items
    })
  }
})
