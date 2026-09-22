const share = require('../../utils/share.js')
const { getRoute } = require('../../utils/data.js')
const { buildStageVms } = require('../../utils/routeIntro.js')

Page({
  data: {
    fontClass: '',
    darkClass: '',
    stages: []
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    // 本页固定展示常规路线（getRoute('regular')，不随当前路线切换——入口即「常规路线介绍」）；
    // 阶段参考与逐阶段素材与要点两节数据直出（routeIntro 统一组装），与 about-bigloop 同构
    this.setData({ stages: buildStageVms(getRoute('regular').stages) })
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
