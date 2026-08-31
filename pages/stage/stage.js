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

// 解析目标时长: '60-80H' -> {min:60,max:80}，'60H' -> {min:60,max:60}
function parseTargetHours(text) {
  if (!text) return null
  const range = text.match(/(\d+)\s*-\s*(\d+)/)
  if (range) return { min: +range[1], max: +range[2] }
  const single = text.match(/(\d+)/)
  if (single) return { min: +single[1], max: +single[1] }
  return null
}

// 从 phase 字符串中提取数字，如 'phase5' -> 5
function parsePhaseNumber(text) {
  if (!text) return 0
  const m = String(text).match(/phase\s*(\d+)/i)
  return m ? +m[1] : 0
}

// 是否为常规阶段
function isRegularStage(stageId) {
  return /^regular_\d+$/.test(stageId)
}

// 解析阶段晋级所需时长（小时）
// 优先从 promotion_standard 中提取；涉及“累计”时返回累计小时
function getRequiredHours(stage) {
  const standard = stage.promotion_standard || ''
  // 累计投入时间，如“常规1-6累计投入时间不低于400H”
  const accumulated = standard.match(/累计.*?投入.*?不低于\s*(\d+)\s*[Hh]/)
  if (accumulated) {
    return { type: 'accumulated', hours: +accumulated[1] }
  }
  const total = standard.match(/累计总投入.*?不低于\s*(\d+)\s*[Hh]/)
  if (total) {
    return { type: 'accumulated', hours: +total[1] }
  }
  // 普通时间要求，回退到 time_investment
  const target = parseTargetHours(stage.time_investment)
  if (target) {
    return { type: 'stage', hours: target.min }
  }
  return { type: 'stage', hours: 0 }
}

Page({
  data: {
    stage: null,
    stageIndex: -1,
    stageLocked: false,
    stageStatus: 'locked', // 'current' | 'completed' | 'locked'
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
    readCounts: {},
    // 晋级信息
    canPromote: false,
    promoteEnabled: false,
    requiredHours: 0,
    requiredType: 'stage',
    investedHoursText: '0',
    timeMet: false,
    progressPercent: 0,
    // 晋级弹窗
    showPromoteModal: false,
    promoteTargetPhase: 0,
    promoteTargetPhaseText: '',
    youquTestInput: ''
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

    // 计算当前阶段索引，判断状态
    const currentStage = checkin.getCurrentStage()
    let currentIndex = -1
    routeData.stages.forEach((s, i) => {
      if (currentStage && s.stage_id === currentStage.id) currentIndex = i
    })
    const stageStatus = currentIndex < 0 ? 'locked' :
      (index === currentIndex ? 'current' :
        (index < currentIndex ? 'completed' : 'locked'))
    const stageLocked = stageStatus !== 'current'

    // 锁定时所有分组不可点击打卡
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
    this.setData({ stage, stageIndex: index, stageLocked, stageStatus, resourceGroups: groups })
    this._refreshResTotals()
    this._refreshReadCounts()
    this._refreshPromoteInfo()
  },

  onShow() {
    if (this.data.stage) {
      // 重新计算状态（当前阶段可能在设置页改变）
      const currentStage = checkin.getCurrentStage()
      let currentIndex = -1
      routeData.stages.forEach((s, i) => {
        if (currentStage && s.stage_id === currentStage.id) currentIndex = i
      })
      const idx = this.data.stageIndex
      const stageStatus = currentIndex < 0 ? 'locked' :
        (idx === currentIndex ? 'current' :
          (idx < currentIndex ? 'completed' : 'locked'))
      const stageLocked = stageStatus !== 'current'
      this.setData({ stageLocked, stageStatus })
      this._refreshResTotals()
      this._refreshReadCounts()
      this._refreshPromoteInfo()
    }
  },

  // 刷新晋级信息：当前常规阶段展示进度与晋级入口
  _refreshPromoteInfo() {
    const stage = this.data.stage
    if (!stage) return

    const isRegular = isRegularStage(stage.stage_id)
    const isCurrent = this.data.stageStatus === 'current'
    const required = getRequiredHours(stage)

    let minutes = 0
    if (required.type === 'accumulated') {
      minutes = checkin.getAccumulatedMinutes(stage.stage_id)
    } else {
      minutes = checkin.getStageMinutes(stage.stage_id)
    }
    const hours = minutes / 60
    const timeMet = required.hours > 0 ? hours >= required.hours : false
    const progressPercent = required.hours > 0 ? Math.min(100, Math.round(hours / required.hours * 100)) : 0
    const targetPhaseNum = parsePhaseNumber(stage.target_phase)

    this.setData({
      canPromote: isRegular && isCurrent,
      promoteEnabled: isRegular && isCurrent && timeMet,
      requiredHours: required.hours,
      requiredType: required.type,
      investedHoursText: `${(+hours).toFixed(1)}`.replace(/\.0$/, ''),
      timeMet,
      progressPercent,
      promoteTargetPhase: targetPhaseNum,
      promoteTargetPhaseText: targetPhaseNum ? `phase${targetPhaseNum}` : ''
    })
  },

  // 点击晋级按钮
  onPromoteTap() {
    const stage = this.data.stage
    if (!stage || !this.data.promoteEnabled) return

    const youquEnabled = checkin.isYouquPlanEnabled()
    if (youquEnabled && this.data.promoteTargetPhase > 0) {
      // 开启小小优趣成长计划：需输入测试结果
      this.setData({
        showPromoteModal: true,
        youquTestInput: ''
      })
    } else {
      // 未开启：直接确认晋级
      wx.showModal({
        title: '确认晋级',
        content: `${stage.stage_name} 时间投入已达标，确认晋级到下一阶段？`,
        confirmText: '晋级',
        cancelText: '取消',
        confirmColor: '#4a90d9',
        success: (res) => {
          if (res.confirm) {
            this.doPromote()
          }
        }
      })
    }
  },

  // 关闭晋级弹窗
  closePromoteModal() {
    this.setData({
      showPromoteModal: false,
      youquTestInput: ''
    })
  },

  // 输入测试结果
  onYouquTestInput(e) {
    this.setData({ youquTestInput: e.detail.value })
  },

  // 快捷输入目标 phase
  quickYouquPhase(e) {
    const { val } = e.currentTarget.dataset
    this.setData({ youquTestInput: String(val) })
  },

  // 提交晋级（含测试结果校验）
  submitPromote() {
    const stage = this.data.stage
    if (!stage) return

    const raw = String(this.data.youquTestInput || '').trim()
    if (!raw) {
      wx.showToast({ title: '请输入测试结果', icon: 'none' })
      return
    }
    // 兼容 'phase5' 或 '5' 两种输入
    const testPhase = parsePhaseNumber(raw) || Number(raw)
    if (!isFinite(testPhase) || testPhase <= 0 || !Number.isInteger(testPhase)) {
      wx.showToast({ title: '请输入有效 phase 整数', icon: 'none' })
      return
    }

    if (testPhase < this.data.promoteTargetPhase) {
      wx.showModal({
        title: '测试结果未达标',
        content: `${stage.stage_name} 晋级要求稳定达到 ${this.data.promoteTargetPhaseText}，当前测试结果 phase${testPhase} 未达标，建议继续积累后再晋级。`,
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#4a90d9'
      })
      return
    }

    this.closePromoteModal()
    this.doPromote()
  },

  // 执行晋级
  doPromote() {
    const stage = this.data.stage
    const nextIndex = this.data.stageIndex + 1
    if (nextIndex >= routeData.stages.length) {
      wx.showToast({ title: '已是最后阶段', icon: 'none' })
      return
    }

    const nextStage = routeData.stages[nextIndex]
    const stageData = {
      id: nextStage.stage_id,
      name: nextStage.stage_name,
      targetPhase: nextStage.target_phase,
      vocabularyTarget: nextStage.vocabulary_target,
      timeInvestment: nextStage.time_investment
    }

    checkin.setCurrentStage(stageData)

    // 通知首页数据已变更
    try {
      const app = getApp()
      if (app && app.globalData) app.globalData.checkinDirty = true
    } catch (e) {}

    wx.showToast({
      title: `已晋级：${nextStage.stage_name}`,
      icon: 'success'
    })

    // 刷新本页状态（本阶段变为已完成，晋级入口消失）
    this.onShow()
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
    if (this.data.stageStatus === 'locked') {
      wx.showToast({ title: '当前阶段未解锁，不可打卡', icon: 'none' })
      return
    }
    if (this.data.stageStatus === 'completed') {
      wx.showToast({ title: '本阶段已完成，仅可查看', icon: 'none' })
      return
    }
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
