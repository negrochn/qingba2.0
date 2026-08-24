const { routeData } = require('../../utils/data.js')

Page({
  data: {
    stages: routeData.stages,
    stageCount: routeData.stages.length
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
