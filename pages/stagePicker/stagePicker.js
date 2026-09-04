// 当前阶段选择页（原语 3：picker-page 整页单选列表）
const checkin = require('../../utils/checkin.js');
const { routeData } = require('../../utils/data.js');

const NONE_ID = '__none__';

Page({
  data: {
    fontClass: '',
    darkClass: '',
    stages: [],     // [{ id, name }]
    selectedId: ''  // 当前选中 id，'' = 未设置
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    const stages = routeData.stages.map(s => ({ id: s.stage_id, name: s.stage_name }));
    const saved = checkin.getCurrentStage();
    this.setData({
      stages,
      selectedId: saved ? saved.id : ''
    });
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
  },

  pick(e) {
    const id = e.currentTarget.dataset.id;

    // 未设置：清除当前阶段与已完成名单（与首启引导一致）
    if (id === NONE_ID) {
      checkin.clearCurrentStage();
      checkin.setCompletedStages([]);
      this.setData({ selectedId: '' });
      wx.showToast({ title: '已清除当前阶段', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 300);
      return;
    }

    const index = this.data.stages.findIndex(s => s.id === id);
    if (index < 0) return;

    const stage = routeData.stages[index];
    const stageData = {
      id: stage.stage_id,
      name: stage.stage_name,
      targetPhase: stage.target_phase,
      vocabularyTarget: stage.vocabulary_target,
      timeInvestment: stage.time_investment
    };

    // 保存：当前阶段 + 前序阶段标记完成（与首页引导一致）
    checkin.setCurrentStage(stageData);
    const done = this.data.stages.slice(0, index).map(s => s.id);
    checkin.setCompletedStages(done);

    this.setData({ selectedId: id });
    wx.navigateBack();
  }
});
