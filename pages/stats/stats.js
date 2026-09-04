const checkin = require('../../utils/checkin.js')
const { routeData } = require('../../utils/data.js')

// 分组配色（彩虹色序：红橙黄绿青蓝靛紫）
const GROUP_COLORS = {
  main_picture_books: '#e74c3c',   // 红
  main_graded_readers: '#e67e22',  // 橙
  main_animations: '#f1c40f',      // 黄
  sub_graded_readers: '#2ecc71',   // 绿
  sub_animations: '#1abc9c',       // 青
  fun_extensions: '#3498db',        // 蓝
  science_extensions: '#9b59b6',   // 靛
  fusion_apps: '#8e44ad',          // 紫
  default: '#888888'
}

Page({
  data: {
    fontClass: '',
    darkClass: '',
    // 阶段选择（仅具体阶段，无"全部阶段"）
    stageOptions: [],
    stageIndex: 0,
    currentStageName: '',
    // 概览
    totalMinutesText: '0h',
    activeDays: 0,
    // 时长分布分段
    distMode: 'group', // 'group' | 'book'
    groupList: [],
    bookList: [],
    // 每月时长
    monthlyList: [],
    // 读完排行
    readList: [],
    readTotal: 0
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    const stages = routeData.stages.map(s => ({ id: s.stage_id, name: s.stage_name }))
    const cur = checkin.getCurrentStage()
    let idx = stages.findIndex(s => s.id === (cur && cur.id))
    if (idx < 0) idx = 0

    this.setData({
      stageOptions: stages,
      stageIndex: idx,
      currentStageName: stages[idx].name
    })
    this._compute(stages[idx].id)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    // 返回时刷新当前阶段数据
    const opt = this.data.stageOptions[this.data.stageIndex]
    if (opt) this._compute(opt.id)
  },

  // 阶段切换
  onStagePick(e) {
    const idx = Number(e.detail.value)
    const opt = this.data.stageOptions[idx]
    if (!opt) return
    this.setData({ stageIndex: idx, currentStageName: opt.name })
    this._compute(opt.id)
  },

  // 时长分布：按分组 / 按绘本 切换
  onDistModeChange(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.distMode) return
    this.setData({ distMode: mode })
  },

  // 聚合统计（页面端一次遍历，按选中阶段过滤）
  _compute(stageId) {
    const all = checkin.getAll()
    const groupMinutes = {}
    const bookMinutes = {}
    const monthly = {}
    const labelMap = {}
    const days = new Set()
    let total = 0

    for (const day in all) {
      for (const r of all[day]) {
        if (stageId && r.stageId !== stageId) continue
        const m = Number(r.durationMinutes) || 0
        total += m
        days.add(day)
        if (r.groupKey) labelMap[r.groupKey] = r.groupLabel
        groupMinutes[r.groupKey] = (groupMinutes[r.groupKey] || 0) + m
        const bk = bookMinutes[r.resourceName] || { groupKey: r.groupKey, min: 0 }
        bk.min += m
        bookMinutes[r.resourceName] = bk
        const ym = day.substring(0, 7)
        monthly[ym] = (monthly[ym] || 0) + m
      }
    }

    // 按分组
    let groupList = Object.keys(groupMinutes).map(k => ({
      groupKey: k,
      groupLabel: labelMap[k] || k,
      color: GROUP_COLORS[k] || GROUP_COLORS.default,
      minutes: groupMinutes[k]
    }))
    groupList.sort((a, b) => b.minutes - a.minutes)
    const maxGroup = groupList.length ? groupList[0].minutes : 0
    groupList = groupList.map(g => ({
      ...g,
      minutesText: checkin.fmtHoursDecimal(g.minutes),
      ratio: maxGroup ? Math.max(6, Math.round(g.minutes / maxGroup * 100)) : 0
    }))

    // 按绘本（资源）
    let bookList = Object.keys(bookMinutes).map(k => ({
      resourceName: k,
      groupKey: bookMinutes[k].groupKey,
      groupLabel: labelMap[bookMinutes[k].groupKey] || '',
      color: GROUP_COLORS[bookMinutes[k].groupKey] || GROUP_COLORS.default,
      minutes: bookMinutes[k].min
    }))
    bookList.sort((a, b) => b.minutes - a.minutes)
    const maxBook = bookList.length ? bookList[0].minutes : 0
    bookList = bookList.map(b => ({
      ...b,
      minutesText: checkin.fmtHoursDecimal(b.minutes),
      ratio: maxBook ? Math.max(6, Math.round(b.minutes / maxBook * 100)) : 0
    }))

    // 每月时长（仅含打卡月份，按 ym 升序）
    let monthlyList = Object.keys(monthly).map(k => ({ ym: k, minutes: monthly[k] }))
    monthlyList.sort((a, b) => (a.ym < b.ym ? -1 : 1))
    let mMax = 0
    monthlyList.forEach(m => { if (m.minutes > mMax) mMax = m.minutes })
    monthlyList = monthlyList.map(m => ({
      ym: m.ym,
      monthText: parseInt(m.ym.substring(5), 10) + '月',
      minutesText: checkin.fmtHoursDecimal(m.minutes),
      ratio: mMax ? Math.max(8, Math.round(m.minutes / mMax * 100)) : 0,
      color: '#00c25f'
    }))

    // 读完排行
    const readList = checkin.getReadRankingByStage(stageId).map(r => ({
      ...r,
      color: GROUP_COLORS[r.groupKey] || GROUP_COLORS.default
    }))
    let readTotal = 0
    readList.forEach(r => { readTotal += r.count })

    this.setData({
      totalMinutesText: checkin.fmtHoursDecimal(total),
      activeDays: days.size,
      groupList,
      bookList,
      monthlyList,
      readList,
      readTotal
    })
  }
})
