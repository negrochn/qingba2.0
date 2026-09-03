const { routeData } = require('../../utils/data.js')
const checkin = require('../../utils/checkin.js')

Page({
  data: {
    stages: routeData.stages,
    stageCount: routeData.stages.length,
    currentStageId: '',
    currentStageIndex: -1,
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
      const app = getApp()
      if (app && app.globalData && app.globalData.scrollToCurrentStage) {
        needScroll = true
        app.globalData.scrollToCurrentStage = false
      }
    } catch (e) {}

    this.loadCurrentStage(() => {
      if (needScroll) {
        this._scrollToStage(this.data.currentStageIndex)
      }
    })
  },

  // 加载当前阶段
  loadCurrentStage(cb) {
    const current = checkin.getCurrentStage();
    let currentIndex = -1
    routeData.stages.forEach((s, i) => {
      if (current && s.stage_id === current.id) currentIndex = i
    })
    const doneIds = checkin.getCompletedStages()
    // 预计算每阶段状态：done（已完成）/ current（当前）/ locked（未解锁）
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
    this.setData({
      stages,
      currentStageId: current ? current.id : '',
      currentStageIndex: currentIndex
    }, () => {
      if (typeof cb === 'function') cb()
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
  },

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
  }
})
