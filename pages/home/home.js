const checkin = require('../../utils/checkin.js')
const data = require('../../utils/data.js')

// 首次启动引导用：阶段选项
const stageOptions = data.routeData.stages.map(s => ({ id: s.stage_id, name: s.stage_name }))

// 小时数显示：去尾零（2.50 -> 2.5, 2.00 -> 2）
function fmtHours(minutes) {
  return (minutes / 60).toFixed(2).replace(/\.?0+$/, '') || '0'
}

Page({
  data: {
    // 阶段 Hero 卡
    stageName: '',
    stageDesc: '',          // '目标 phase5 · 200-300词 · 60-80H'
    stageHoursText: '0',    // 阶段已投入小时
    targetHoursText: '',    // 目标下限小时，如 '60'
    stagePercent: 0,        // 0-100
    hasTarget: false,       // 能否解析目标时长
    stageDone: false,       // 已达下限目标
    // 今日状态条
    todayMinutesText: '0m',
    todayCount: 0,
    // 阶段统计 2×2（纯阶段口径）
    stageTotalHours: '0',
    stageReadCount: 0,
    stageWeekHours: '0',
    stageDaysCount: 0,
    // 分组时长分布
    groupBars: [],
    hasGroupData: false,
    // 首次启动引导
    showOnboard: false,
    stageOptions,
    onboardStageIndex: 0,
    fontClass: ''
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    // 数据统一由 onShow 加载，避免首屏重复计算两次
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    this._refresh()

    // 首次启动引导：未引导过时弹出欢迎层
    if (!checkin.hasOnboarded()) {
      const cur = checkin.getCurrentStage()
      let idx = 0
      if (cur) {
        const fi = stageOptions.findIndex(s => s.id === cur.id)
        if (fi >= 0) idx = fi
      }
      this.setData({ showOnboard: true, onboardStageIndex: idx })
    }
  },

  // 引导中选择当前阶段
  onStageChange(e) {
    this.setData({ onboardStageIndex: parseInt(e.detail.value) })
  },

  // 确认首次启动引导：写入阶段与已完成名单
  confirmOnboard() {
    const idx = this.data.onboardStageIndex
    const stage = data.routeData.stages[idx]
    const stageData = {
      id: stage.stage_id,
      name: stage.stage_name,
      targetPhase: stage.target_phase,
      vocabularyTarget: stage.vocabulary_target,
      timeInvestment: stage.time_investment
    }
    checkin.setCurrentStage(stageData)

    // 所选阶段之前的所有阶段标记为已完成
    const done = data.routeData.stages.slice(0, idx).map(s => s.stage_id)
    checkin.setCompletedStages(done)

    checkin.setOnboarded()
    this.setData({ showOnboard: false })
    this._refresh()
  },

  // 关闭首次启动引导并标记已引导
  closeOnboard() {
    checkin.setOnboarded()
    this.setData({ showOnboard: false })
  },

  // 主刷新：全部以「当前阶段」为口径聚合
  _refresh() {
    const curStage = checkin.getCurrentStage()
    const stageId = curStage ? curStage.id : ''
    const stageInfo = (data.routeData.stages || []).find(s => s.stage_id === stageId) || null

    // ---- 阶段全部记录聚合（一次遍历） ----
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday)
    const weekStartStr = checkin.todayStr(monday)
    const today = checkin.todayStr()

    const all = checkin.getAll()
    let stageMinutes = 0
    let weekMinutes = 0
    let todayMinutes = 0
    let todayCount = 0
    const daysSet = new Set()
    const groupMinutes = {}
    const groupLabels = {}

    for (const day in all) {
      for (const r of all[day]) {
        if (r.stageId !== stageId) continue
        const min = r.durationMinutes || 0
        stageMinutes += min
        daysSet.add(day)
        if (day >= weekStartStr) weekMinutes += min
        if (r.groupKey) {
          groupMinutes[r.groupKey] = (groupMinutes[r.groupKey] || 0) + min
          if (!groupLabels[r.groupKey]) groupLabels[r.groupKey] = r.groupLabel || r.groupKey
        }
        if (day === today) {
          todayMinutes += min
          todayCount++
        }
      }
    }

    // ---- Hero：阶段信息 + 进度 ----
    let stageName = curStage ? (curStage.name || '') : ''
    let stageDesc = ''
    if (stageInfo) {
      stageName = stageInfo.stage_name
      stageDesc = `目标 ${stageInfo.target_phase} · ${stageInfo.vocabulary_target} · ${stageInfo.time_investment}`
    }

    const target = this._parseTarget(stageInfo && stageInfo.time_investment)
    let stagePercent = 0
    let hasTarget = false
    let stageDone = false
    let targetHoursText = ''
    if (target) {
      hasTarget = true
      targetHoursText = `${target.min}h`
      const hours = stageMinutes / 60
      stagePercent = Math.min(100, Math.round(hours / target.min * 100))
      stageDone = hours >= target.min
    }
    const stageCompleted = checkin.isStageDone(stageId)

    // ---- 分组时长分布（按时长降序） ----
    const groupKeys = Object.keys(groupMinutes).sort((a, b) => groupMinutes[b] - groupMinutes[a])
    const maxGroupMin = groupKeys.length ? groupMinutes[groupKeys[0]] : 0
    const groupBars = groupKeys.map(key => ({
      key,
      label: groupLabels[key] || key,
      minutesText: checkin.fmtHoursDecimal(groupMinutes[key]),
      percent: maxGroupMin ? Math.max(6, Math.round(groupMinutes[key] / maxGroupMin * 100)) : 0
    }))

    this.setData({
      stageName,
      stageDesc,
      stageHoursText: fmtHours(stageMinutes),
      targetHoursText,
      stagePercent,
      hasTarget,
      stageDone,
      stageCompleted,
      todayMinutesText: checkin.fmtMinutes(todayMinutes),
      todayCount,
      stageTotalHours: fmtHours(stageMinutes),
      stageReadCount: checkin.totalReadCountByStage(stageId),
      stageWeekHours: fmtHours(weekMinutes),
      stageDaysCount: daysSet.size,
      groupBars,
      hasGroupData: groupBars.length > 0
    })
  },

  // 解析目标时长: '60-80H' -> {min:60,max:80}，'60H' -> {min:60,max:60}
  _parseTarget(text) {
    if (!text) return null
    const range = text.match(/(\d+)\s*-\s*(\d+)/)
    if (range) return { min: +range[1], max: +range[2] }
    const single = text.match(/(\d+)/)
    if (single) return { min: +single[1], max: +single[1] }
    return null
  },

  // 阻止弹层内容区点击冒泡关闭
  noop() {},

  // ===== 跳转 =====
  goRoute() {
    // 标记：跳转后路线页需滚动到当前阶段
    try {
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.scrollToCurrentStage = true;
      }
    } catch (e) {}

    wx.switchTab({ url: '/pages/route/route' })
  }
})
