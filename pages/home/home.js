const { routeData, methodList, timeCalculation } = require('../../utils/data.js')

Page({
  data: {
    route: routeData,
    methods: methodList,
    timeCalc: timeCalculation
  },

  goRoute() {
    wx.switchTab({ url: '/pages/route/route' })
  }
})
