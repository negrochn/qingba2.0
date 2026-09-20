// 数据统计（累计视图）：顶部阶段选择器 + 核心时长 / 打卡时长分布 / 分组对比 / 排行榜
// 原「阶段统计详情」页已合并到本页，用顶部选择器切换阶段（参考打卡记录页的月份选择器）
const checkin = require('../../utils/checkin.js')
const { routeData } = require('../../utils/data.js')
const resources = require('../../utils/resources.js')
const theme = require('../../utils/theme.js')
const echarts = require('../../utils/echarts')
const WxCanvas = require('../../utils/wx-canvas')
const share = require('../../utils/share.js')

// ===== 日期工具 =====
function pad(n) { return String(n).padStart(2, '0') }
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function toDayStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
// 注意：此处不用数组解构（const [y,m,d] = ...）——
// 增强编译会为解构生成 @swc/runtime/_array_with_holes 依赖，部分开发者工具版本解析不到该模块而报错
function parseDay(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]) }
function toYm(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }
function fmtDateCN(d) { return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` }

// 以周一为一周起点
function weekStartMonday(d) {
  const x = startOfDay(d)
  const day = x.getDay() // 0=周日..6=周六
  const diff = day === 0 ? -6 : 1 - day
  return addDays(x, diff)
}

// 某维度在当前 cursor 下的时间范围（all 返回 null）
function getPeriod(dimension, cursor) {
  if (dimension === 'week') {
    const s = weekStartMonday(cursor)
    return { start: s, end: addDays(s, 6) }
  }
  if (dimension === 'month') {
    return { start: new Date(cursor.getFullYear(), cursor.getMonth(), 1), end: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0) }
  }
  if (dimension === 'year') {
    return { start: new Date(cursor.getFullYear(), 0, 1), end: new Date(cursor.getFullYear(), 11, 31) }
  }
  return null
}

// 上一周期范围（用于环比）
function getPrevRange(dimension, cursor) {
  if (dimension === 'week') {
    const s = addDays(weekStartMonday(cursor), -7)
    return { start: s, end: addDays(s, 6) }
  }
  if (dimension === 'month') {
    const y = cursor.getFullYear(), m = cursor.getMonth()
    return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) }
  }
  if (dimension === 'year') {
    const y = cursor.getFullYear() - 1
    return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) }
  }
  return null
}

// 当前 cursor 是否落在「最新周期」（用于禁用「下一周期」）
function isCurrentPeriod(dimension, cursor, today) {
  if (dimension === 'week') return weekStartMonday(cursor).getTime() === weekStartMonday(today).getTime()
  if (dimension === 'month') return toYm(cursor) === toYm(today)
  if (dimension === 'year') return cursor.getFullYear() === today.getFullYear()
  return false
}

function getPeriodLabel(dimension, cursor) {
  if (dimension === 'all') return '累计统计'
  if (dimension === 'week') {
    const s = weekStartMonday(cursor)
    const e = addDays(s, 6)
    return `${s.getMonth() + 1}月${s.getDate()}日-${e.getDate()}日`
  }
  if (dimension === 'month') return `${cursor.getMonth() + 1}月`
  if (dimension === 'year') return `${cursor.getFullYear()}年`
  return ''
}

const DIM_PREV_LABEL = { week: '上周', month: '上月', year: '上年' }

// 分钟 -> 头部数值/单位拆分（与全站 fmtMinutes 约定一致，用 m/h）
function splitDuration(min) {
  const m = Math.round(Number(min) || 0)
  if (m >= 60) return { value: (m / 60).toFixed(1), unit: 'h' }
  return { value: String(m), unit: 'm' }
}

// 累计时长 -> [{num, unit}] 形如 [{num:'2',unit:'小时'},{num:'30',unit:'分钟'}]
function splitCumulative(min) {
  const m = Math.round(Number(min) || 0)
  const h = Math.floor(m / 60)
  const mm = m % 60
  const segs = []
  if (h > 0) segs.push({ num: String(h), unit: '小时' })
  segs.push({ num: String(mm), unit: '分钟' })
  return segs
}

// 核心聚合：返回视图模型所需全部字段（仅累计维度）
function buildViewModel(stageId, dimension, cursor) {
  const all = checkin.getAll()
  const period = getPeriod(dimension, cursor)

  const dayMap = {}        // dayStr -> 分钟
  const resTotal = {}      // 资源名（绘本）-> 累计分钟
  const groupTotal = {}    // groupKey -> 累计分钟
  const groupLabelMap = {} // groupKey -> groupLabel
  let totalMinutes = 0
  let countTotal = 0
  const uniqueDays = new Set()

  for (const dayStr in all) {
    const dayDate = parseDay(dayStr)
    if (period && (dayDate < period.start || dayDate > period.end)) continue
    const list = all[dayStr]
    if (!Array.isArray(list)) continue
    for (const r of list) {
      if (!r || r.stageId !== stageId) continue
      // 熏听分组按 factor 折算后的有效时长（其余分组 factor 为 1，结果同原值）
      const m = checkin.effectiveMinutes(r)
      countTotal += 1
      totalMinutes += m
      uniqueDays.add(dayStr)
      dayMap[dayStr] = (dayMap[dayStr] || 0) + m
      resTotal[r.resourceName] = (resTotal[r.resourceName] || 0) + m
      // 分组聚合（打卡记录自带 groupKey / groupLabel）
      const gKey = r.groupKey || r.groupLabel || '未分组'
      groupTotal[gKey] = (groupTotal[gKey] || 0) + m
      if (!groupLabelMap[gKey]) groupLabelMap[gKey] = r.groupLabel || gKey
    }
  }

  // 月度聚合（年 / 全部维度用）
  const monthMap = {}
  for (const dayStr in dayMap) {
    const ym = dayStr.substring(0, 7)
    monthMap[ym] = (monthMap[ym] || 0) + dayMap[dayStr]
  }

  // 柱状图分桶
  const chartLabels = []
  const chartVals = []
  if (dimension === 'week') {
    const wd = ['一', '二', '三', '四', '五', '六', '日']
    const start = weekStartMonday(cursor)
    for (let i = 0; i < 7; i++) {
      const key = toDayStr(addDays(start, i))
      chartLabels.push(wd[i])
      chartVals.push(dayMap[key] || 0)
    }
  } else if (dimension === 'month') {
    const y = cursor.getFullYear(), m = cursor.getMonth()
    const days = new Date(y, m + 1, 0).getDate()
    for (let i = 1; i <= days; i++) {
      chartLabels.push(String(i))
      chartVals.push(dayMap[`${y}-${pad(m + 1)}-${pad(i)}`] || 0)
    }
  } else if (dimension === 'year') {
    const y = cursor.getFullYear()
    for (let i = 1; i <= 12; i++) {
      chartLabels.push(String(i))
      chartVals.push(monthMap[`${y}-${pad(i)}`] || 0)
    }
  } else { // all
    const months = Object.keys(monthMap).sort()
    for (const ym of months) {
      const mm = parseInt(ym.split('-')[1], 10)
      chartLabels.push(`${mm}月`)
      chartVals.push(monthMap[ym])
    }
  }

  const maxVal = chartVals.length ? Math.max.apply(null, chartVals) : 0
  const chart = chartLabels.map((label, i) => ({
    label,
    percent: maxVal > 0 ? Math.round(chartVals[i] / maxVal * 100) : 0,
    k: `${dimension}-${i}-${label}`
  }))
  const topIdx = maxVal > 0 ? chartVals.indexOf(maxVal) : -1

  // 峰值高亮文案
  let highlightText = ''
  if (topIdx >= 0 && maxVal > 0) {
    const lbl = chartLabels[topIdx]
    let scope
    if (dimension === 'week') scope = `周${lbl}`
    else if (dimension === 'month') scope = `${cursor.getMonth() + 1}月${lbl}日`
    else if (dimension === 'year') scope = `${lbl}月`
    else scope = lbl
    highlightText = `${scope}打卡最久 · ${checkin.fmtMinutesCN(maxVal)}`
  }
  const peakText = maxVal > 0 ? `峰值 ${checkin.fmtMinutes(maxVal)}` : ''

  // 周期天数 & 日均
  let periodDays
  if (dimension === 'week') periodDays = 7
  else if (dimension === 'month') periodDays = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  else if (dimension === 'year') {
    const y = cursor.getFullYear()
    periodDays = ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365
  } else {
    periodDays = uniqueDays.size || 1
  }
  const dailyAvg = totalMinutes / periodDays

  // 环比（全部维度不显示）
  let deltaText = ''
  if (dimension !== 'all') {
    const prev = getPrevRange(dimension, cursor)
    let prevTotal = 0
    for (const dayStr in all) {
      const dd = parseDay(dayStr)
      if (dd < prev.start || dd > prev.end) continue
      const list = all[dayStr]
      if (!Array.isArray(list)) continue
      for (const r of list) {
        if (r && r.stageId === stageId) prevTotal += checkin.effectiveMinutes(r)
      }
    }
    const prevLabel = DIM_PREV_LABEL[dimension]
    if (prevTotal > 0) {
      const pct = Math.round((totalMinutes - prevTotal) / prevTotal * 100)
      if (pct > 0) deltaText = `比${prevLabel} ↑${pct}%`
      else if (pct < 0) deltaText = `比${prevLabel} ↓${-pct}%`
      else deltaText = `与${prevLabel}持平`
    } else if (totalMinutes > 0) {
      deltaText = `比${prevLabel} +`
    }
  }

  // 汇总指标（读完次数为阶段累计，不受周期限制）
  const readCount = checkin.totalReadCountByStage(stageId)
  const summary = [
    { prefix: '打卡', value: countTotal, unit: '次' },
    { prefix: '打卡', value: uniqueDays.size, unit: '天' },
    { prefix: '读完', value: readCount, unit: '次' }
  ]

  const headSegs = splitCumulative(totalMinutes)
  const daily = splitDuration(dailyAvg)
  const isEmpty = countTotal === 0

  // 阶段实际跨度（基于首次打卡日 -> 最后打卡日）
  let firstDayStr = null, lastDayStr = null
  for (const d in dayMap) {
    if (!firstDayStr || d < firstDayStr) firstDayStr = d
    if (!lastDayStr || d > lastDayStr) lastDayStr = d
  }

  // 环形图数据：各分组累计分钟占比（按 groupKey 聚合，展示 groupLabel）
  const ringData = Object.keys(groupTotal)
    .map(key => ({ key, name: groupLabelMap[key] || key, value: groupTotal[key] }))
    .sort((a, b) => b.value - a.value)

  // 时长排行榜：该阶段所有素材累计时长（降序）
  // 占比分母为统计维度内的累计总时长（与 totalMinutes 同循环同过滤，天然同口径），各行相加为 100%
  const bookArr = Object.keys(resTotal)
    .map(name => ({ name, value: resTotal[name] }))
    // 有效时长为 0 的资源不进榜（如常规1/2 的熏听：可记录但不计入），否则会显示「0分钟」
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)
  const rankList = bookArr.map(r => ({
    name: r.name,
    char: (r.name || '').trim().charAt(0) || '📖',
    percent: totalMinutes > 0 ? Math.round(r.value / totalMinutes * 100) : 0,
    durationText: checkin.fmtMinutesCN(r.value)
  }))

  // 读完排行榜：该阶段各素材累计读完次数（降序）
  // 占比分母同为该阶段累计读完次数（与时长排行榜同口径），各行相加为 100%
  const readRanking = checkin.getReadRankingByStage(stageId)
  const readRankList = readRanking.map(r => ({
    name: r.resourceName,
    char: (r.resourceName || '').trim().charAt(0) || '📖',
    percent: readCount > 0 ? Math.round(r.count / readCount * 100) : 0,
    countText: `${r.count}次`
  }))

  return {
    periodLabel: getPeriodLabel(dimension, cursor),
    chartLabels,
    chartVals,
    ringData,
    rankList,
    readRankList,
    headSegs,
    dailyValue: daily.value,
    dailyUnit: daily.unit,
    deltaText,
    isEmpty,
    chart,
    peakText,
    highlightText,
    summary,
    firstDayStr,
    lastDayStr
  }
}

// 默认选中阶段：当前阶段 → 第一个有打卡数据的阶段 → 第一个阶段
function pickDefaultStageIndex(stageOptions) {
  const cur = checkin.getCurrentStage()
  if (cur) {
    const i = stageOptions.findIndex(s => s.stage_id === cur.id)
    if (i >= 0) return i
  }
  const all = checkin.getAll()
  const hasData = {}
  for (const day in all) {
    const list = all[day]
    if (!Array.isArray(list)) continue
    for (const r of list) {
      if (r && r.stageId) hasData[r.stageId] = true
    }
  }
  const j = stageOptions.findIndex(s => hasData[s.stage_id])
  return j >= 0 ? j : 0
}

// ECharts 全局预处理只需注册一次
let _echartsPrepared = false
function prepareEcharts() {
  if (_echartsPrepared) return
  _echartsPrepared = true
  // 关闭 progressive（小程序 drawImage 不支持 DOM 参数）
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
    // 阶段选择器（原生 picker：mode="selector"）
    stageOptions: [],    // [{ stage_id, stage_name }]
    stageNames: [],      // picker 的 range（阶段名）
    stageIndex: 0,       // picker 的选中下标
    curStageId: '',
    // 当前阶段详情
    stage: null,
    stageName: '',
    dimension: 'all',
    periodLabel: '',
    canNext: false,
    headSegs: [],
    dateRangeText: '',
    stageDays: 0,
    deltaText: '',
    isEmpty: false,
    chart: [],
    peakText: '',
    highlightText: '',
    summary: [],
    chartLabels: [],
    chartVals: [],
    ringData: [],
    rankList: [],
    readRankList: []
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })

    const stageOptions = (routeData.stages || []).map(s => ({
      stage_id: s.stage_id,
      stage_name: s.stage_name
    }))
    const idx = stageOptions.length ? pickDefaultStageIndex(stageOptions) : -1
    this.setData({
      stageOptions,
      stageNames: stageOptions.map(s => s.stage_name),
      stageIndex: idx >= 0 ? idx : 0
    })
    if (idx >= 0) this._applyStageIndex(idx)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })
    // 数据可能在其它页变更，每次展示重算
    if (this.data.stage) this._recompute()
  },

  // 分享给好友
  onShareAppMessage() {
    return share.appMessage('stats')
  },

  onReady() {
    this._pageReady = true
    prepareEcharts()
    this._ensureCharts()
  },

  // 离开页面销毁 echarts / canvas 实例：canvas 节点随页面销毁，但实例引用不会自动释放，
  // 反复进出会持续累积（此前整个项目没有任何页面做卸载清理）
  onUnload() {
    this._disposeCharts()
  },

  // ===== 阶段选择（原生 picker：mode="selector"，与补录 / 编辑页同款） =====
  // 用系统滚轮替代自绘弹层：canvas 是原生组件、层级恒在普通视图之上，原实现必须
  // 「打开弹层前 dispose 图表 + 用 wx:if 把 canvas 摘掉 + 用 CSS 骨架顶替」；
  // 系统弹层天然在 canvas 之上，这套规避逻辑连同骨架一起删掉了
  onStageChange(e) {
    const idx = Number(e.detail.value)
    if (!(this.data.stageOptions || [])[idx]) return
    this.setData({ stageIndex: idx })
    this._applyStageIndex(idx)
  },

  _applyStageIndex(idx) {
    const opt = this.data.stageOptions[idx]
    if (!opt) return
    const stage = (routeData.stages || []).find(s => s.stage_id === opt.stage_id) || null
    if (!stage) return
    this.setData({
      stage,
      curStageId: stage.stage_id,
      stageName: stage.stage_name,
      stageIndex: idx
    })
    this._recompute()
  },

  // ===== 数据聚合 =====
  _recompute() {
    const stage = this.data.stage
    if (!stage) return
    const vm = buildViewModel(stage.stage_id, 'all', new Date())

    // 阶段跨度：首次打卡日 -> 最后打卡日，历时天数（含首尾）
    let dateRangeText = ''
    let stageDays = 0
    if (vm.firstDayStr && vm.lastDayStr) {
      const start = parseDay(vm.firstDayStr)
      const end = parseDay(vm.lastDayStr)
      dateRangeText = `${fmtDateCN(start)}至${fmtDateCN(end)}`
      stageDays = Math.round((end - start) / 86400000) + 1
    }

    this._chartLabels = vm.chartLabels
    this._chartVals = vm.chartVals
    this._ringData = vm.ringData

    this.setData({
      dimension: 'all',
      periodLabel: vm.periodLabel,
      canNext: false,
      headSegs: vm.headSegs,
      dateRangeText,
      stageDays,
      stageName: stage.stage_name,
      deltaText: vm.deltaText,
      isEmpty: vm.isEmpty,
      peakText: vm.peakText,
      highlightText: vm.highlightText,
      summary: vm.summary,
      chartLabels: vm.chartLabels,
      chartVals: vm.chartVals,
      ringData: vm.ringData,
      rankList: vm.rankList,
      readRankList: vm.readRankList
    }, () => {
      // 首次渲染由 onReady 统一初始化图表
      if (!this._pageReady) return
      if (this.data.isEmpty) {
        // 空态下 canvas 不在 DOM 里，销毁实例，避免切回来时指向已失效的节点
        this._disposeCharts()
      } else {
        this._ensureCharts()
        if (this._barChart) this._renderBar()
        if (this._ringChart) this._renderRing()
      }
    })
  },

  // ===== 图表 =====
  _ensureCharts() {
    if (this._chartReady || this.data.isEmpty || !this.data.stage) return
    this._chartReady = true
    this._createChart('chart-bar', (canvas, w, h, dpr) => {
      const chart = echarts.init(canvas, null, { width: w, height: h, devicePixelRatio: dpr })
      canvas.setChart(chart)
      this._barChart = chart
      this._renderBar()
    })
    this._createChart('chart-ring', (canvas, w, h, dpr) => {
      const chart = echarts.init(canvas, null, { width: w, height: h, devicePixelRatio: dpr })
      canvas.setChart(chart)
      this._ringChart = chart
      this._renderRing()
    })
  },

  _disposeCharts() {
    if (this._barChart) {
      try { this._barChart.dispose() } catch (e) {}
      this._barChart = null
    }
    if (this._ringChart) {
      try { this._ringChart.dispose() } catch (e) {}
      this._ringChart = null
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

  _renderBar() {
    if (!this._barChart || !this._chartLabels) return
    const isDark = theme.isDarkNow()   // canvas 走不了 CSS 媒体查询，需含「跟随系统」的真实深色
    const lineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'
    const barColor = 'rgba(7,193,96,.14)'
    const option = {
      grid: { left: 40, right: 14, top: 24, bottom: 28 },
      tooltip: {
        show: true,
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'shadow' },
        formatter: params => {
          const p = params && params[0]
          return p ? `${p.axisValue}: ${checkin.fmtMinutes(p.value)}` : ''
        }
      },
      xAxis: {
        type: 'category',
        data: this._chartLabels,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: lineColor } },
        axisLabel: { color: '#8e8e93', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#8e8e93', fontSize: 10 },
        splitLine: { lineStyle: { color: lineColor } }
      },
      series: [{
        type: 'bar',
        data: this._chartVals,
        barMaxWidth: 24,
        itemStyle: { color: barColor, borderRadius: [4, 4, 0, 0] }
      }]
    }
    this._barChart.setOption(option)
  },

  // 雷达图的分组轴集合：当前阶段显示的分组 ∪ 记录里出现过的分组
  // - 前者让轴数「按阶段动态」（熏听开关关闭时该轴不出现）
  // - 后者兜住官方分组调整后的历史数据：那部分时长仍写在记录里，
  //   若只按当前分组取轴，会「有数据但没轴」而画不出来
  _ringAxisKeys() {
    const stageId = this.data.curStageId
    const keys = stageId ? resources.getStageGroupKeys(stageId).slice() : []
    ;(this._ringData || []).forEach(d => {
      if (d && d.key && keys.indexOf(d.key) < 0) keys.push(d.key)
    })
    return keys
  },

  // 各分组时长值：按 _ringAxisKeys 顺序取，无数据的轴保留为 0
  _ringValues() {
    const valByKey = {}
    ;(this._ringData || []).forEach(d => { valByKey[d.key] = d.value })
    return this._ringAxisKeys().map(k => valByKey[k] || 0)
  },

  // 分组时长对比（雷达图）
  _renderRing() {
    if (!this._ringData) return
    const axisKeys = this._ringAxisKeys()
    // 3 轴以下画不出雷达形状，直接不画（避免 ECharts 报错）
    if (axisKeys.length < 3) return
    const vals = this._ringValues()
    if (!this._ringChart) return
    const isDark = theme.isDarkNow()   // canvas 走不了 CSS 媒体查询，需含「跟随系统」的真实深色
    const subTextColor = isDark ? 'rgba(255,255,255,0.5)' : '#737373'
    const splitColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'
    const maxVal = Math.max.apply(null, vals) || 1
    const option = {
      radar: {
        center: ['50%', '54%'],
        radius: '62%',
        indicator: axisKeys.map(k => ({ name: resources.getGroupLabel(k), max: maxVal })),
        axisName: { color: subTextColor, fontSize: 12 },
        splitLine: { lineStyle: { color: splitColor } },
        axisLine: { lineStyle: { color: splitColor } },
        splitArea: { show: false }
      },
      series: [{
        type: 'radar',
        symbol: 'circle',
        symbolSize: 4,
        data: [{
          value: vals,
          name: '分组时长',
          areaStyle: { color: 'rgba(7,193,96,.14)' },
          lineStyle: { color: 'rgba(7,193,96,.14)', width: 2 },
          itemStyle: { color: 'rgba(7,193,96,.14)' }
        }]
      }]
    }
    // 轴数变化时必须 notMerge：ECharts 对 indicator 数组是按下标合并的，
    // 轴数变少时会残留旧轴 / 标签错位（切阶段、开关熏听都会改变轴数）
    const axisChanged = this._ringAxisCount !== axisKeys.length
    this._ringAxisCount = axisKeys.length
    this._ringChart.setOption(option, axisChanged)
  },

  _chartByTouch(e) {
    return e.currentTarget.dataset.chart === 'bar' ? this._barChart : null
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
      handler.dispatch('mousemove', { zrX: touch.x, zrY: touch.y, preventDefault: () => {}, stopImmediatePropagation: () => {}, stopPropagation: () => {} })
      handler.processGesture(this._wrapTouch(e), 'change')
    }
  },

  onChartTouchEnd(e) {
    const chart = this._chartByTouch(e)
    if (chart) {
      const touch = e.changedTouches ? e.changedTouches[0] : {}
      const handler = chart.getZr().handler
      handler.dispatch('mouseup', { zrX: touch.x, zrY: touch.y, preventDefault: () => {}, stopImmediatePropagation: () => {}, stopPropagation: () => {} })
      handler.dispatch('click', { zrX: touch.x, zrY: touch.y, preventDefault: () => {}, stopImmediatePropagation: () => {}, stopPropagation: () => {} })
      handler.processGesture(this._wrapTouch(e), 'end')
    }
  }
})
