// 我的页卡
const theme = require('../../utils/theme.js');
const share = require('../../utils/share.js');
const { getCurrentRouteId } = require('../../utils/checkin.js');
const backup = require('../../utils/backup.js');

Page({
  data: {
    fontClass: 'fs-normal',
    darkClass: 'dm-auto',
    routeId: 'regular', // 路线介绍入口按当前路线二选一显示（onShow 刷新，切路线回来即更新）
    backupRemind: false
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
    this.setData({ routeId: getCurrentRouteId() });
    this.loadBackupRemind();
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

  // 备份提醒红点：数据量达标且超期未备份（常驻直至备份）
  loadBackupRemind() {
    try {
      this.setData({ backupRemind: backup.shouldRemind() });
    } catch (e) {}
  },

  goDataBackup() {
    wx.navigateTo({ url: '/pages/dataBackup/dataBackup' });
  },

  // 分享给好友
  onShareAppMessage() {
    return share.appMessage('mine');
  }
});
