const { routeData } = require('../../utils/data.js')

Page({
  data: {
    stages: routeData.stages,
    stageCount: routeData.stages.length
  },

  toStage(e) {
    const index = e.currentTarget.dataset.index
    wx.navigateTo({
      url: `/pages/stage/stage?index=${index}`
    })
  }
})
