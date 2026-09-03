Page({
  data: {
    fontClass: ''
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  goRecords() {
    wx.navigateTo({ url: '/pages/records/records' })
  },
  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' })
  },
  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  },
  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' })
  }
})
