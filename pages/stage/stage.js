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
    stageIndex: -1,
    stageLocked: false,
    resourceGroups: [],
    // 分组展开状态：默认全部展开
    expandedGroups: {
      main_picture_books: true,
      main_graded_readers: true,
      main_animations: true,
      sub_graded_readers: true,
      sub_animations: true,
      fun_extensions: true,
      science_extensions: true,
      fusion_apps: true
    },
    // 分组进度摘要 { groupKey: { todayMin, readCount } }
    groupProgress: {},
    // 打卡弹窗
    showCheckin: false,
    currentGroup: null,   // { key, label }
    currentResource: '',  // 资源名
    durationInput: '',    // 输入框(分钟数值文本)
    remarkInput: '',      // 备注输入
    currentReadCount: 0,  // 当前资源已读次数
    // 资源今日累计打卡(展示徽标用) { "groupKey|资源名": 分钟 }
    resTotals: {},
    readCounts: {}
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

    // 计算当前阶段索引，判断是否锁定
    const currentStage = checkin.getCurrentStage()
    let currentIndex = -1
    routeData.stages.forEach((s, i) => {
      if (currentStage && s.stage_id === currentStage.id) currentIndex = i
    })
    const stageLocked = currentIndex >= 0 && index > currentIndex

    // 锁定时所有分组不可点击打卡
    const groups = []
    order.forEach(k => {
      const list = stage.resources[k]
      if (list && list.length) {
        groups.push({
          key: k,
          label: resourceLabels[k] || k,
          items: list,
          clickable: !stageLocked && CLICKABLE_GROUPS.indexOf(k) >= 0
        })
      }
    })

    wx.setNavigationBarTitle({ title: stage.stage_name })
    this.setData({ stage, stageIndex: index, stageLocked, resourceGroups: groups })
    this._refreshResTotals()
    this._refreshReadCounts()
  },

  onShow() {
    if (this.data.stage) {
      // 重新计算锁定状态（当前阶段可能在设置页改变）
      const currentStage = checkin.getCurrentStage()
      let currentIndex = -1
      routeData.stages.forEach((s, i) => {
        if (currentStage && s.stage_id === currentStage.id) currentIndex = i
      })
      const stageLocked = currentIndex >= 0 && this.data.stageIndex > currentIndex
      const groups = this.data.resourceGroups.map(g => ({
        ...g,
        clickable: !stageLocked && CLICKABLE_GROUPS.indexOf(g.key) >= 0
      }))
      this.setData({ stageLocked, resourceGroups: groups })
      this._refreshResTotals()
      this._refreshReadCounts()
    }
  },

  _refreshResTotals() {
    const stage = this.data.stage
    if (!stage) return
    const totals = {}
    const groupProgress = {}
    this.data.resourceGroups.forEach(g => {
      if (!g.clickable) return
      let groupToday = 0
      let groupReadCount = 0
      g.items.forEach(name => {
        const min = checkin.todayTotalByResource(stage.stage_id, g.key, name)
        if (min > 0) {
          totals[`${g.key}|${name}`] = min
          groupToday += min
        }
        // 统计该组已读总数
        const rc = checkin.getReadCount(stage.stage_id, g.key, name)
        groupReadCount += rc
      })
      groupProgress[g.key] = {
        todayMin: groupToday,
        readCount: groupReadCount
      }
    })
    this.setData({ resTotals: totals, groupProgress })
  },

  _refreshReadCounts() {
    const stage = this.data.stage
    if (!stage) return
    const counts = checkin.getReadCountByStage(stage.stage_id)
    this.setData({ readCounts: counts })
  },

  // 点击资源标签
  onResourceTap(e) {
    const { groupKey, groupLabel, resource } = e.currentTarget.dataset
    const clickable = CLICKABLE_GROUPS.indexOf(groupKey) >= 0
    if (!clickable) return
    const stage = this.data.stage
    const defaultRemark = checkin.getDefaultRemark(stage.stage_id, groupKey, resource)
    const readCount = checkin.getReadCount(stage.stage_id, groupKey, resource)
    this.setData({
      showCheckin: true,
      currentGroup: { key: groupKey, label: groupLabel },
      currentResource: resource,
      durationInput: '20',
      remarkInput: defaultRemark,
      currentReadCount: readCount
    })
  },

  // 切换分组展开/折叠
  onToggleGroup(e) {
    const { groupKey } = e.currentTarget.dataset
    const expandedGroups = { ...this.data.expandedGroups }
    expandedGroups[groupKey] = !expandedGroups[groupKey]
    this.setData({ expandedGroups })
  },

  // 读完：二次确认后已读次数+1
  onReadFinish() {
    const { currentGroup, currentResource, stage } = this.data
    if (!currentGroup || !currentResource) return
    wx.showModal({
      title: '确认已读完',
      content: `《${currentResource}》标记为已读完？`,
      confirmText: '确认',
      cancelText: '取消',
      confirmColor: '#ff7a45',
      success: (res) => {
        if (!res.confirm) return
        const count = checkin.incrementReadCount(stage.stage_id, currentGroup.key, currentResource)
        
        // 更新分组进度中的已读数
        const groupProgress = { ...this.data.groupProgress }
        const prev = groupProgress[currentGroup.key] || { todayMin: 0, readCount: 0 }
        groupProgress[currentGroup.key] = {
          todayMin: prev.todayMin,
          readCount: prev.readCount + 1
        }
        
        this.setData({
          currentReadCount: count,
          [`readCounts.${currentGroup.key}|${currentResource}`]: count,
          groupProgress
        })
        wx.showToast({ title: `已读完(${count}次)`, icon: 'success' })
      }
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
    
    // 更新分组进度
    const groupProgress = { ...this.data.groupProgress }
    const prev = groupProgress[currentGroup.key] || { todayMin: 0, readCount: 0 }
    groupProgress[currentGroup.key] = {
      todayMin: prev.todayMin + minutes,
      readCount: prev.readCount
    }
    
    this.setData({
      showCheckin: false,
      [`resTotals.${resKey}`]: newTotal,
      groupProgress
    })

    wx.showToast({
      title: `已打卡 ${checkin.fmtMinutes(minutes)}`,
      icon: 'success'
    })
  }
})
