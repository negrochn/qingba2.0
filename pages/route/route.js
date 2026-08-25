const { routeData } = require('../../utils/data.js')
const checkin = require('../../utils/checkin.js')

Page({
  data: {
    stages: routeData.stages,
    stageCount: routeData.stages.length,
    currentStageId: '',
    currentStageIndex: -1
  },

  onLoad() {
    this.loadCurrentStage();
  },

  onShow() {
    this.loadCurrentStage();
  },

  // 加载当前阶段
  loadCurrentStage() {
    const current = checkin.getCurrentStage();
    let currentIndex = -1
    routeData.stages.forEach((s, i) => {
      if (current && s.stage_id === current.id) currentIndex = i
    })
    this.setData({
      currentStageId: current ? current.id : '',
      currentStageIndex: currentIndex
    });
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
