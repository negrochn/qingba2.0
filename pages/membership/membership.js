// 会员中心页：会员状态 / 权益清单 / 开通（虚拟支付）/ 邀请码兑换
// 数据管理页不再承担售卖（工具页去商业化），会员域收口本页；
// 权益查询与购买流程都收口 utils/cloudBackup.js，本页只做 UI 与胶水
const cloudBackup = require('../../utils/cloudBackup.js');

Page({
  data: {
    fontClass: 'fs-normal',
    darkClass: 'dm-auto',
    entReady: false,     // 权益是否查到过（决定「¥9.9 开通」值位是否渲染，防查询失败误标价）
    isMember: false,
    // 邀请码兑换弹层
    redeemVisible: false,
    redeemCode: ''
  },

  onLoad() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);
    this.refreshEntitlement();
  },

  // 缓存先行（app 启动已预热）+ 实查覆盖；购买/兑换返回时 onShow 即刷
  refreshEntitlement() {
    const apply = (ent) => {
      if (ent && ent.ok) this.setData({ isMember: !!ent.member, entReady: true });
    };
    const cached = cloudBackup.getCachedEntitlement();
    if (cached) apply(cached);
    cloudBackup.getEntitlement(apply);
  },

  // 开通永久会员（虚拟支付）：下单/收银台/支付后轮询确认都在 cloudBackup
  goBuy() {
    if (this.data.isMember || this._payBusy) return;
    this._payBusy = true;
    cloudBackup.purchaseLifetime({
      onDone: () => {
        this._payBusy = false;
        this.refreshEntitlement(); // 开通成功：状态卡 / 按钮即时翻转
      }
    });
  },

  // ===== 邀请码兑换 =====

  // 入口常驻不做显隐：权益缓存有时效，误隐藏会让新会员找不到入口；
  // 永久会员输码由云函数拒绝并提示码未消耗可转赠，入口同时承载转赠场景
  onRedeemCode() {
    this.setData({ redeemVisible: true });
  },

  closeRedeem() {
    this.setData({ redeemVisible: false, redeemCode: '' });
  },

  onRedeemInput(e) {
    this.setData({ redeemCode: e.detail.value });
  },

  confirmRedeem() {
    const code = (this.data.redeemCode || '').trim();
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    if (this._redeemBusy) return;
    this._redeemBusy = true;
    cloudBackup.redeemCode(code, {
      onDone: (result) => {
        this._redeemBusy = false;
        if (result && result.ok) {
          this.setData({ redeemVisible: false, redeemCode: '' });
          this.refreshEntitlement(); // 升永久：状态卡与按钮即时翻转
        }
      }
    });
  }
});
