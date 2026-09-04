// 深色模式选择页（微信风格：跟随系统 toggle + 关闭后可手动选普通 / 深色）
const theme = require('../../utils/theme.js');

Page({
  data: {
    fontClass: '',
    darkClass: '',
    followSystem: true,   // 跟随系统 toggle
    manualMode: 'light'   // 手动选择：'light' | 'dark'（仅 followSystem=false 时生效）
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
    this._refresh();
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
    this._refresh();
  },

  // 从存储刷新页面状态
  _refresh() {
    const mode = theme.getDarkMode();
    const followSystem = mode === 'auto';
    // 手动态以存储为准；若是 auto（toggle ON）则不展示手动选项，取默认 manual 占位
    const manualMode = (mode === 'light' || mode === 'dark') ? mode : theme.DEFAULT_MANUAL_MODE;
    this.setData({ followSystem, manualMode });
  },

  // 切换「跟随系统」开关：关闭时默认进入普通模式（DEFAULT_MANUAL_MODE）
  toggleFollowSystem() {
    const next = !this.data.followSystem;
    theme.setDarkMode(next ? 'auto' : theme.DEFAULT_MANUAL_MODE);

    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    this.setData({
      followSystem: next,
      manualMode: theme.DEFAULT_MANUAL_MODE
    });
  },

  // 手动选择普通模式 / 深色模式
  pickManual(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode !== 'light' && mode !== 'dark') return;
    theme.setDarkMode(mode);

    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    this.setData({ manualMode: mode });
  }
});