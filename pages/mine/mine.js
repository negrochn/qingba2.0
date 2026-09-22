// 我的页卡
const theme = require('../../utils/theme.js');
const share = require('../../utils/share.js');

Page({
  data: {
    fontClass: 'fs-normal',
    darkClass: 'dm-auto'
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
    this.loadDarkMode();
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
    this.loadDarkMode();
  },

  // 深色模式：复用全局 dm-* class（与设置页一致，修复此前 mine 不跟随深色的问题）
  loadDarkMode() {
    this.setData({ darkClass: theme.getDarkClass() });
  },

  goRecords() {
    wx.navigateTo({ url: '/pages/records/records' });
  },
  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' });
  },
  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },
  goAboutBigloop() {
    wx.navigateTo({ url: '/pages/about-bigloop/about-bigloop' });
  },
  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  // 分享给好友
  onShareAppMessage() {
    return share.appMessage('mine');
  }
});
