// 数据与备份页：备份说明、云备份（备份/恢复/删除）、立即备份（shareFileMessage 一键转发）、从备份恢复
// 数据与流程编排都在 utils/backup.js，本页只做 UI 与少量胶水
const backup = require('../../utils/backup.js');
const cloudBackup = require('../../utils/cloudBackup.js');

Page({
  data: {
    fontClass: 'fs-normal',
    darkClass: 'dm-auto',
    lastBackupText: '',   // 智能格式「今天 14:11」等；'' = 从未备份
    remindText: '',       // 提醒文案（空 = 暂无需提醒）
    cloudStateText: '',  // 云端快照概要「x月x日 HH:mm · N孩M条」；'' = 云端暂无
    hasCloud: false,     // 是否存在云端快照（说明卡自适应两态）
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
    this.refreshCloudState();
  },

  // 刷新「上次备份」与提醒文案；转发面板 / 文档预览返回时 onShow 重查一次
  refreshBackupState() {
    this.setData({
      lastBackupText: backup.getLastBackupText(),
      remindText: backup.getRemindText()
    });
  },

  // 备份到文件：同步生成文件 → 拉起转发面板（手势链内同步调用，见 backup.js 说明）
  // PC 端不支持 shareFileMessage，内部自动降级 openDocument 预览
  onBackup() {
    backup.generateBackupFile((filePath, fileName) => {
      backup.shareBackupFile(filePath, fileName);
    });
  },

  // ===== 云备份（免费：每人 1 份覆盖式快照） =====

  // 先展示本地缓存，再静默刷新云端（换手机后本地无缓存也能对上）
  refreshCloudState() {
    const apply = () => {
      const cloudStateText = cloudBackup.getStateText();
      this.setData({ cloudStateText, hasCloud: !!cloudStateText });
      // 云端 meta 回来后补刷一次「上次备份/提醒」：getLastBackupTime 会回落云端时间
      this.refreshBackupState();
    };
    apply();
    cloudBackup.refreshCloudState(apply);
  },

  onCloudBackup() {
    if (this._cloudBusy) return;
    this._cloudBusy = true;
    cloudBackup.uploadToCloud({
      onDone: () => {
        this._cloudBusy = false;
        const cloudStateText = cloudBackup.getStateText();
        this.setData({ cloudStateText, hasCloud: !!cloudStateText });
        this.refreshBackupState(); // 云备份计入「上次备份」口径，红点/提醒同步
      }
    });
  },

  onCloudRestore() {
    if (this._cloudBusy) return;
    this._cloudBusy = true;
    // 确认弹窗（含孩子数 / 记录数概要）与落库都复用文件导入流程
    cloudBackup.restoreFromCloud({
      onDone: (result) => {
        this._cloudBusy = false;
        if (result && result.ok) this.refreshBackupState();
      }
    });
  },

  // 删除云端备份：确认弹窗与删除流程在 cloudBackup 内；成功后说明卡回无快照态
  onDeleteCloud() {
    if (this._cloudBusy) return;
    this._cloudBusy = true;
    cloudBackup.deleteFromCloud({
      onDone: (result) => {
        this._cloudBusy = false;
        if (result && result.ok) {
          this.setData({ cloudStateText: '', hasCloud: false });
          this.refreshBackupState(); // 云端回落链断开，「上次备份/提醒」重查
        }
      }
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
