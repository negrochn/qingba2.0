// 当前阶段选择页（原语 3：picker-page 整页单选列表）
const checkin = require('../../utils/checkin.js');
const { routeData } = require('../../utils/data.js');

Page({
  data: {
    fontClass: '',
    darkClass: '',
    items: [],      // [{ key, label }]，由 routeData.stages 直接映射
    selectedId: ''  // 当前选中 stage_id，'' = 尚未选择
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    const saved = checkin.getCurrentStage();
    this.setData({
      items: routeData.stages.map(s => ({ key: s.stage_id, label: s.stage_name })),
      selectedId: saved ? saved.id : ''
    });
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
  },

  onPick(e) {
    const key = e.detail.key;

    // 按 key 回查数据源，取得真实阶段对象与顺序
    const index = (routeData.stages || []).findIndex(s => s.stage_id === key);
    if (index < 0) return;

    const stage = routeData.stages[index];
    const stageData = {
      id: stage.stage_id,
      name: stage.stage_name,
      targetPhase: stage.target_phase,
      vocabularyTarget: stage.vocabulary_target,
      timeInvestment: stage.time_investment
    };

    // 保存：当前阶段 + 前序阶段标记完成
    checkin.setCurrentStage(stageData);
    const done = routeData.stages.slice(0, index).map(s => s.stage_id);
    checkin.setCompletedStages(done);

    this.setData({ selectedId: key });
    wx.navigateBack();
  }
});
