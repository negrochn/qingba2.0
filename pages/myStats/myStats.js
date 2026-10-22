// 我的统计：跨阶段个人总览（模仿 iHour「我的统计」页，WeUI 白卡分组）
// 个人统计页：总览（KPI）+ 每日统计（环形图）+ 时间趋势 + 投入分布。
// 聚合：全部按顶部所选阶段统计（_stageSummary 一次 getAll）；「天 × 资源」矩阵页面内自建一次，
// 趋势堆叠 / 每日统计 / 范围分布全由矩阵派生，不逐项读存储。
// 图表：每日/分布环形图与趋势堆叠柱走 ECharts（utils/echarts 定制构建，含 pie/bar/radar）。
// 口径：全部按有效分钟（durationMinutes × factor，熏听折算），与统计页 / 晋级一致。

const checkin = require('../../utils/checkin')
const theme = require('../../utils/theme')
const echarts = require('../../utils/echarts')
const WxCanvas = require('../../utils/wx-canvas')

// ===== 常量 =====

// 图表色板（iHour 口径）：按资源「首次打卡顺序」循环赋色——
// 第 1 个出现的资源=红、第 2 个=蓝……第 6 个循环回红，同一资源在所有图表永远同色。
// 色值为最终定稿（柔和粉彩调）：红 / 蓝 / 青 / 橙 / 紫；
// 「其他」用弱灰（canvas 吃不到 CSS 变量，深浅色在 JS 侧选择后传入）
const PALETTE = ['#f57c84', '#71b7f3', '#54d2b9', '#fca40d', '#b5a8e8']
const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// ISO 周号（周一为一周之始）
function isoWeek(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (t.getDay() + 6) % 7                       // 周一 = 0
  const thu = new Date(t)
  thu.setDate(thu.getDate() - dow + 3)                   // 本周四（决定所属年份）
  const firstThu = new Date(thu.getFullYear(), 0, 4)
  const fd = (firstThu.getDay() + 6) % 7
  firstThu.setDate(firstThu.getDate() - fd + 3)          // 当年首个周四所在周的周一
  return { y: thu.getFullYear(), w: Math.round((thu - firstThu) / 6048e5) + 1 }
}
function isoWeekLabel(d) {
  return '第' + isoWeek(d).w + '周'
}
// 由 ISO 年+周号反推该周周一（第1周周一 = 1月4日所在周的周一）
function isoWeekMonday(y, w) {
  const jan4 = new Date(y, 0, 4)
  const jd = (jan4.getDay() + 6) % 7
  const mon1 = new Date(jan4)
  mon1.setDate(jan4.getDate() - jd)
  const m = new Date(mon1)
  m.setDate(mon1.getDate() + (w - 1) * 7)
  return m
}

// ===== 工具 =====

function pad2(n) { return String(n).padStart(2, '0') }

function dayStrOf(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
function addDays(dayStr, n) {
  const t = new Date(dayStr + 'T00:00:00')
  t.setDate(t.getDate() + n)
  return dayStrOf(t)
}
function weekCn(dayStr) { return WEEK_CN[new Date(dayStr + 'T00:00:00').getDay()] }

// iHour 风格小时数（纯数字，KPI 大字用）：90 -> '1.5'，120 -> '2'
function fmtHoursNum(min) {
  const h = min / 60
  return String(Number(h.toFixed(1)))
}
// ECharts 全局预处理只需注册一次（与 stats 页同因：小程序 drawImage 不支持 DOM 参数）
let _echartsPrepared = false
function prepareEcharts() {
  if (_echartsPrepared) return
  _echartsPrepared = true
  echarts.registerPreprocessor(opt => {
    if (opt && opt.series) {
      const arr = Array.isArray(opt.series) ? opt.series : [opt.series]
      arr.forEach(s => { s.progressive = 0 })
    }
  })
}

Page({
  data: {
    fontClass: '',
    darkClass: '',
    kpi: {},
    daily: { label: '', canNext: false, legend: [] },
    trend: { mode: 'day7' },
    stageNames: [],     // picker 的 range
    stageIndex: 0,
    stageName: '',
    dist: { scope: 'all', periodLabel: '', canNext: false, top: null, tail: [] }
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })
    // 视图状态：每日回顾的日期在 _refresh 里重置为所选阶段最后打卡日；热力格/分布周期同按数据初始化
    this._trendMode = 'day7'
    this._distScope = 'all'
    this._distPeriod = {}    // { year } 或 { year, month }
    this._initStageOptions()
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })
    // 路线可能在设置页被切换：整体重建选择器与选中态（stats 同款）
    if (this._loadedRouteId !== checkin.getCurrentRouteId()) {
      this._initStageOptions()
    }
    // 数据可能在其它页变更，每次展示重算
    this._refresh()
  },

  onReady() {
    prepareEcharts()
    this._ensureCharts()
  },

  // 离开页面销毁 echarts 实例（照 stats 页：实例引用不会随 canvas 自动释放）
  onUnload() {
    this._disposeCharts()
  },

  // ===== 数据聚合 =====

  // 「天 × 资源」有效分钟矩阵：每日回顾 / 趋势堆叠 / 范围分布全由它派生
  // （阶段汇总的 days 只有天总量，堆叠柱需要资源维度）
  _buildMatrix() {
    const byDay = {}
    try {
      const all = checkin.getAll()
      for (const day in all) {
        const list = all[day]
        if (!Array.isArray(list)) continue
        for (const r of list) {
          if (!r || r.stageId !== this._selStageId) continue
          const f = typeof r.factor === 'number' ? r.factor : 1
          const m = (Number(r.durationMinutes) || 0) * f
          if (m <= 0) continue
          const name = r.resourceName || '未命名'
          byDay[day] = byDay[day] || {}
          byDay[day][name] = (byDay[day][name] || 0) + m
        }
      }
    } catch (e) {
      console.error('myStats matrix failed:', e)
    }
    return byDay
  },

  // 范围聚合通用：按 filter 选天聚合资源，Top N + 其他（环形图 / 排行共用）
  _aggregate(filter) {
    const byDay = this._byDay || {}
    const agg = {}
    let total = 0
    for (const day in byDay) {
      if (filter && !filter(day)) continue
      for (const name in byDay[day]) {
        agg[name] = (agg[name] || 0) + byDay[day][name]
        total += byDay[day][name]
      }
    }
    const items = Object.keys(agg)
      .map(name => ({ name, value: Math.round(agg[name]) }))
      .sort((a, b) => b.value - a.value)
    const segs = items.map(s => ({
      name: s.name,
      value: s.value,
      color: this._colorOf(s.name)   // 全部显示，色板循环
    }))
    return { total: Math.round(total), segs }
  },

  // ===== 阶段选择（与数据统计页同款：全页按所选阶段统计） =====

  _initStageOptions() {
    this._loadedRouteId = checkin.getCurrentRouteId()
    const stageOptions = (checkin.getCurrentRoute().stages || []).map(x => ({
      stage_id: x.stage_id,
      stage_name: x.stage_name
    }))
    let idx = -1
    const cur = checkin.getCurrentStage()
    if (cur) idx = stageOptions.findIndex(x => x.stage_id === cur.id)
    if (idx < 0) {                          // 当前阶段无数据：取首个有数据的阶段
      const all = checkin.getAll()
      const hasData = {}
      for (const day in all) {
        const list = all[day]
        if (!Array.isArray(list)) continue
        for (const r of list) { if (r && r.stageId) hasData[r.stageId] = true }
      }
      idx = stageOptions.findIndex(x => hasData[x.stage_id])
    }
    if (idx < 0) idx = 0
    const sel = stageOptions[idx] || null
    this._selStageId = sel ? sel.stage_id : ''
    this.setData({
      stageOptions,
      stageNames: stageOptions.map(x => x.stage_name),
      stageIndex: idx,
      stageName: sel ? sel.stage_name : ''
    })
  },

  onStageChange(e) {
    const idx = Number(e.detail.value)
    const opts = this.data.stageOptions || []
    if (!opts[idx] || opts[idx].stage_id === this._selStageId) return
    this._selStageId = opts[idx].stage_id
    this.setData({ stageIndex: idx, stageName: opts[idx].stage_name })
    this._refresh()
  },

  // 按阶段汇总（结构与 getOverallSummary 对齐：KPI / 分布周期直接复用）
  _stageSummary(stageId) {
    const days = {}
    const daySet = {}
    const byRes = {}
    let totalRecords = 0
    let totalMinutes = 0
    try {
      const all = checkin.getAll()
      for (const day in all) {
        const list = all[day]
        if (!Array.isArray(list)) continue
        for (const r of list) {
          if (!r || r.stageId !== stageId) continue
          const eff = checkin.effectiveMinutes(r)
          totalRecords += 1
          totalMinutes += eff
          days[day] = (days[day] || 0) + eff
          daySet[day] = true
          const k = r.resourceName || '未命名'
          byRes[k] = (byRes[k] || 0) + eff
        }
      }
    } catch (e) {
      console.error('stage summary failed:', e)
    }
    const dayKeys = Object.keys(daySet).sort()
    return {
      totalRecords,
      totalMinutes: Math.round(totalMinutes),
      days,
      streak: this._calcStreak(daySet),
      firstDay: dayKeys[0] || '',
      lastDay: dayKeys[dayKeys.length - 1] || '',
      byResource: Object.keys(byRes)
        .map(name => ({ name, minutes: Math.round(byRes[name]) }))
        .sort((a, b) => b.minutes - a.minutes)
    }
  },

  // 连续打卡天数（按阶段统计：以该阶段最后一条记录日为基准往回连算，而非当日——
  // 回填 / 压测数据停在过去的某天时，不因「今天没打」误判中断；时效感由「最近 7 天」承担）
  _calcStreak(daySet) {
    const last = Object.keys(daySet).sort()[Object.keys(daySet).length - 1] || ''
    let current = 0
    if (last) { let o = 0; while (daySet[addDays(last, o)]) { current += 1; o -= 1 } }
    let longest = 0
    for (const d in daySet) {
      if (daySet[addDays(d, -1)]) continue
      let n = 1
      let o = 1
      while (daySet[addDays(d, o)]) { n += 1; o += 1 }
      if (n > longest) longest = n
    }
    return { current, longest }
  },

  _refresh() {
    const sum = this._stageSummary(this._selStageId)
    this._sum = sum
    // 每日回顾默认停在所选阶段最后打卡日（数据停在过去时不落在今天的空档）
    this._dailyDay = sum.lastDay || checkin.todayStr()
    this._byDay = this._buildMatrix()
    this._colorMap = this._buildColorMap()

    // ---- 卡1 KPI（最近 7 天含今天） ----
    const kpi = {
      records: String(sum.totalRecords),
      hours: fmtHoursNum(sum.totalMinutes),
      // 打卡天数 = 该阶段有记录的日子数（非连续段）
      days: String(Object.keys(sum.days || {}).length),
      reads: String(checkin.totalReadCountByStage(this._selStageId))
    }

    // ---- 分布周期：每次刷新按当前阶段重置（默认停在最后打卡所在年；月/周在 _buildDistVM 惰性默认）----
    this._distPeriod = {}
    const years = this._periodYears(sum)
    this._distPeriod.year = years[years.length - 1]

    // ---- 各卡视图模型 ----
    const daily = this._buildDaily(this._dailyDay)
    const dist = this._buildDistVM()
    this._buildTrendVM(this._trendMode)

    this.setData({
      kpi,
      daily,
      trend: { mode: this._trendMode },
      dist
    })
    this._renderTrend()
    this._renderDaily()
    this._renderDist()
  },

  // 有数据的年份区间（firstDay 年 ~ 今年），分布「年」与趋势「按年」的桶范围
  _periodYears(sum) {
    // 年份区间以数据为准：首记录年 ~ 最后打卡所在年（不往后拉到今年的空档，趋势/分布共用）
    const end = sum.lastDay ? Number(sum.lastDay.slice(0, 4)) : new Date().getFullYear()
    const start = sum.firstDay ? Number(sum.firstDay.slice(0, 4)) : end
    const years = []
    for (let y = start; y <= end; y++) years.push(y)
    return years
  },

  // ---- 卡2 每日统计 ----
  _buildDaily(dayStr) {
    const agg = this._aggregate(d => d === dayStr)
    const legend = agg.segs.map(s => ({
      name: s.name,
      initial: (s.name || ' ')[0],   // 头像字：资源首字
      color: s.color,
      pct: agg.total ? Math.round(s.value / agg.total * 100) : 0,
      valText: checkin.fmtMinutes(s.value)
    }))
    this._daily = { segs: agg.segs, total: agg.total }   // 环形图渲染数据
    return {
      label: this._dayLabel(dayStr),
      canNext: dayStr < (this._sum.lastDay || checkin.todayStr()),
      canPrev: this._sum ? dayStr > (this._sum.firstDay || dayStr) : false,
      legend
    }
  },

  // 分布环形图 view model（ECharts 渲染，与每日统计同款）
  _donutVM(agg, sub) {
    return {
      segments: agg.segs,
      total: agg.total,
      sub: agg.total > 0 ? sub : ''
    }
  },

  _dayLabel(dayStr) {
    const d = new Date(dayStr + 'T00:00:00')
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  // ---- 卡3 趋势（堆叠柱：全部资源平铺，颜色按色板循环） ----
  _buildTrendVM(mode) {
    const byDay = this._byDay || {}
    const names = this._sum.byResource.map(x => x.name)

    // 桶序列与轴标签
    const keys = []
    const labels = []
    if (mode === 'day7') {
      // 窗口尾部对齐所选阶段最后打卡日（数据停在过去时不显示尾部空档）
      const anchor = this._sum.lastDay || checkin.todayStr()
      for (let i = -6; i <= 0; i++) {
        const ds = addDays(anchor, i)
        keys.push(ds)
        labels.push(weekCn(ds))
      }
    } else if (mode === 'week') {
      const anchor = this._sum.lastDay ? new Date(this._sum.lastDay.replace(/-/g, '/')) : new Date()
      const mon = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - ((anchor.getDay() + 6) % 7))
      for (let wi = -6; wi <= 0; wi++) {
        const d = new Date(mon)
        d.setDate(d.getDate() + wi * 7)
        const lb = isoWeekLabel(d)
        keys.push(lb)
        labels.push(lb)
      }
    } else if (mode === 'month') {
      const anchor = this._sum.lastDay ? new Date(this._sum.lastDay.replace(/-/g, '/')) : new Date()
      for (let i = -6; i <= 0; i++) {
        const d = new Date(anchor.getFullYear(), anchor.getMonth() + i, 1)
        keys.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`)
        labels.push(d.getFullYear() !== anchor.getFullYear()
          ? `${String(d.getFullYear()).slice(2)}/${d.getMonth() + 1}`
          : `${d.getMonth() + 1}月`)
      }
    } else {
      this._periodYears(this._sum).forEach(y => { keys.push(String(y)); labels.push(String(y)) })
    }

    const keyOf = mode === 'day7'
      ? d => d
      : mode === 'week'
        ? d => isoWeekLabel(new Date(d + 'T00:00:00'))
      : mode === 'month'
        ? d => d.slice(0, 7)
        : d => d.slice(0, 4)
    const idxOf = {}
    keys.forEach((k, i) => { idxOf[k] = i })

    const series = names.map(n => ({ name: n, color: this._colorOf(n), data: keys.map(() => 0) }))

    for (const day in byDay) {
      const idx = idxOf[keyOf(day)]
      if (idx === undefined) continue
      for (const name in byDay[day]) {
        const si = names.indexOf(name)
        if (si >= 0) series[si].data[idx] += byDay[day][name]
      }
    }
    this._trendData = { labels, series }
    return { mode }
  },
  _defaultWeek() {
    // 默认停在所选阶段最后打卡日所在周
    const src = this._sum && this._sum.lastDay ? new Date(this._sum.lastDay + 'T00:00:00') : new Date()
    const k = isoWeek(src)
    return { year: k.y, week: k.w }
  },

  // ---- 卡4 投入分布 ----
  _buildDistVM() {
    const scope = this._distScope
    let filter = null
    let periodLabel = ''
    let canNext = false
    let canPrev = false
    if (scope === 'year') {
      const years = this._periodYears(this._sum)
      const y = this._distPeriod.year
      periodLabel = `${y} 年`
      canNext = y < years[years.length - 1]
      canPrev = y > years[0]
      filter = d => d.slice(0, 4) === String(y)
    } else if (scope === 'month') {
      const p = this._distPeriod.month || this._defaultMonth()
      this._distPeriod.month = p
      periodLabel = `${p.year} 年 ${p.month} 月`
      const mk = this._sum.lastDay ? new Date(this._sum.lastDay + 'T00:00:00') : new Date()
      canNext = !(p.year === mk.getFullYear() && p.month === mk.getMonth() + 1)
      const min = this._sum.firstDay
      canPrev = !(min && p.year === Number(min.slice(0, 4)) && p.month === Number(min.slice(5, 7)))
      filter = d => d.slice(0, 7) === `${p.year}-${pad2(p.month)}`
    } else if (scope === 'week') {
      const p = this._distPeriod.week || this._defaultWeek()
      this._distPeriod.week = p
      periodLabel = `${p.year} 年 第${p.week}周`
      const ck = this._sum.lastDay ? isoWeek(new Date(this._sum.lastDay + 'T00:00:00')) : isoWeek(new Date())
      canNext = !(p.year === ck.y && p.week === ck.w)
      const mk = this._sum.firstDay ? isoWeek(new Date(this._sum.firstDay + 'T00:00:00')) : null
      canPrev = !(mk && p.year === mk.y && p.week === mk.w)
      filter = d => {
        const k = isoWeek(new Date(d + 'T00:00:00'))
        return k.y === p.year && k.w === p.week
      }
    }
    // 「全部」范围：显示该阶段的打卡天数（有记录的日子数）
    let totalDays = 0
    if (scope === 'all') totalDays = Object.keys(this._sum.days || {}).length
    const agg = this._aggregate(filter)
    const rank = agg.segs.map(s => ({
      name: s.name,
      initial: (s.name || ' ')[0],
      color: s.color,
      pct: agg.total ? Math.round(s.value / agg.total * 100) : 0,
      valText: checkin.fmtMinutes(s.value)
    }))
    const vm = {
      scope,
      totalDays,
      periodLabel,
      canNext,
      canPrev,
      legend: rank,
      donut: this._donutVM(agg, '累计总投入')
    }
    this._dist = vm   // 供 _renderDist 渲染使用
    return vm
  },

  _defaultMonth() {
    // 默认停在所选阶段最后打卡日所在月（数据停在过去时不落空档）
    const d = this._sum && this._sum.lastDay ? new Date(this._sum.lastDay + 'T00:00:00') : new Date()
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  },


  // ===== 交互 =====

  onDailyPrev() { this._shiftDaily(-1) },
  onDailyNext() { this._shiftDaily(1) },
  _shiftDaily(n) {
    if (!this._sum) return
    const next = addDays(this._dailyDay, n)
    const max = this._sum.lastDay || checkin.todayStr()
    const min = this._sum.firstDay || max
    if (next < min || next > max) return
    this._dailyDay = next
    this.setData({ daily: this._buildDaily(next) })
    this._renderDaily()
  },

  onTrendMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this._trendMode) return
    this._trendMode = mode
    this.setData({ trend: this._buildTrendVM(mode) })
    this._renderTrend()
  },

  onDistScope(e) {
    const scope = e.currentTarget.dataset.scope
    if (!scope || scope === this._distScope) return
    this._distScope = scope
    if (scope === 'week' && !this._distPeriod.week) {
      this._distPeriod.week = this._defaultWeek()
    }
    if (scope === 'year' && !this._distPeriod.year) {
      const years = this._periodYears(this._sum)
      this._distPeriod.year = years[years.length - 1]
    }
    const dist = this._buildDistVM()
    this.setData({ dist })
    this._renderDist()
  },

  onDistPrev() { this._shiftDist(-1) },
  onDistNext() { this._shiftDist(1) },
  _shiftDist(n) {
    if (!this._sum) return
    if (this._distScope === 'year') {
      const years = this._periodYears(this._sum)
      const idx = years.indexOf(this._distPeriod.year)
      const next = years[idx + n]
      if (next === undefined) return
      this._distPeriod.year = next
    } else if (this._distScope === 'week') {
      const p = this._distPeriod.week || this._defaultWeek()
      const m = isoWeekMonday(p.year, p.week)
      m.setDate(m.getDate() + n * 7)
      const k = isoWeek(m)
      // 范围：firstDay 所在周 ~ 最后打卡日所在周（后面没数据的周不可翻）
      const ck = this._sum.lastDay ? isoWeek(new Date(this._sum.lastDay + 'T00:00:00')) : isoWeek(new Date())
      if (k.y > ck.y || (k.y === ck.y && k.w > ck.w)) return
      const min = this._sum.firstDay
      if (min) {
        const mk = isoWeek(new Date(min + 'T00:00:00'))
        if (k.y < mk.y || (k.y === mk.y && k.w < mk.w)) return
      }
      this._distPeriod.week = { year: k.y, week: k.w }
    } else {
      const p = this._distPeriod.month || this._defaultMonth()
      let { year, month } = p
      month += n
      if (month < 1) { month = 12; year -= 1 }
      if (month > 12) { month = 1; year += 1 }
      // 范围：firstDay 所在月 ~ 最后打卡日所在月（后面没数据的月不可翻）
      const last = this._sum.lastDay ? new Date(this._sum.lastDay + 'T00:00:00') : new Date()
      if (year > last.getFullYear() || (year === last.getFullYear() && month > last.getMonth() + 1)) return
      const min = this._sum.firstDay
      if (min) {
        const minY = Number(min.slice(0, 4))
        const minM = Number(min.slice(5, 7))
        if (year < minY || (year === minY && month < minM)) return
      }
      this._distPeriod.month = { year, month }
    }
    const dist = this._buildDistVM()
    this.setData({ dist })
    this._renderDist()
  },

  // 资源 → 颜色映射（iHour 规律）：按资源首次打卡日期从早到晚排序，循环取 PALETTE 色。
  // 只由打卡数据决定，数据不变颜色不变；同日内多个新资源按当日记录顺序。
  // 边界：补打更早日期的记录会让后续资源整体轮换一位（可接受，iHour 原生是创建时写死）
  _buildColorMap() {
    const byDay = this._byDay || {}
    const seen = []
    const seenSet = {}
    Object.keys(byDay).sort().forEach(day => {
      for (const name in byDay[day]) {
        if (!seenSet[name]) { seenSet[name] = true; seen.push(name) }
      }
    })
    const map = {}
    seen.forEach((name, i) => { map[name] = PALETTE[i % PALETTE.length] })
    return map
  },

  // 单资源取色：查映射，查不到（防御）回退第 1 色
  _colorOf(name) {
    return (this._colorMap && this._colorMap[name]) || PALETTE[0]
  },

  // ===== 图表 =====
  // 每日统计环形图 / 趋势堆叠柱：ECharts（定制 utils/echarts，含 pie/bar）
  // 投入分布环形图：ECharts（与每日统计同款）

  _ensureCharts() {
    if (this._chartReady) return
    this._chartReady = true
    this._createChart('chart-daily', (canvas, w, h, dpr) => {
      const chart = echarts.init(canvas, null, { width: w, height: h, devicePixelRatio: dpr })
      canvas.setChart(chart)
      this._dailyChart = chart
      this._renderDaily()
    })
    this._createChart('chart-trend', (canvas, w, h, dpr) => {
      const chart = echarts.init(canvas, null, { width: w, height: h, devicePixelRatio: dpr })
      canvas.setChart(chart)
      this._trendChart = chart
      this._renderTrend()
    })
    this._createChart('chart-dist', (canvas, w, h, dpr) => {
      const chart = echarts.init(canvas, null, { width: w, height: h, devicePixelRatio: dpr })
      canvas.setChart(chart)
      this._distChart = chart
      this._renderDist()
    })
  },

  _disposeCharts() {
    if (this._dailyChart) {
      try { this._dailyChart.dispose() } catch (e) {}
      this._dailyChart = null
    }
    if (this._trendChart) {
      try { this._trendChart.dispose() } catch (e) {}
      this._trendChart = null
    }
    if (this._distChart) {
      try { this._distChart.dispose() } catch (e) {}
      this._distChart = null
    }
    this._chartReady = false
  },

  _createChart(domId, onInit) {
    const query = wx.createSelectorQuery()
    query.select('#' + domId).fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) return
      const canvasNode = res[0].node
      const width = res[0].width
      const height = res[0].height
      const dpr = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).pixelRatio
      const ctx = canvasNode.getContext('2d')
      const canvas = new WxCanvas(ctx, domId, true, canvasNode)
      if (echarts.setPlatformAPI) {
        echarts.setPlatformAPI({ createCanvas: () => canvas })
      } else if (echarts.setCanvasCreator) {
        echarts.setCanvasCreator(() => canvas)
      }
      if (typeof onInit === 'function') onInit(canvas, width, height, dpr)
    })
  },

  // 每日统计环形图（ECharts pie）：无数据画灰环 + 中心「暂无记录」；
  // 中心三行：今日总投入（小）/ 投入数（大粗）/ 单位（小），单位随口径切换（<1h 用分钟）；
  // 图内不显示 label / legend（名字与占比看卡底图例），详情靠触摸 tooltip
  _renderDaily() {
    if (!this._dailyChart || !this._daily) return
    const { segs, total } = this._daily
    const isDark = theme.isDarkNow()
    const tColor = isDark ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.9)'
    const sColor = isDark ? 'rgba(255,255,255,.5)' : '#737373'
    const track = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)'
    let numText = '暂无记录'
    let unitText = ''
    if (total > 0) {
      if (total < 60) { numText = String(total); unitText = '分钟' }
      else {
        const h = total / 60
        numText = String(Number.isInteger(h) ? h : Number(h.toFixed(1)))
        unitText = '小时'
      }
    }
    // 扇区间隙：边框色 = 卡片背景（浅 #fff / 深 #191919），视觉上挖出缝隙；
    // 空环不加（单块整环会被 borderRadius 切出豁口）
    const borderColor = isDark ? '#191919' : '#ffffff'
    const data = segs.length
      ? segs.map(s => ({ name: s.name, value: s.value, itemStyle: { color: s.color, borderColor, borderWidth: 2, borderRadius: 6 } }))
      : [{ name: '', value: 1, itemStyle: { color: track } }]
    this._dailyChart.setOption({
      // 中心三行：以容器垂直中心对称分布——中行中轴对饼心（middle），
      // 上行字底 / 下行字顶分别贴 44% / 56%（关于 50% 对称），与各行字号解耦
      title: [
        {
          text: total > 0 ? '今日总投入' : '',
          left: 'center', top: '42%',
          textVerticalAlign: 'bottom',
          textStyle: { fontSize: 12, color: sColor }
        },
        {
          text: numText,
          left: 'center', top: '50%',
          textVerticalAlign: 'middle',
          textStyle: total > 0
            ? { fontSize: 30, color: sColor }
            : { fontSize: 16, color: sColor }
        },
        {
          text: unitText,
          left: 'center', top: '58%',
          textVerticalAlign: 'top',
          textStyle: { fontSize: 11, color: sColor }
        }
      ],
      tooltip: {
        show: segs.length > 0,
        trigger: 'item',
        confine: true,
        formatter: p => (p.name ? p.marker + `${p.name}：${checkin.fmtMinutes(p.value)}（${p.percent}%）` : '')
      },
      series: [{
        type: 'pie',
        radius: ['48%', '78%'],
        center: ['50%', '50%'],
        // 标签贴画布左右边缘（利用全部横向宽度），防裁剪；重叠的自动隐藏
        label: {
          show: true,
          color: sColor,
          fontSize: 11,
          alignTo: 'edge',
          edgeDistance: 8,
          bleedMargin: 5
        },
        labelLine: {
          show: true,
          length: 12,
          length2: 0,
          maxSurfaceAngle: 80,
          lineStyle: { color: isDark ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.2)' }
        },
        labelLayout: { hideOverlap: true },
        emphasis: { scale: false },
        animationDuration: 200,
        data
      }]
    }, true)
  },

_renderDist() {
    if (!this._distChart || !this._dist) return
    const d = this._dist.donut || {}
    const segs = d.segments || []
    const total = d.total || 0
    const sub = d.sub || ''
    const isDark = theme.isDarkNow()
    const tColor = isDark ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.9)'
    const sColor = isDark ? 'rgba(255,255,255,.5)' : '#737373'
    const track = isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)'
    let numText = '暂无记录'
    let unitText = ''
    if (total > 0) {
      if (total < 60) { numText = String(total); unitText = '分钟' }
      else {
        const h = total / 60
        numText = String(Number.isInteger(h) ? h : Number(h.toFixed(1)))
        unitText = '小时'
      }
    }
    // 扇区间隙：边框色 = 卡片背景（浅 #fff / 深 #191919），视觉上挖出缝隙；
    // 空环不加（单块整环会被 borderRadius 切出豁口）
    const borderColor = isDark ? '#191919' : '#ffffff'
    const data = segs.length
      ? segs.map(s => ({ name: s.name, value: s.value, itemStyle: { color: s.color, borderColor, borderWidth: 2, borderRadius: 6 } }))
      : [{ name: '', value: 1, itemStyle: { color: track } }]
    this._distChart.setOption({
      // 中心三行：以容器垂直中心对称分布——中行中轴对饼心（middle），
      // 上行字底 / 下行字顶分别贴 44% / 56%（关于 50% 对称），与各行字号解耦
      title: [
        {
          text: total > 0 ? sub : '',
          left: 'center', top: '42%',
          textVerticalAlign: 'bottom',
          textStyle: { fontSize: 12, color: sColor }
        },
        {
          text: numText,
          left: 'center', top: '50%',
          textVerticalAlign: 'middle',
          textStyle: total > 0
            ? { fontSize: 30, color: sColor }
            : { fontSize: 16, color: sColor }
        },
        {
          text: unitText,
          left: 'center', top: '58%',
          textVerticalAlign: 'top',
          textStyle: { fontSize: 11, color: sColor }
        }
      ],
      tooltip: {
        show: segs.length > 0,
        trigger: 'item',
        confine: true,
        formatter: p => (p.name ? p.marker + `${p.name}：${checkin.fmtMinutes(p.value)}（${p.percent}%）` : '')
      },
      series: [{
        type: 'pie',
        radius: ['48%', '78%'],
        center: ['50%', '50%'],
        // 标签贴画布左右边缘（利用全部横向宽度），防裁剪；重叠的自动隐藏
        label: {
          show: true,
          color: sColor,
          fontSize: 11,
          alignTo: 'edge',
          edgeDistance: 8,
          bleedMargin: 5
        },
        labelLine: {
          show: true,
          length: 12,
          length2: 0,
          maxSurfaceAngle: 80,
          lineStyle: { color: isDark ? 'rgba(255,255,255,.3)' : 'rgba(0,0,0,.2)' }
        },
        labelLayout: { hideOverlap: true },
        emphasis: { scale: false },
        animationDuration: 200,
        data
      }]
    }, true)
  },

  _renderTrend() {
    if (!this._trendChart || !this._trendData) return
    const isDark = theme.isDarkNow()
    const lineColor = isDark ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.06)'
    const labelColor = isDark ? 'rgba(255,255,255,.5)' : '#8e8e93'
    const borderColor = isDark ? '#191919' : '#ffffff'   // 段间挖空缝 = 卡片背景色
    const { labels, series } = this._trendData
    this._trendChart.setOption({
      grid: { left: 44, right: 14, top: 24, bottom: 26 },
      tooltip: {
        show: true,
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'shadow' },
        formatter: params => {
          if (!params || !params.length) return ''
          const lines = params
            .filter(p => p.value > 0)
            .map(p => p.marker + `${p.seriesName} ${checkin.fmtMinutes(p.value)}`)
          return [params[0].axisValue].concat(lines.length ? lines : ['无记录']).join('\n')
        }
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisTick: { show: false },
        axisLine: { show: false },   // 柱底 border 溢出会打断轴线，直接隐藏（柱列即基线）
        axisLabel: { color: labelColor, fontSize: 10, interval: this._trendMode === 'week' ? 0 : 'auto' }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: labelColor,
          fontSize: 10,
          formatter: v => (v >= 60 ? `${Math.round(v / 60 * 10) / 10}h` : v)
        },
        splitLine: { lineStyle: { color: lineColor } }
      },
      // 堆叠柱圆角：顶端段上圆、底端段下圆、单段柱四角全圆；中间段不加（否则段间露豁口）
      series: series.map((s, si) => ({
        name: s.name,
        type: 'bar',
        stack: 'total',
        barMaxWidth: 22,
        barCategoryGap: '45%',
        data: s.data.map((v, bi) => {
          if (!(v > 0)) return v
          const isTop = !series.some((t, ti) => ti > si && t.data[bi] > 0)
          const isBottom = !series.some((t, ti) => ti < si && t.data[bi] > 0)
          const radius = isTop && isBottom ? 4 : isTop ? [4, 4, 0, 0] : isBottom ? [0, 0, 4, 4] : 0
          return radius
            ? { value: v, itemStyle: { color: s.color, borderRadius: radius, borderColor, borderWidth: 1 } }
            : { value: v, itemStyle: { borderColor, borderWidth: 1 } }
        }),
        itemStyle: { color: s.color, borderColor, borderWidth: 1 }
      }))
    }, true)
  },

  // ===== canvas 触摸转发（原生 canvas 收不到手势，手动 dispatch 给 zrender） =====
  _chartByTouch(e) {
    return e.currentTarget.id === 'chart-daily' ? this._dailyChart : this._trendChart
  },

  _wrapTouch(event) {
    for (let i = 0; i < event.touches.length; ++i) {
      const touch = event.touches[i]
      touch.offsetX = touch.x
      touch.offsetY = touch.y
    }
    return event
  },

  onChartTouchStart(e) {
    const chart = this._chartByTouch(e)
    if (chart && e.touches.length > 0) {
      const touch = e.touches[0]
      const handler = chart.getZr().handler
      handler.dispatch('mousedown', { zrX: touch.x, zrY: touch.y, preventDefault: () => {}, stopImmediatePropagation: () => {}, stopPropagation: () => {} })
      handler.dispatch('mousemove', { zrX: touch.x, zrY: touch.y, preventDefault: () => {}, stopImmediatePropagation: () => {}, stopPropagation: () => {} })
      handler.processGesture(this._wrapTouch(e), 'start')
    }
  },

  onChartTouchMove(e) {
    const chart = this._chartByTouch(e)
    if (chart && e.touches.length > 0) {
      const touch = e.touches[0]
      const handler = chart.getZr().handler
      handler.dispatch('mousemove', { zrX: touch.x, zrY: touch.y, preventDefault: () => {}, stopPropagation: () => {} })
      handler.processGesture(this._wrapTouch(e), 'change')
    }
  },

  onChartTouchEnd(e) {
    const chart = this._chartByTouch(e)
    if (chart) {
      const touch = e.changedTouches ? e.changedTouches[0] : {}
      const handler = chart.getZr().handler
      handler.dispatch('mouseup', { zrX: touch.x, zrY: touch.y, preventDefault: () => {}, stopImmediatePropagation: () => {}, stopPropagation: () => {} })
      handler.dispatch('click', { zrX: touch.x, zrY: touch.y, preventDefault: () => {}, stopPropagation: () => {} })
      handler.processGesture(this._wrapTouch(e), 'end')
    }
  }
})
