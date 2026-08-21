const { routeData, methodList } = require('../../utils/data.js')

Page({
  data: {
    route: routeData,
    methods: methodList,
    stages: routeData.stages
  },

  toStage(e) {
    const index = e.currentTarget.dataset.index
    wx.navigateTo({
      url: `/pages/stage/stage?index=${index}`
    })
  }
})
