// 设置页
const checkin = require('../../utils/checkin.js');
const children = require('../../utils/children.js');
const customResources = require('../../utils/customResources.js');
const { ROUTES } = require('../../utils/data.js');
const { generateStressData } = require('../../utils/stress-test.js');
const backup = require('../../utils/backup.js');

// 获取「关于小程序」右侧显示文案：
// 正式版读线上版本号；开发版 / 体验版读不到版本号，只显示环境（不做假版本号兜底）
function getAppVersionText() {
  try {
    const info = wx.getAccountInfoSync();
    const version = info.miniProgram.version;
    const envVersion = info.miniProgram.envVersion; // develop | trial | release
    if (version) return `版本${version}`;
    if (envVersion === 'develop') return '开发版';
    if (envVersion === 'trial') return '体验版';
    return '未知版本';
  } catch (e) {
    return '未知版本';
  }
}

Page({
  data: {
    totalCount: 0,
    currentRouteName: '',
    childCountText: '',
    appVersionText: getAppVersionText(),
    // 开发者工具（压力测试）仅在开发版显示
    showDevTools: false,
    currentStageIndex: -1,
    currentStage: null,
    currentStageDisplay: '',
    youquEnabled: true,
    listeningEnabled: false,
    targetSummary: '',
    // 备份提醒红点（「数据与备份」入口）：数据量达标且超期未备份
    backupRemind: false,
    // 字号 / 深色 class（跟随微信设置，由 app.applyFontLevel 下发）
    fontClass: 'fs-normal',
    darkClass: 'dm-auto',
  },

  onLoad() {
    // 正式版/体验版隐藏开发者工具入口
    let env = '';
    try { env = wx.getAccountInfoSync().miniProgram.envVersion || '' } catch (e) {}
    this.setData({
      showDevTools: env === 'develop'
    });

    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    // 各数据项统一由 onShow 加载：onLoad 后紧接着就会触发 onShow，
    // 两处都调会让 loadStats（内部 getAll 全量读存储）这类重活白做一遍
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    this.loadRoute();
    this.loadChildCount();
    this.loadStats();
    this.loadCurrentStage();
    this.loadYouquPlan();
    this.loadListening();
    this.loadTargetSummary();
    this.loadBackupRemind();
  },

  // 跳转「我的资源」管理页
  goMyResources() {
    wx.navigateTo({ url: '/pages/myResources/myResources' });
  },

  // 孩子数（「孩子管理」入口右侧展示；单孩也显示「1 个」）
  loadChildCount() {
    try {
      const n = children.getChildren().length;
      this.setData({ childCountText: `${n} 个` });
    } catch (e) {
      console.error('读取孩子数失败', e);
    }
  },

  // 跳转「孩子管理」页（多孩功能唯一管理入口）
  goChildManage() {
    wx.navigateTo({ url: '/pages/childManage/childManage' });
  },

  // 读取阶段目标口径（默认档位 + 自定义阶段数），供入口行右侧展示
  loadTargetSummary() {
    try {
      const modeText = checkin.getTargetMode() === 'lower' ? '下限' : '上限';
      const count = Object.keys(checkin.getCustomTargets()).length;
      // 有覆盖时补一句，否则用户会疑惑「为什么各阶段进度口径不一致」
      this.setData({ targetSummary: count ? `${modeText} · ${count} 项自定义` : modeText });
    } catch (e) {
      console.error('读取阶段目标口径失败', e);
    }
  },

  // 跳转「阶段目标时长」设置页
  goTargetSetting() {
    wx.navigateTo({ url: '/pages/targetSetting/targetSetting' });
  },

  // 读取小小优趣成长计划开关
  loadYouquPlan() {
    this.setData({ youquEnabled: checkin.isYouquPlanEnabled() });
  },

  // 切换小小优趣成长计划开关
  onYouquPlanChange(e) {
    const enabled = !!e.detail.value;
    checkin.setYouquPlanEnabled(enabled);
    this.setData({ youquEnabled: enabled });
  },

  // 读取熏听分组开关
  loadListening() {
    this.setData({ listeningEnabled: checkin.isListeningEnabled() });
  },

  // 切换熏听分组开关：开 = 阶段页显示「熏听」分组并可打卡（时长按阶段系数折算）
  onListeningChange(e) {
    const enabled = !!e.detail.value;
    checkin.setListeningEnabled(enabled);
    this.setData({ listeningEnabled: enabled });
  },

  // ===== 当前路线 =====
  // 「当前路线」入口显示（具体选择在 routePicker 页进行，与「当前阶段」同款交互）。
  // 切换发生在子页，返回时本页 onShow 自动刷新：loadCurrentStage 读的是新路线的槽位
  loadRoute() {
    const rid = checkin.getCurrentRouteId();
    this.setData({ currentRouteName: ROUTES[rid] ? ROUTES[rid].name : '' });
  },

  goRoutePicker() {
    wx.navigateTo({ url: '/pages/routePicker/routePicker' });
  },

  // 加载当前阶段（读当前路线的槽位，展示字段从当前路线数据补全）
  loadCurrentStage() {
    const saved = checkin.getCurrentStage();
    const routeStages = checkin.getCurrentRoute().stages || [];
    if (saved) {
      // 从当前路线补全完整字段（兼容旧存储或默认值只有 id/name 的情况）
      const routeStage = routeStages.find(s => s.stage_id === saved.id);
      const fullData = routeStage ? {
        id: routeStage.stage_id,
        name: routeStage.stage_name,
        targetPhase: routeStage.target_phase,
        vocabularyTarget: routeStage.vocabulary_target,
        timeInvestment: routeStage.time_investment
      } : saved;

      const index = routeStages.findIndex(s => s.stage_id === saved.id);
      this.setData({
        currentStageIndex: index >= 0 ? index : -1,
        currentStage: fullData,
        currentStageDisplay: fullData.name
      });
    } else {
      this.setData({
        currentStageIndex: -1,
        currentStage: null,
        currentStageDisplay: ''
      });
    }
  },

  // 跳转阶段选择页（原语 3：picker-page 整页单选）
  goStagePicker() {
    wx.navigateTo({ url: '/pages/stagePicker/stagePicker' });
  },

  // 加载统计数据（目前只需要 totalCount，用于清空数据提示）
  loadStats() {
    try {
      const count = checkin.totalCountAll();
      this.setData({ totalCount: count });
    } catch (e) {
      console.error('加载统计失败', e);
    }
  },

  // ===== 数据与备份 =====
  // 跳转「数据与备份」页：备份/恢复/存储说明的统一入口（导出导入逻辑在 utils/backup.js）
  goDataBackup() {
    wx.navigateTo({ url: '/pages/dataBackup/dataBackup' });
  },

  // 备份提醒红点：数据量达标且超期未备份（常驻直至备份，不受首页轻条关闭冷却影响）
  loadBackupRemind() {
    try {
      this.setData({ backupRemind: backup.shouldRemind() });
    } catch (e) {}
  },

  // 跳转清空范围选择页（原语 3：picker-page 整页单选）
  goClearPicker() {
    wx.navigateTo({ url: '/pages/clearPicker/clearPicker' });
  },

  // 从 clearPicker 返回后，二次确认并执行清空
  startClear(opt) {
    if (!opt) return;

    const content = opt.key === 'route'
      ? `将清空${opt.label}：当前路线的打卡记录与自定义资源（另一条路线不受影响），并重置该路线的阶段进度，此操作不可恢复，是否继续？`
      : `将清空「${opt.label}」的所有打卡记录与该阶段的自定义资源，此操作不可恢复，是否继续？`;

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
          // 当前路线全部数据：逐阶段清记录/次数/备注与该阶段自定义资源，重置当前阶段
          // 与完成标记；另一条路线不受影响（stage_id 命名空间隔离）；清完回到未设置态
          const stages = checkin.getCurrentRoute().stages || [];
          let removedTotal = 0;
          stages.forEach(s => {
            removedTotal += checkin.clearCheckinsByStage(s.stage_id);
            customResources.clearByStage(s.stage_id);
          });
          checkin.clearCurrentStage();
          const ids = {};
          stages.forEach(s => { ids[s.stage_id] = true });
          checkin.setCompletedStages(
            checkin.getCompletedStages().filter(id => !ids[id])
          );
          if (!removedTotal) {
            wx.hideLoading();
            wx.showToast({ title: '该范围暂无数据', icon: 'none' });
            return;
          }
        } else {
          // 按阶段清除：仅删除该阶段的记录、已读次数与自定义资源
          const hasCustom = customResources.countByStage(scope) > 0;
          const removed = checkin.clearCheckinsByStage(scope);
          customResources.clearByStage(scope);
          if (!removed && !hasCustom) {
            wx.hideLoading();
            wx.showToast({ title: '该范围暂无数据', icon: 'none' });
            return;
          }
        }

        wx.hideLoading();
        this.loadStats();
        this.loadCurrentStage();

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
  },

  // ===== 压力测试 =====
  onStressTest() {
    wx.showModal({
      title: '压力测试',
      content: '将生成模拟打卡数据（各阶段按官方时长目标累计，调整支线按试走量，每日15-60分钟，含缺卡日），会覆盖现有数据，是否继续？',
      confirmText: '生成',
      cancelText: '取消',
      confirmColor: '#07C160',
      success: (res) => {
        if (res.confirm) {
          this.doStressTest();
        }
      }
    });
  },

  doStressTest() {
    wx.showLoading({ title: '生成中...', mask: true });

    // 分步执行，避免阻塞 UI
    setTimeout(() => {
      try {
        const result = generateStressData((current, total, msg) => {
          wx.showLoading({ title: `${current}/${total}`, mask: true });
        });

        wx.hideLoading();

        // 构建结果摘要
        let stageSummary = '';
        for (const name in result.stageStats) {
          const s = result.stageStats[name];
          stageSummary += `${name}: ${s.days}天 ${s.records}条 ${s.hours}h(目标${s.targetHours}h)\n`;
        }

        wx.showModal({
          title: '生成完成',
          content: `打卡: ${result.totalDays}天 / 跨度: ${result.spanDays}天\n总记录: ${result.totalRecords}条\n总时长: ${result.totalHours}h\n已读完: ${result.totalReadCounts}次\n\n${stageSummary}`,
          showCancel: false,
          confirmText: '确定'
        });

        this.loadStats();
        this.loadCurrentStage();

        const app = getApp();
        if (app) {
          app.globalData.checkinDirty = true;
        }
      } catch (e) {
        wx.hideLoading();
        console.error('压力测试失败', e);
        wx.showModal({
          title: '生成失败',
          content: e.message || '未知错误',
          showCancel: false
        });
      }
    }, 100);
  }
});
