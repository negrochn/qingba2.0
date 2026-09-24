const { getRequiredHours, isUpstreamStage } = require('../../utils/data.js')
const checkin = require('../../utils/checkin.js')
const children = require('../../utils/children.js')
const share = require('../../utils/share.js')

Page({
  data: {
    stages: [],
    stageCount: 0,
    currentStageId: '',
    currentStageIndex: -1,
    currentCard: null,
    fontClass: '',
    darkClass: '',
    // 当前孩子 cell（仅多孩显示）
    isMultiChild: false,
    activeChildName: '',
    activeChildSummaryText: '',
    childSheetVisible: false
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    this.loadCurrentStage();
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    // 首页"去打卡"跳转过来时，滚动到当前阶段
    let needScroll = false
    try {
      const app2 = getApp()
      if (app2 && app2.globalData && app2.globalData.scrollToCurrentStage) {
        needScroll = true
        app2.globalData.scrollToCurrentStage = false
      }
    } catch (e) {}

    this.loadCurrentStage(() => {
      if (needScroll) {
        this._scrollToStage(this.data.currentStageIndex)
      }
    })
  },

  // 分享给好友：文案与落地页集中在 utils/share.js
  onShareAppMessage() {
    return share.appMessage('route')
  },

  // 加载当前路线与当前阶段，预计算每阶段状态（unset / done / current / optional / locked）
  loadCurrentStage(cb) {
    this._refreshChild()
    const route = checkin.getCurrentRoute()
    const current = checkin.getCurrentStage();
    let currentIndex = -1
    route.stages.forEach((s, i) => {
      if (current && s.stage_id === current.id) currentIndex = i
    })
    const doneIds = checkin.getCompletedStages()
    const stages = route.stages.map((s, i) => {
      let state
      if (currentIndex < 0) {
        state = 'unset'                    // 尚未选择起点：全部为待选，不置灰也不上锁
      } else if (doneIds.indexOf(s.stage_id) >= 0 ||
                 isUpstreamStage(route.stages, current.id, s.stage_id)) {
        state = 'done'
      } else if (i === currentIndex) {
        state = 'current'
      } else if (s.optional) {
        // 调整支线小段：可选补救路径，不上锁（没走过的用户也能看到并进入）
        state = 'optional'
      } else {
        state = 'locked'
      }
      // meta 行预拼接：大循环部分字段可为空（如调整小段无 target_phase），
      // 硬拼接「a · b · c」会出现「· · 建议90小时」断裂
      const metaText = [s.target_phase, s.vocabulary_target, s.time_investment]
        .filter(v => !!v).join(' · ')
      return Object.assign({}, s, { _state: state, _metaText: metaText })
    })
    // 顶部当前阶段：阶段名 + 进度百分比（与 stage 详情页同口径）
    let currentCard = null
    if (currentIndex >= 0) {
      const s = route.stages[currentIndex]
      // 进度与 stage 详情页完全同口径：按 required.type 决定取阶段自身还是累计时长
      const required = getRequiredHours(s, checkin.getTargetOption(s.stage_id))
      const minutes = required.type === 'accumulated'
        ? checkin.getAccumulatedMinutes(s.stage_id)
        : checkin.getStageMinutes(s.stage_id)
      const hours = minutes / 60
      // 无时长目标的支线（调整小段）：不显示 0% 假进度，wxml 以「—」占位
      const noTarget = !(required.hours > 0)
      const progress = noTarget ? 0 : Math.min(100, Math.floor(hours / required.hours * 100))
      currentCard = {
        name: s.stage_name,
        progress,
        noTarget,
        // 当前生效的分母（默认档位取建议区间上限，可为该阶段单独覆盖），
        // 与上方百分比同源；官方建议区间原文仍显示在下方路线行里，避免「写着 60-80H 却要攒到 80」的困惑
        targetText: required.hours > 0 ? `${required.hours}H` : ''
      }
    }

    this.setData({
      stages,
      stageCount: stages.length,
      currentStageId: current ? current.id : '',
      currentStageIndex: currentIndex,
      currentCard
    }, () => {
      if (typeof cb === 'function') cb()
    })
  },

  // 当前孩子 cell：状态与摘要（累计 N 小时 · 今日 N 次），仅多孩时展示
  _refreshChild() {
    const multi = children.isMultiChild()
    const patch = { isMultiChild: multi }
    if (multi) {
      const active = children.getActiveChild() || {}
      const s = checkin.getChildSummary(active.id)
      const hours = s.minutes / 60
      const hoursText = hours > 0 ? (hours % 1 === 0 ? String(hours) : hours.toFixed(1)) : '0'
      patch.activeChildName = active.name || ''
      patch.activeChildSummaryText = `累计 ${hoursText} 小时 · 今日 ${s.todayCount} 次`
    }
    this.setData(patch)
  },

  // ===== 孩子切换 =====
  openChildSheet() {
    this.setData({ childSheetVisible: true })
  },

  closeChildSheet() {
    this.setData({ childSheetVisible: false })
  },

  // 切换成功：孩子 cell / 当前阶段 / 时间线高亮与锁状态整体按新孩子重建
  onChildChanged() {
    this.loadCurrentStage()
  },

  // 卡片点击：进入阶段详情
  toStage(e) {
    const index = e.currentTarget.dataset.index
    if (index === undefined || index === null) {
      wx.showToast({ title: '数据异常', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/pages/stage/stage?index=${index}`,
      fail(err) {
        console.error('navigateTo fail:', err)
        wx.showToast({ title: '跳转失败', icon: 'none' })
      }
    })
  },

  // 未设置当前阶段：顶部引导跳选择页（选完 navigateBack 回路线页，onShow 自动刷新）
  goStagePicker() {
    wx.navigateTo({ url: '/pages/stagePicker/stagePicker' })
  },

  // 滚动到指定阶段（页面级滚动，元素距顶部留 120px）
  _scrollToStage(index) {
    if (index === undefined || index === null || index < 0) return

    const query = wx.createSelectorQuery().in(this)
    query.select(`#stage-${index}`).boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec(res => {
      const rect = res && res[0]
      const scroll = res && res[1]
      if (!rect || !scroll) return

      const target = scroll.scrollTop + rect.top - 120
      wx.pageScrollTo({
        scrollTop: target > 0 ? target : 0,
        duration: 300
      })
    })
  }
})