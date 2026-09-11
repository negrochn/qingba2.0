// 数据统计：列出各阶段，点击进入阶段统计详情（图表 / 明细后续补充）
const { routeData } = require('../../utils/data.js')

Page({
  data: {
    fontClass: '',
    darkClass: '',
    stageList: []
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ stageList: routeData.stages })
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  // 点击阶段 → 进入阶段统计详情
  toStageDetail(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({
      url: `/pages/statsDetail/statsDetail?id=${id}`,
      fail(err) {
        console.error('navigateTo fail:', err)
        wx.showToast({ title: '跳转失败', icon: 'none' })
      }
    })
  }
})
