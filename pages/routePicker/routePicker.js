// 当前路线选择页（原语 3：picker-page 整页单选列表，与 stagePicker 同构）
// 切换路线 = 全局动作：打卡/记录/统计/资源全部跟随当前路线展示（各页按路线取数，
// 数据零迁移）；选中即生效并返回，设置页 onShow 自动刷新当前阶段等展示
const checkin = require('../../utils/checkin.js');
const { ROUTES } = require('../../utils/data.js');

Page({
  data: {
    fontClass: '',
    darkClass: '',
    items: [],      // [{ key, label, desc? }]
    selectedId: ''  // 当前路线 id
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    this.setData({
      items: Object.keys(ROUTES).map(id => ({
        key: id,
        label: ROUTES[id].name,
        // desc 简述路线形态：阶段数是事实；大循环补一句主线特征，帮家长区分两条路
        desc: id === 'bigloop'
          ? `共 ${(ROUTES[id].stages || []).length} 个阶段 · 以牛津树分级为主线`
          : `共 ${(ROUTES[id].stages || []).length} 个阶段`
      })),
      selectedId: checkin.getCurrentRouteId()
    });
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
  },

  onPick(e) {
    const key = e.detail.key;
    if (!ROUTES[key] || key === checkin.getCurrentRouteId()) return;
    checkin.setCurrentRouteId(key);
    this.setData({ selectedId: key });
    // toast 把「数据按路线隔离」的规则在切换那一刻讲清楚（返回设置页后仍可见）
    wx.showToast({
      title: `已切换至${ROUTES[key].name}，打卡与统计将展示该路线数据`,
      icon: 'none',
      duration: 2500
    });
    wx.navigateBack();
  }
});
