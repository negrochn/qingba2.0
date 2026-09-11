const { routeData, getRequiredHours } = require('../../utils/data.js')
const resources = require('../../utils/resources.js')
const checkin = require('../../utils/checkin.js')
const theme = require('../../utils/theme.js')

// 从 phase 字符串中提取数字，如 'phase5' -> 5
function parsePhaseNumber(text) {
  if (!text) return 0
  const m = String(text).match(/phase\s*(\d+)/i)
  return m ? +m[1] : 0
}

// 是否为常规阶段（含准桥梁，均支持晋级/达成目标）
function isRegularStage(stageId) {
  return /^regular_\d+$/.test(stageId) || stageId === 'pre_bridge'
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
    currentGroup: null,       // { key, label }
    currentResource: '',      // 资源名（展示）
    currentResourceId: '',    // 资源 id（读写 key）
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
    promoteFillStyle: '',
    remainHoursText: '',
    // 晋级弹窗
    showPromoteModal: false,
    promoteTargetPhase: 0,
    promoteTargetPhaseText: '',
    youquTestInput: '',
    fontClass: '',
    isDark: false
  },

  // 同步"实际是否深色"（结合 dm-dark 手动 / dm-auto 跟随系统），供 wxml 进度条底色判断
  _syncDark(app) {
    const systemDark = app && app._systemDark
    this.setData({ isDark: theme.isDarkMode(systemDark) })
  },

  onLoad(options) {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this._syncDark(app)

    const index = Number(options.index)
    // 索引非法时提示并返回，避免停在空白页无法退出
    if (isNaN(index) || index < 0 || index >= routeData.stages.length) {
      wx.showToast({ title: '阶段不存在', icon: 'none' })
      setTimeout(() => { wx.navigateBack() }, 800)
      return
    }

    const stage = routeData.stages[index]
    if (!stage) {
      wx.showToast({ title: '阶段不存在', icon: 'none' })
      setTimeout(() => { wx.navigateBack() }, 800)
      return
    }

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

    // 官方 + 自定义资源合并渲染（8 类均可打卡）
    const groups = resources.getStageGroups(stage.stage_id)

    wx.setNavigationBarTitle({ title: stage.stage_name })
    this.setData({ stage, stageIndex: index, stageLocked, stageStatus, resourceGroups: groups })
    this._refreshResTotals()
    this._refreshReadCounts()
    this._refreshPromoteInfo()
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this._syncDark(app)

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
    const isLastStage = this.data.stageIndex >= routeData.stages.length - 1
    const alreadyDone = checkin.isStageDone(stage.stage_id)
    const required = getRequiredHours(stage)

    let minutes = 0
    if (required.type === 'accumulated') {
      minutes = checkin.getAccumulatedMinutes(stage.stage_id)
    } else {
      minutes = checkin.getStageMinutes(stage.stage_id)
    }
    const hours = minutes / 60
    const timeMet = required.hours > 0 ? hours >= required.hours : false
    const progressPercent = required.hours > 0 ? Math.min(100, Math.floor(hours / required.hours * 100)) : 0
    const targetPhaseNum = parsePhaseNumber(stage.target_phase)
    const remainHours = required.hours > 0 ? Math.max(0, required.hours - hours) : 0
    const remainText = `${(+remainHours).toFixed(1)}`.replace(/\.0$/, '')
    // 进度填色：底色为普通按钮色，已达成部分用品牌绿从左向右填充
    const fillStyle = `background-image:linear-gradient(to right, var(--brand) 0, var(--brand) ${progressPercent}%, transparent ${progressPercent}%, transparent 100%);`
    // 按钮文案：最后阶段(准桥梁)为“完成阶段”，其余阶段为“晋级下一阶段”
    const promoteLabel = isLastStage ? '完成阶段' : '晋级下一阶段'

    this.setData({
      canPromote: isRegular && isCurrent && !alreadyDone,
      promoteEnabled: isRegular && isCurrent && timeMet && !alreadyDone,
      isLastStage,
      alreadyDone,
      requiredHours: required.hours,
      requiredType: required.type,
      investedHoursText: `${(+hours).toFixed(1)}`.replace(/\.0$/, ''),
      timeMet,
      progressPercent,
      promoteFillStyle: fillStyle,
      promoteLabel,
      remainHoursText: remainText,
      promoteTargetPhase: targetPhaseNum,
      promoteTargetPhaseText: targetPhaseNum ? `phase${targetPhaseNum}` : ''
    })
  },

  // 点击晋级按钮
  onPromoteTap() {
    const stage = this.data.stage
    if (!stage) return

    if (!this.data.promoteEnabled) {
      const remain = this.data.remainHoursText
      wx.showToast({
        title: remain > 0 ? `还需 ${remain}h 达成目标` : '暂不可完成',
        icon: 'none'
      })
      return
    }

    const youquEnabled = checkin.isYouquPlanEnabled()
    if (youquEnabled && this.data.promoteTargetPhase > 0) {
      // 开启小小优趣成长计划：需输入测试结果
      this.setData({
        showPromoteModal: true,
        youquTestInput: ''
      })
    } else {
      // 未开启：直接确认（晋级或达成目标）
      const isLast = this.data.stageIndex >= routeData.stages.length - 1
      wx.showModal({
        title: isLast ? '确认完成阶段' : '确认晋级',
        content: isLast
          ? `${stage.stage_name} 时间投入已达标，确认标记为已完成？`
          : `${stage.stage_name} 时间投入已达标，确认晋级到下一阶段？`,
        confirmText: isLast ? '完成' : '晋级',
        cancelText: '取消',
        confirmColor: '#07C160',
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
        confirmColor: '#07C160'
      })
      return
    }

    this.closePromoteModal()
    this.doPromote()
  },

  // 执行晋级
  doPromote() {
    const stage = this.data.stage
    // 最后阶段（准桥梁）：不推进，显式记录为已完成（达成目标）
    if (this.data.stageIndex >= routeData.stages.length - 1) {
      checkin.markStageDone(stage.stage_id)
      wx.showToast({
        title: `已达成目标：${stage.stage_name}`,
        icon: 'success'
      })
      // 返回路线页并滚动到当前（已达成）阶段
      this._backToRoute()
      return
    }

    const nextIndex = this.data.stageIndex + 1
    const nextStage = routeData.stages[nextIndex]

    this._applyPromote(nextStage)
  },

  // 真正推进到下一阶段
  _applyPromote(nextStage) {
    const stageData = {
      id: nextStage.stage_id,
      name: nextStage.stage_name,
      targetPhase: nextStage.target_phase,
      vocabularyTarget: nextStage.vocabulary_target,
      timeInvestment: nextStage.time_investment
    }

    checkin.setCurrentStage(stageData)

    wx.showToast({
      title: `已晋级：${nextStage.stage_name}`,
      icon: 'success'
    })

    // 返回路线页并滚动到新当前阶段
    this._backToRoute()
  },

  // 晋级/达成后返回路线页并滚动到当前阶段
  _backToRoute() {
    const app = getApp()
    if (app && app.globalData) app.globalData.scrollToCurrentStage = true
    // 延迟返回，确保成功 toast 可见
    setTimeout(() => {
      wx.navigateBack({
        fail() {
          wx.switchTab({ url: '/pages/route/route' })
        }
      })
    }, 700)
  },

  _refreshResTotals() {
    const stage = this.data.stage
    if (!stage) return
    const totals = {}
    const groupProgress = {}

    // 一次读取当天该阶段全部资源的时长与已读次数，避免在循环内重复全量读取
    const { minutes, readCounts } = checkin.getDayTotalsByStage(stage.stage_id, checkin.todayStr())

    this.data.resourceGroups.forEach(g => {
      if (!g.clickable) return
      let groupToday = 0
      let groupReadCount = 0
      g.items.forEach(res => {
        // 时长 key 用资源名（记录里的名称快照），已读次数 key 用资源 id
        const minKey = `${g.key}|${res.name}`
        const readKey = `${g.key}|${res.id}`
        const min = minutes[minKey] || 0
        if (min > 0) {
          totals[minKey] = min
          groupToday += min
        }
        // 统计该组已读总数
        groupReadCount += readCounts[readKey] || 0
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
    const { groupKey, groupLabel, resourceId, resourceName } = e.currentTarget.dataset
    if (this.data.stageStatus === 'locked') {
      wx.showToast({ title: '当前阶段未解锁，不可打卡', icon: 'none' })
      return
    }
    if (this.data.stageStatus === 'completed') {
      wx.showToast({ title: '本阶段已完成，仅可查看', icon: 'none' })
      return
    }
    const stage = this.data.stage
    const defaultRemark = checkin.getDefaultRemark(stage.stage_id, groupKey, resourceId)
    const readCount = checkin.getReadCount(stage.stage_id, groupKey, resourceId)
    this.setData({
      showCheckin: true,
      currentGroup: { key: groupKey, label: groupLabel },
      currentResource: resourceName,
      currentResourceId: resourceId,
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
    const { currentGroup, currentResource, currentResourceId, stage } = this.data
    if (!currentGroup || !currentResource) return
    wx.showModal({
      title: '确认已读完',
      content: `《${currentResource}》标记为已读完？`,
      confirmText: '确认',
      cancelText: '取消',
      confirmColor: '#ff7a45',
      success: (res) => {
        if (!res.confirm) return
        const count = checkin.incrementReadCount(stage.stage_id, currentGroup.key, currentResourceId)

        // 更新分组进度中的已读数
        const groupProgress = { ...this.data.groupProgress }
        const prev = groupProgress[currentGroup.key] || { todayMin: 0, readCount: 0 }
        groupProgress[currentGroup.key] = {
          todayMin: prev.todayMin,
          readCount: prev.readCount + 1
        }

        this.setData({
          currentReadCount: count,
          [`readCounts.${currentGroup.key}|${currentResourceId}`]: count,
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
    const { currentGroup, currentResource, currentResourceId, durationInput, remarkInput, stage } = this.data
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

    const record = checkin.addCheckin({
      stageId: stage.stage_id,
      stageName: stage.stage_name,
      groupKey: currentGroup.key,
      groupLabel: currentGroup.label,
      resourceId: currentResourceId,
      resourceName: currentResource,
      durationMinutes: minutes,
      remark: remarkText
    })

    // 保存失败（如本地存储已满）时不提示成功
    if (!record) {
      wx.showToast({ title: '保存失败,请检查存储空间', icon: 'none' })
      return
    }

    // 保存备注为默认值
    checkin.saveDefaultRemark(stage.stage_id, currentGroup.key, currentResourceId, remarkText)

    const resKey = `${currentGroup.key}|${currentResource}`
    // 基于本地值累加，避免再触发一次全量读取
    const newTotal = (Number(this.data.resTotals[resKey]) || 0) + minutes
    
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

    // 打卡成功后刷新阶段进度（按钮填色 / 已投入时长 / 可完成态）
    this._refreshPromoteInfo()

    wx.showToast({
      title: `已打卡 ${checkin.fmtMinutes(minutes)}`,
      icon: 'success'
    })
  }
})
