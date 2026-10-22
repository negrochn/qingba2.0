// 我的页卡
const theme = require('../../utils/theme.js');
const share = require('../../utils/share.js');
const { getCurrentRouteId } = require('../../utils/checkin.js');
const backup = require('../../utils/backup.js');
const cloudBackup = require('../../utils/cloudBackup.js');

Page({
  data: {
    fontClass: 'fs-normal',
    darkClass: 'dm-auto',
    routeId: 'regular', // 路线介绍入口按当前路线二选一显示（onShow 刷新，切路线回来即更新）
    backupRemind: false,
    isMember: false
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
    this.refreshEntitlement();
  },

  // 会员中心入口值位：缓存先行（app 启动已预热）+ 实查覆盖，
  // 仅会员展示金色「永久会员」身份确认；非会员纯导航无值位（不出错不标价）
  refreshEntitlement() {
    const apply = (ent) => {
      if (ent && ent.ok) this.setData({ isMember: !!ent.member });
    };
    const cached = cloudBackup.getCachedEntitlement();
    if (cached) apply(cached);
    cloudBackup.getEntitlement(apply);
  },

  // 深色模式：复用全局 dm-* class（与设置页一致，修复此前 mine 不跟随深色的问题）
  loadDarkMode() {
    this.setData({ darkClass: theme.getDarkClass() });
  },

  goRecords() {
    wx.navigateTo({ url: '/pages/records/records' });
  },
  goMyStats() {
    wx.navigateTo({ url: '/pages/myStats/myStats' });
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

  goMembership() {
    wx.navigateTo({ url: '/pages/membership/membership' });
  },

  // 分享给好友
  onShareAppMessage() {
    return share.appMessage('mine');
  }
});
