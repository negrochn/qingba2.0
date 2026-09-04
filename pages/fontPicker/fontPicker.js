// 字体大小选择页（原语 3：picker-page 整页单选列表）
const theme = require('../../utils/theme.js');

Page({
  data: {
    fontClass: '',
    darkClass: '',
    levels: [],      // [{ key, label }]
    selectedKey: ''  // 当前选中的 level key
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    const levels = theme.LEVELS.map(l => ({ key: l.key, label: l.label }));
    this.setData({
      levels,
      selectedKey: theme.getFontLevel()
    });
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
  },

  pick(e) {
    const key = e.currentTarget.dataset.key;
    if (theme.indexOf(key) < 0) return;

    theme.setFontLevel(key);

    // 立即让本页字号随选择缩放，并把新档位应用到全局
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    const level = theme.LEVELS[theme.indexOf(key)];
    this.setData({ selectedKey: key });
    wx.showToast({ title: `字号：${level.label}`, icon: 'none' });
    setTimeout(() => wx.navigateBack(), 300);
  }
});
