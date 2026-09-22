// 当前阶段选择页（原语 3：picker-page 整页单选列表）
const checkin = require('../../utils/checkin.js');

Page({
  data: {
    fontClass: '',
    darkClass: '',
    items: [],      // [{ key, label, desc? }]，由当前路线 stages 映射
    selectedId: ''  // 当前选中 stage_id，'' = 尚未选择
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    const saved = checkin.getCurrentStage();
    this.setData({
      items: (checkin.getCurrentRoute().stages || []).map(s => ({
        key: s.stage_id,
        label: s.stage_name,
        // 大循环调整支线小段：右侧（对勾左侧）灰字标注「可选」属性（radio-list 的 meta 槽），
        // 判定依据由阶段详情页 entry_requirement/promotion_standard 承载
        meta: s.optional ? '可选支线' : ''
      })),
      selectedId: saved ? saved.id : ''
    });
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
  },

  onPick(e) {
    const key = e.detail.key;

    // 按 key 回查数据源（当前路线），取得真实阶段对象
    const stages = checkin.getCurrentRoute().stages || [];
    const stage = stages.find(s => s.stage_id === key);
    if (!stage) return;

    const stageData = {
      id: stage.stage_id,
      name: stage.stage_name,
      targetPhase: stage.target_phase,
      vocabularyTarget: stage.vocabulary_target,
      timeInvestment: stage.time_investment
    };

    // 保存：当前阶段 + 前序按「晋级链」标记完成
    // - 常规路线 prev_stage_ids = 数组前序，行为与旧的 slice(0, index) 完全一致
    // - 大循环分叉结构：直达选牛4 只标 {前置, 一}；调整小段互相不构成链（切入级别看测试结果）；
    //   走过的支线标记在汇合选牛4 时靠合并保留（旧的覆盖式会把走过的路抹掉）
    // - 回调重走（新选阶段自身已在完成名单）：覆盖为当前链——纯合并会把旧标记残留下来
    //   （如从二阶段切回前置阶段，前置/一阶段的勾不清）；覆盖后汇合切线场景不受影响：
    //   牛3→牛4 时牛4 不在名单里，仍走合并分支保留支线标记
    // 注意：前序只写 completed 标记，不补任何时长记录。故中途起步的用户在记录里没有前序阶段的
    // 完整时长，getAccumulatedMinutes() 的累计口径（400H/480H）对其结构性不可达（与原实现一致）。
    // 若将来有阶段必须按累计口径判定，需先在此处把前序阶段的时长补上（或改为从起步阶段起算）。
    checkin.setCurrentStage(stageData);
    const chain = {};
    (function walk(s) {
      if (!s || chain[s.stage_id]) return;
      (s.prev_stage_ids || []).forEach(id => {
        walk(stages.find(x => x.stage_id === id));
      });
      chain[s.stage_id] = true;
    })(stage);
    delete chain[stage.stage_id];   // 与原行为一致：名单不含当前阶段自身
    const old = checkin.getCompletedStages();
    if (old.indexOf(stage.stage_id) >= 0) {
      checkin.setCompletedStages(Object.keys(chain));
    } else {
      const merged = {};
      old.forEach(id => { merged[id] = true });
      Object.keys(chain).forEach(id => { merged[id] = true });
      checkin.setCompletedStages(Object.keys(merged));
    }

    this.setData({ selectedId: key });
    wx.navigateBack();
  }
});
