const { routeData, getRequiredHours } = require('../../utils/data.js')
const checkin = require('../../utils/checkin.js')

Page({
  data: {
    stages: routeData.stages,
    stageCount: routeData.stages.length,
    currentStageId: '',
    currentStageIndex: -1,
    currentCard: null,
    fontClass: ''
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

  // 加载当前阶段，预计算每阶段状态（done / current / locked）
  loadCurrentStage(cb) {
    const current = checkin.getCurrentStage();
    let currentIndex = -1
    routeData.stages.forEach((s, i) => {
      if (current && s.stage_id === current.id) currentIndex = i
    })
    const doneIds = checkin.getCompletedStages()
    const stages = routeData.stages.map((s, i) => {
      let state
      if (doneIds.indexOf(s.stage_id) >= 0 || (currentIndex >= 0 && i < currentIndex)) {
        state = 'done'
      } else if (i === currentIndex) {
        state = 'current'
      } else {
        state = 'locked'
      }
      return Object.assign({}, s, { _state: state })
    })
    // 顶部当前阶段：阶段名 + 进度百分比（与 stage 详情页同口径）
    let currentCard = null
    if (currentIndex >= 0) {
      const s = routeData.stages[currentIndex]
      // 进度与 stage 详情页完全同口径：按 required.type 决定取阶段自身还是累计时长
      const required = getRequiredHours(s)
      const minutes = required.type === 'accumulated'
        ? checkin.getAccumulatedMinutes(s.stage_id)
        : checkin.getStageMinutes(s.stage_id)
      const hours = minutes / 60
      const progress = required.hours > 0
        ? Math.min(100, Math.floor(hours / required.hours * 100))
        : 0
      currentCard = {
        name: s.stage_name,
        progress
      }
    }

    this.setData({
      stages,
      currentStageId: current ? current.id : '',
      currentStageIndex: currentIndex,
      currentCard
    }, () => {
      if (typeof cb === 'function') cb()
    })
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