// 数据管理页（原「数据与备份」升级）：备份 / 恢复 / 清空的唯一聚合页
// 备份数据与流程编排都在 utils/backup.js，本页只做 UI 与少量胶水
const backup = require('../../utils/backup.js');
const cloudBackup = require('../../utils/cloudBackup.js');
const checkin = require('../../utils/checkin.js');

Page({
  data: {
    fontClass: 'fs-normal',
    darkClass: 'dm-auto',
    backupTitle: '',     // 说明卡标题（三态：云端快照/文件备份/本机，refreshBackupState 计算）
    backupDesc: '',      // 说明卡描述；'' = 不显示（有云端快照时与 cell 副文案重复）
    lastBackupMeta: '',  // 说明卡 meta「上次备份：云端 · 今天 14:11」（渠道按最新备份实时推断）
    remindText: '',       // 提醒文案（空 = 暂无需提醒）
    cloudStateText: '',  // 云端快照完整概要「时间 · N孩M条」；'' = 云端暂无
    cloudTimeText: '',   // 云端快照时间（「备份到云端」右侧值位）；'' = 无快照不显示
    cloudSizeText: '',   // 云端快照规模「N孩M条」（副文案用）
    fileBackupText: '',  // 最近一次文件备份时间（「备份到文件」右侧值位）；'' = 从未
    hasCloud: false,     // 是否存在云端快照（说明卡标题三态之一）
    cloudEntText: '',    // 无云端快照时「备份到云端」副文案（跟随会员/点数状态；'' 回落「暂无快照」）
    isMember: false,     // 永久会员态：说明卡徽标 / 副文案口径（购买入口已迁会员中心页）
    // 云备份解锁选择弹层（非会员点数用尽时：看视频 / 开通会员 / 暂不）
    unlockVisible: false,
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
    this.refreshCloudEntitlement();
  },

  // 刷新说明卡三态与提醒文案；转发面板 / 文档预览返回时 onShow 重查一次。
  // 三态按数据安全档位排：有云端快照（最高保障）> 无云但有文件备份 > 全无。
  // desc 仅后两态展示——无云时的丢失风险告知是转化位不可省，文件备份态给轻风险版引导上云；
  // hasCloud 变化处（进页缓存+静默刷新 / 备份成功 / 删除快照）都会跟一次本方法，标题随之正确
  refreshBackupState() {
    const info = backup.getLastBackupInfo();
    const lastBackupText = backup.getLastBackupText(); // 混合口径最新一次的智能格式时间
    const srcLabel = info.source === 'cloud' ? '云端' : (info.source === 'file' ? '文件' : '');
    let backupTitle = '数据保存在本机';
    let backupDesc = '打卡记录、孩子资料与自定义资源都保存在手机微信的本地存储中。移除小程序、清理微信存储空间或更换手机都会导致数据丢失且无法找回，建议开启「备份到云端」，或定期备份发送文件。';
    if (this.data.hasCloud) {
      backupTitle = '数据已有云端快照';
      backupDesc = '';
    } else if (info.ts > 0) {
      backupTitle = '数据已有文件备份';
      backupDesc = '已通过文件备份留存数据，但备份文件可能随聊天记录清理而丢失。建议开启「备份到云端」，换手机登录同一微信即可一键恢复。';
    }
    this.setData({
      backupTitle,
      backupDesc,
      // meta 标注最新一次的渠道（云端/文件），避免与云快照标题并排时产生时间歧义
      lastBackupMeta: lastBackupText ? `上次备份：${srcLabel} · ${lastBackupText}` : '上次备份：从未备份',
      fileBackupText: backup.getLastFileBackupText(),
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

  // ===== 云备份（每人 1 份覆盖式快照；备份需权益：会员或看视频解锁，
  // 权益弹窗/激励视频/重试均收口在 utils/cloudBackup.js，页面只做胶水） =====

  // 先展示本地缓存，再静默刷新云端（换手机后本地无缓存也能对上）
  refreshCloudState() {
    const apply = () => {
      const cloudStateText = cloudBackup.getStateText();
      this.setData({
        cloudStateText,
        cloudTimeText: cloudBackup.getStateTime(),
        cloudSizeText: cloudBackup.getStateSize(),
        hasCloud: !!cloudStateText
      });
      // 云端 meta 回来后补刷一次「上次备份/提醒」：getLastBackupTime 会回落云端时间
      this.refreshBackupState();
    };
    apply();
    cloudBackup.refreshCloudState(apply);
  },

  // 「备份到云端」副文案跟随权益状态：会员不限次 / 还可免费备份 N 次 / 需看短视频解锁
  // （查询失败或云不可用时保持 ''，副文案回落「暂无快照」，不阻塞页面）
  // 缓存先行：app 启动已预热写缓存，首屏先按缓存渲染（会员态即时可见），实查回来再覆盖
  refreshCloudEntitlement() {
    const apply = (ent) => {
      let text = '';
      if (ent && ent.ok) {
        if (ent.member) text = '暂无快照 · 会员不限次备份';
        else if (ent.credits > 0) text = '暂无快照 · 还可免费备份 ' + ent.credits + ' 次';
        else text = '暂无快照 · 看短视频解锁备份，会员不限次';
      }
      this.setData({ cloudEntText: text, isMember: !!(ent && ent.ok && ent.member) });
    };
    const cached = cloudBackup.getCachedEntitlement();
    if (cached) apply(cached);
    cloudBackup.getEntitlement(apply);
  },

  // 会员中心（购买/兑换已迁出本页，tips 链接与解锁弹层共用入口）
  goMembership() {
    wx.navigateTo({ url: '/pages/membership/membership' });
  },

  // ===== 云备份解锁选择弹层（替代系统 showModal：三动作——看视频 / 开通会员 / 暂不。
  // utils 检测到无权益时经 onNeedUnlock 回调到这里弹层，选择结果回传续跑原流程） =====

  // utils 回调：弹层选择结果的续跑句柄存实例上（关闭/选择后置空防重复回传）
  onNeedUnlock(handle) {
    this._unlockHandle = handle;
    this.setData({ unlockVisible: true });
  },

  // 看视频解锁：回传 'ad'，广告拉起 / 完整观看登记 / 重试备份都在 utils 原流程
  unlockByAd() {
    this.setData({ unlockVisible: false });
    const handle = this._unlockHandle;
    this._unlockHandle = null;
    if (handle) handle('ad');
  },

  // 开通会员：结束本次备份流（购买在会员中心完成，返回后重按备份即走会员通道）
  unlockByBuy() {
    this.setData({ unlockVisible: false });
    const handle = this._unlockHandle;
    this._unlockHandle = null;
    if (handle) handle('cancel');
    this.goMembership();
  },

  cancelUnlock() {
    this.closeUnlock();
  },

  // 遮罩关闭与「暂不」同口径：静默结束本次流程，不算错误不提示
  closeUnlock() {
    this.setData({ unlockVisible: false });
    const handle = this._unlockHandle;
    this._unlockHandle = null;
    if (handle) handle('cancel');
  },

  onCloudBackup() {
    if (this._cloudBusy) return;
    this._cloudBusy = true;
    cloudBackup.uploadToCloud({
      // 无权益时页面弹「解锁选择」弹层（三动作），选择结果回传 utils 续跑
      onNeedUnlock: (handle) => this.onNeedUnlock(handle),
      onDone: () => {
        this._cloudBusy = false;
        const cloudStateText = cloudBackup.getStateText();
        this.setData({
          cloudStateText,
          cloudTimeText: cloudBackup.getStateTime(), // 备份完成即刷新右侧时间
          cloudSizeText: cloudBackup.getStateSize(),
          hasCloud: !!cloudStateText
        });
        this.refreshBackupState(); // 云备份计入「上次备份」口径，红点/提醒同步
        this.refreshCloudEntitlement(); // 解锁/备份后点数已变化，副文案同步
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
          this.setData({ cloudStateText: '', cloudTimeText: '', cloudSizeText: '', hasCloud: false });
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
  },

  // ===== 危险操作（原设置页「数据管理」迁入） =====

  // 跳转清空范围选择页（原语 3：picker-page 整页单选）
  goClearPicker() {
    wx.navigateTo({ url: '/pages/clearPicker/clearPicker' });
  },

  // 从 clearPicker 返回后，二次确认并执行清空（clearPicker 经 getCurrentPages 取上一页调用）
  startClear(opt) {
    if (!opt) return;

    const content = opt.key === 'route'
      ? `将清空${opt.label}的打卡记录、已读次数与练习进度（另一条路线与自定义资源不受影响），此操作不可恢复，是否继续？`
      : `将清空「${opt.label}」的打卡记录与练习进度（自定义资源保留），此操作不可恢复，是否继续？`;

    wx.showModal({
      title: '确认清空',
      content,
      confirmText: '清空',
      cancelText: '取消',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.doClear(opt.key);
        }
      }
    });
  },

  doClear(scope) {
    wx.showLoading({ title: '清除中...' });

    setTimeout(() => {
      try {
        if (scope === 'route') {
          // 当前路线练习痕迹：逐阶段清打卡记录/已读次数/完成标记（clearCheckinsByStage
          // 内含完成标记移除），并重置当前阶段；自定义资源与默认备注归资源管理不在清空
          // 范围；另一条路线不受影响（stage_id 命名空间隔离）；清完回到未设置态
          const stages = checkin.getCurrentRoute().stages || [];
          let removedTotal = 0;
          stages.forEach(s => {
            removedTotal += checkin.clearCheckinsByStage(s.stage_id);
          });
          checkin.clearCurrentStage();
          if (!removedTotal) {
            wx.hideLoading();
            wx.showToast({ title: '该范围暂无数据', icon: 'none' });
            return;
          }
        } else {
          // 按阶段清除练习痕迹：打卡记录 + 已读次数 + 完成标记（clearCheckinsByStage
          // 内含完成标记移除，与路线级同口径）
          const removed = checkin.clearCheckinsByStage(scope);
          if (!removed) {
            wx.hideLoading();
            wx.showToast({ title: '该范围暂无数据', icon: 'none' });
            return;
          }
        }

        wx.hideLoading();
        this.refreshBackupState(); // 清空后记录数下降，「上次备份/提醒文案」同步消失

        wx.showToast({
          title: '已清空',
          icon: 'success'
        });

      } catch (e) {
        wx.hideLoading();
        wx.showToast({
          title: '清除失败',
          icon: 'none'
        });
      }
    }, 300);
  }
});
