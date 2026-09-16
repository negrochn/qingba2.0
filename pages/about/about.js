const share = require('../../utils/share.js')

// 单页模式（scene 1154，即从朋友圈卡片打开）：无 tabBar、页面不能跳转，
// button 的 open-type 也被禁用，故隐藏页内的分享按钮
function isSinglePage() {
  try {
    const opt = wx.getLaunchOptionsSync()
    return !!(opt && opt.scene === 1154)
  } catch (e) {
    return false
  }
}

Page({
  data: {
    fontClass: '',
    darkClass: '',
    singlePage: false
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ singlePage: isSinglePage() })
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  // 转发给好友（页内按钮 open-type="share" 与右上角菜单共用同一份配置）
  onShareAppMessage() {
    return share.appMessage('about')
  },

  // 分享到朋友圈：官方要求「本页允许发送给朋友（onShareAppMessage）」+「本页 onShareTimeline」同时声明
  onShareTimeline() {
    return share.timeline('about')
  }
})
