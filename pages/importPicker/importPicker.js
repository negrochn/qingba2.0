// 导入方式选择页（原语 3：picker-page 整页单选列表）
Page({
  data: {
    fontClass: '',
    darkClass: '',
    modes: [
      { key: 'overwrite', name: '覆盖式导入', desc: '用备份数据完整替换现有数据' },
      { key: 'merge', name: '合并式导入', desc: '将备份数据合并到现有数据，保留已有内容' }
    ],
    selectedKey: ''
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
  },

  _getSettingsPage() {
    const pages = getCurrentPages();
    return pages.length >= 2 ? pages[pages.length - 2] : null;
  },

  pick(e) {
    const key = e.currentTarget.dataset.key;
    const settings = this._getSettingsPage();
    this.setData({ selectedKey: key });

    // 返回设置页后，由设置页按所选方式拉起文件选择
    wx.navigateBack({
      success: () => {
        if (settings && settings.startImport) {
          settings.startImport(key);
        }
      }
    });
  }
});
