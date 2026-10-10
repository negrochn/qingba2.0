// 数据与备份页：备份说明、立即备份（shareFileMessage 一键转发）、从备份恢复
// 数据与流程编排都在 utils/backup.js，本页只做 UI 与少量胶水
const backup = require('../../utils/backup.js');

Page({
  data: {
    fontClass: 'fs-normal',
    darkClass: 'dm-auto',
    lastBackupText: '',   // 「xxxx年x月x日」；'' = 从未备份
    remindText: '',       // 提醒文案（空 = 暂无需提醒）
    // 导入备份 · 选孩子弹层（v2 单孩格式专用；v3 多孩格式整体恢复不经过此处）
    importPickVisible: false,
    importPickItems: [],
    importPickSelectedId: ''
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
    this._importMode = 'overwrite';
    this._pendingImport = null;
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
    this.refreshBackupState();
  },

  // 刷新「上次备份」与提醒文案；转发面板 / 文档预览返回时 onShow 重查一次
  refreshBackupState() {
    this.setData({
      lastBackupText: backup.getLastBackupText(),
      remindText: backup.getRemindText()
    });
  },

  // 立即备份：生成文件 → 拉起转发面板（引导发到「文件传输助手」）
  // PC 端不支持 shareFileMessage，内部自动降级 openDocument 预览
  onBackup() {
    backup.generateBackupFile((filePath, fileName) => {
      backup.shareBackupFile(filePath, fileName);
    });
  },

  // ===== 从备份恢复 =====

  goImportPicker() {
    wx.navigateTo({ url: '/pages/importPicker/importPicker' });
  },

  // 从 importPicker 返回后，按所选方式选择备份文件并导入
  startImport(mode) {
    this._importMode = mode === 'merge' ? 'merge' : 'overwrite';
    backup.startImportFlow(this._importMode, {
      onNeedPickChild: ({ data, items, activeId }) => {
        this._pendingImport = data;
        this.setData({
          importPickVisible: true,
          importPickSelectedId: activeId,
          importPickItems: items
        });
      },
      onDone: () => {
        this._pendingImport = null;
      }
    });
  },

  // ===== 导入备份 · 选孩子弹层（v2 单孩格式） =====

  onImportPickChild(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      importPickSelectedId: id,
      importPickItems: this.data.importPickItems.map(it => ({
        ...it,
        active: it.id === id
      }))
    });
  },

  closeImportPick() {
    this.setData({ importPickVisible: false });
    this._pendingImport = null;
  },

  confirmImportPick() {
    const targetId = this.data.importPickSelectedId;
    if (!this._pendingImport || !targetId) return;
    backup.confirmImportToChild(this._pendingImport, this._importMode, targetId, {
      onDone: () => {
        this.setData({ importPickVisible: false });
        this._pendingImport = null;
      }
    });
  }
});
