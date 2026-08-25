const { routeData, resourceLabels } = require('../../utils/data.js')
const checkin = require('../../utils/checkin.js')

// 可点击打卡的资源分类(8 类)
const CLICKABLE_GROUPS = [
  'main_picture_books',   // 主线绘本
  'main_graded_readers',  // 主线分级
  'main_animations',      // 主线动画
  'sub_graded_readers',   // 辅线分级
  'sub_animations',       // 辅线动画
  'fun_extensions',       // 趣味拓展
  'science_extensions',   // 科普拓展
  'fusion_apps'           // 融合APP
]

Page({
  data: {
    stage: null,
    resourceGroups: [],
    // 打卡弹窗
    showCheckin: false,
    currentGroup: null,   // { key, label }
    currentResource: '',  // 资源名
    durationInput: '',    // 输入框(分钟数值文本)
    remarkInput: '',      // 备注输入
    // 资源今日累计打卡(展示徽标用) { "groupKey|资源名": 分钟 }
    resTotals: {}
  },

  onLoad(options) {
    const index = Number(options.index)
    const stage = routeData.stages[index]
    if (!stage) return

    const order = [
      'main_picture_books', 'main_graded_readers', 'main_animations',
      'sub_graded_readers', 'sub_animations',
      'fun_extensions', 'science_extensions', 'fusion_apps'
    ]
    const groups = []
    order.forEach(k => {
      const list = stage.resources[k]
      if (list && list.length) {
        groups.push({
          key: k,
          label: resourceLabels[k] || k,
          items: list,
          clickable: CLICKABLE_GROUPS.indexOf(k) >= 0
        })
      }
    })

    wx.setNavigationBarTitle({ title: stage.stage_name })
    this.setData({ stage, resourceGroups: groups })
    this._refreshResTotals()
  },

  onShow() {
    if (this.data.stage) this._refreshResTotals()
  },

  _refreshResTotals() {
    const stage = this.data.stage
    if (!stage) return
    const totals = {}
    this.data.resourceGroups.forEach(g => {
      if (!g.clickable) return
      g.items.forEach(name => {
        const min = checkin.todayTotalByResource(stage.stage_id, g.key, name)
        if (min > 0) totals[`${g.key}|${name}`] = min
      })
    })
    this.setData({ resTotals: totals })
  },

  // 点击资源标签
  onResourceTap(e) {
    const { groupKey, groupLabel, resource } = e.currentTarget.dataset
    const clickable = CLICKABLE_GROUPS.indexOf(groupKey) >= 0
    if (!clickable) return
    const stage = this.data.stage
    const defaultRemark = checkin.getDefaultRemark(stage.stage_id, groupKey, resource)
    this.setData({
      showCheckin: true,
      currentGroup: { key: groupKey, label: groupLabel },
      currentResource: resource,
      durationInput: '20',
      remarkInput: defaultRemark
    })
  },

  closeCheckin() {
    this.setData({ showCheckin: false })
  },

  // 阻止弹层内容区点击冒泡关闭
  noop() {},

  onDurationInput(e) {
    this.setData({ durationInput: e.detail.value })
  },

  // 快捷时长按钮
  quickDuration(e) {
    const { val } = e.currentTarget.dataset
    this.setData({ durationInput: String(val) })
  },

  onRemarkInput(e) {
    this.setData({ remarkInput: e.detail.value })
  },

  submitCheckin() {
    const { currentGroup, currentResource, durationInput, remarkInput, stage } = this.data
    if (!currentGroup || !currentResource) return

    const raw = String(durationInput || '').trim()
    if (!raw) {
      wx.showToast({ title: '请输入时长', icon: 'none' })
      return
    }
    const num = Number(raw)
    if (!isFinite(num) || num <= 0) {
      wx.showToast({ title: '时长需为正数', icon: 'none' })
      return
    }
    if (num > 999) {
      wx.showToast({ title: '时长过大,请确认', icon: 'none' })
      return
    }
    const minutes = Math.round(num)
    if (minutes <= 0) {
      wx.showToast({ title: '时长不足 1 分钟', icon: 'none' })
      return
    }

    const remarkText = String(remarkInput || '').trim()

    checkin.addCheckin({
      stageId: stage.stage_id,
      stageName: stage.stage_name,
      groupKey: currentGroup.key,
      groupLabel: currentGroup.label,
      resourceName: currentResource,
      durationMinutes: minutes,
      remark: remarkText
    })

    // 保存备注为默认值
    checkin.saveDefaultRemark(stage.stage_id, currentGroup.key, currentResource, remarkText)

    // 通知首页数据已变更
    try {
      const app = getApp()
      if (app && app.globalData) app.globalData.checkinDirty = true
    } catch (e) {}

    const resKey = `${currentGroup.key}|${currentResource}`
    const newTotal = checkin.todayTotalByResource(stage.stage_id, currentGroup.key, currentResource)
    this.setData({
      showCheckin: false,
      [`resTotals.${resKey}`]: newTotal
    })

    wx.showToast({ title: `已打卡 ${checkin.fmtMinutes(minutes)}`, icon: 'success' })
  }
})
