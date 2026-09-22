// 清空范围选择页（原语 3：picker-page 整页单选列表）
const checkin = require('../../utils/checkin.js');

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

  // 计算可清空范围：当前路线全部 + 当前路线各阶段，右侧 meta 实时统计打卡条数，
  // 清空前让家长知道会删掉多少数据；无数据的范围不显示条数（避免满屏 0 条噪音）
  // 阶段列表跟随当前路线（与打卡/统计同口径），想清另一条路线先去设置切换
  _loadScopes() {
    const route = checkin.getCurrentRoute();
    let total = 0;
    const options = (route.stages || []).map(s => {
      const count = checkin.countCheckinsByStage(s.stage_id);
      total += count;
      return {
        key: s.stage_id,
        label: s.stage_name,
        meta: count > 0 ? `${count} 条` : ''
      };
    });
    options.unshift({
      key: 'route',
      label: `全部数据（${route.name}）`,
      meta: total > 0 ? `共 ${total} 条` : ''
    });
    this.setData({ scopes: options });
  },

  _getSettingsPage() {
    const pages = getCurrentPages();
    return pages.length >= 2 ? pages[pages.length - 2] : null;
  },

  onPick(e) {
    const key = e.detail.key;
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
