// 设置页
const checkin = require('../../utils/checkin.js');
const children = require('../../utils/children.js');
const { ROUTES } = require('../../utils/data.js');
const { generateStressData } = require('../../utils/stress-test.js');

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

    // 各数据项统一由 onShow 加载：onLoad 后紧接着就会触发 onShow，两处都调会让
    // getAll 全量读存储这类重活白做一遍
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    this.loadRoute();
    this.loadChildCount();
    this.loadCurrentStage();
    this.loadYouquPlan();
    this.loadListening();
    this.loadTargetSummary();
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
