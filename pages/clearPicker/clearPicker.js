// 清空范围选择页（原语 3：picker-page 整页单选列表）
const { routeData } = require('../../utils/data.js');

Page({
  data: {
    fontClass: '',
    darkClass: '',
    scopes: [],
    selectedKey: ''
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
    this._loadScopes();
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
  },

  // 计算可清空范围：全部数据 + 全部阶段（常规1、常规2、…、准桥梁）
  _loadScopes() {
    const options = (routeData.stages || []).map(s => ({
      key: s.stage_id,
      name: s.stage_name
    }));
    options.unshift({ key: 'all', name: '全部数据' });
    this.setData({ scopes: options });
  },

  _getSettingsPage() {
    const pages = getCurrentPages();
    return pages.length >= 2 ? pages[pages.length - 2] : null;
  },

  pick(e) {
    const key = e.currentTarget.dataset.key;
    const opt = (this.data.scopes || []).find(o => o.key === key);
    if (!opt) return;
    const settings = this._getSettingsPage();
    this.setData({ selectedKey: key });

    wx.navigateBack({
      success: () => {
        if (settings && settings.startClear) {
          settings.startClear(opt);
        }
      }
    });
  }
});
