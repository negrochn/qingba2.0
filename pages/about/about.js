const share = require('../../utils/share.js')

Page({
  data: {
    fontClass: '',
    darkClass: ''
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  // 转发给好友：只走右上角菜单「转发」（页内不再放 open-type="share" 按钮）
  onShareAppMessage() {
    return share.appMessage('about')
  },

  // 分享到朋友圈：官方要求「本页允许发送给朋友（onShareAppMessage）」+「本页 onShareTimeline」同时声明
  onShareTimeline() {
    return share.timeline('about')
  }
})
