// 阶段统计详情（累计视图）：核心时长 + 打卡时长分布 + 汇总 + 打卡最久排行
const checkin = require('../../utils/checkin.js')
const { routeData } = require('../../utils/data.js')
const theme = require('../../utils/theme.js')
const echarts = require('../../utils/echarts')
const WxCanvas = require('../../utils/wx-canvas')

// ===== 日期工具 =====
function pad(n) { return String(n).padStart(2, '0') }
function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }
function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function toDayStr(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function parseDay(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
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
const DIM_PERIOD_WORD = { week: '本周', month: '本月', year: '本年', all: '累计' }

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
      const m = Number(r.durationMinutes) || 0
      countTotal += 1
      totalMinutes += m
      uniqueDays.add(dayStr)
      dayMap[dayStr] = (dayMap[dayStr] || 0) + m
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
    highlightText = `${scope}打卡最久 · ${checkin.fmtMinutes(maxVal)}`
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
        if (r && r.stageId === stageId) prevTotal += Number(r.durationMinutes) || 0
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
  const periodWord = DIM_PERIOD_WORD[dimension]

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

  return {
    periodLabel: getPeriodLabel(dimension, cursor),
    chartLabels,
    chartVals,
    ringData,
    headSegs,
    dailyValue: daily.value,
    dailyUnit: daily.unit,
    deltaText,
    isEmpty,
    emptyText: `${periodWord}尚未打卡`,
    chart,
    peakText,
    highlightText,
    summary,
    firstDayStr,
    lastDayStr
  }
}

Page({
  data: {
    fontClass: '',
    darkClass: '',
    stage: null,
    dimension: 'all',
    periodLabel: '',
    canNext: false,
    headSegs: [],
    dateRangeText: '',
    stageDays: 0,
    stageName: '',
    deltaText: '',
    isEmpty: false,
    emptyText: '',
    chart: [],
    peakText: '',
    highlightText: '',
    summary: [],
    chartLabels: [],
    chartVals: [],
    ringData: []
  },

  onLoad(query) {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })

    const id = query && query.id
    const stage = (routeData.stages || []).find(s => s.stage_id === id) || null
    if (stage) wx.setNavigationBarTitle({ title: stage.stage_name + ' 统计' })

    this._dimension = 'all'
    this.setData({ stage })
    this._recompute()
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })
    // 数据可能在其它页变更，每次展示重算
    if (this.data.stage) this._recompute()
  },

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
      emptyText: vm.emptyText,
      chart: vm.chart,
      peakText: vm.peakText,
      highlightText: vm.highlightText,
      summary: vm.summary,
      chartLabels: vm.chartLabels,
      chartVals: vm.chartVals,
      ringData: vm.ringData
    })
    this._chartLabels = vm.chartLabels
    this._chartVals = vm.chartVals
    this._ringData = vm.ringData
    if (this._chartReady) {
      this._renderBar()
      this._renderRing()
    }
  },

  onReady() {
    // 关闭 progressive（小程序 drawImage 不支持 DOM 参数）
    echarts.registerPreprocessor(opt => {
      if (opt && opt.series) {
        const arr = Array.isArray(opt.series) ? opt.series : [opt.series]
        arr.forEach(s => { s.progressive = 0 })
      }
    })
    this._initCharts()
  },

  _initCharts() {
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
    this._chartReady = true
  },

  _createChart(domId, onInit) {
    const query = wx.createSelectorQuery()
    query.select('#' + domId).fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) return
      const canvasNode = res[0].node
      const width = res[0].width
      const height = res[0].height
      const dpr = wx.getSystemInfoSync().pixelRatio
      const ctx = canvasNode.getContext('2d')
      const canvas = new WxCanvas(ctx, domId, true, canvasNode)
      if (echarts.setPlatformAPI) {
        echarts.setPlatformAPI({ createCanvas: () => canvas })
      } else {
        echarts.setCanvasCreator(() => canvas)
      }
      if (typeof onInit === 'function') onInit(canvas, width, height, dpr)
    })
  },

  _renderBar() {
    if (!this._barChart || !this._chartLabels) return
    const isDark = /dark/.test(this.data.darkClass || '')
    const lineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)'
    const barColor = isDark ? 'rgba(7,193,96,0.55)' : 'rgba(7,193,96,0.4)'
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

  // 分组时长（横向柱状图）
  _renderRing() {
    if (!this._ringChart || !this._ringData || !this._ringData.length) return
    const isDark = /dark/.test(this.data.darkClass || '')
    const textColor = isDark ? 'rgba(255,255,255,0.85)' : '#1a1a1a'
    const subTextColor = isDark ? 'rgba(255,255,255,0.5)' : '#737373'
    const barColor = isDark ? 'rgba(7,193,96,0.55)' : 'rgba(7,193,96,0.4)'
    const total = this._ringData.reduce((s, x) => s + x.value, 0)
    const option = {
      grid: { left: 72, right: 56, top: 8, bottom: 8 },
      tooltip: {
        show: true,
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'shadow' },
        backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
        borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: textColor, fontSize: 12 },
        formatter: params => {
          const p = params && params[0]
          if (!p) return ''
          const pct = total > 0 ? Math.round(p.value / total * 100) : 0
          return `${p.name}\n${checkin.fmtMinutes(p.value)} · ${pct}%`
        }
      },
      xAxis: {
        type: 'value',
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: this._ringData.map(d => d.name),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: subTextColor, fontSize: 11 }
      },
      series: [{
        type: 'bar',
        data: this._ringData.map(d => d.value),
        barMaxWidth: 18,
        itemStyle: { color: barColor, borderRadius: [0, 9, 9, 0] },
        label: {
          show: true,
          position: 'right',
          color: subTextColor,
          fontSize: 11,
          formatter: p => checkin.fmtMinutes(p.value)
        }
      }]
    }
    this._ringChart.setOption(option)
  },

  _chartByTouch(e) {
    return e.currentTarget.dataset.chart === 'ring' ? this._ringChart : this._barChart
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
