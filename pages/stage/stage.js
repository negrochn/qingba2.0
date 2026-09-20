const { routeData, getRequiredHours, listeningFactor, listeningTip } = require('../../utils/data.js')
const resources = require('../../utils/resources.js')
const checkin = require('../../utils/checkin.js')
const theme = require('../../utils/theme.js')
const share = require('../../utils/share.js')

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

// 资源行左滑露出的操作区宽度（rpx）：读完 / 撤销 各 150rpx，与 .swipe-bg 样式保持一致
const SWIPE_W = 300

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
      fusion_apps: true,
      listening_audio: true   // 熏听（是否展示由设置页开关决定）
    },
    // 分组进度摘要 { groupKey: { todayMin } }
    groupProgress: {},
    // 打卡弹窗
    showCheckin: false,
    currentGroup: null,       // { key, label }
    currentResource: '',      // 资源名（展示）
    currentResourceId: '',    // 资源 id（读写 key）
    durationInput: '',    // 输入框(分钟数值文本)
    remarkInput: '',      // 备注输入
    listeningFactor: 1,   // 当前资源所属分组的折算系数（非熏听恒为 1）
    listeningTip: '',     // 熏听折算提示（仅熏听分组显示）
    // 资源今日累计打卡(展示徽标用) { "groupKey|资源名": 分钟 }
    resTotals: {},       // 原始投入（徽标与「今日已打卡 X 分钟」）
    resEffective: {},    // 有效时长（熏听行补「有效 X 分钟」，与统计 / 进度同口径）
    readCounts: {},
    // 晋级信息
    canPromote: false,
    promoteEnabled: false,
    requiredHours: 0,
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

  // 同步"实际是否深色"（固定跟随系统 / 微信主题），供 JS 侧深色判断
  // 旧实现读 app._systemDark，而该字段全项目从未赋值 —— 系统深色时会判成浅色
  _syncDark() {
    this.setData({ isDark: theme.isDarkNow() })
  },

  // 分享给好友：标题带上当前阶段名（未取到阶段时回落默认文案）
  onShareAppMessage() {
    const stage = this.data.stage
    return share.appMessage('stage', stage ? {
      title: `${stage.stage_name} · 陪孩子练英语听力`
    } : null)
  },

  onLoad(options) {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this._syncDark()

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

    // 为左滑准备字段：_path 用于 setData 精确定位，_dx 为位移（rpx），_anim 控制回弹动画
    groups.forEach((g, gi) => {
      g.items.forEach((res, ri) => {
        res._path = `resourceGroups[${gi}].items[${ri}]`
        res._dx = 0
        res._anim = false
      })
    })

    wx.setNavigationBarTitle({ title: stage.stage_name })
    this.setData({ stage, stageIndex: index, stageLocked, stageStatus, resourceGroups: groups })
    this._refreshResTotals()
    this._refreshReadCounts()
    this._refreshPromoteInfo()
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this._syncDark()

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
      // 从其他页返回时收起展开中的左滑操作区
      this._closeSwipe()
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
    const required = getRequiredHours(stage, checkin.getTargetOption(stage.stage_id))

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

    // isLastStage / alreadyDone 只参与上面的文案与准入判断，无需下发到视图
    this.setData({
      canPromote: isRegular && isCurrent && !alreadyDone,
      promoteEnabled: isRegular && isCurrent && timeMet && !alreadyDone,
      requiredHours: required.hours,
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
        // 文案压到 6 个汉字以内：带 icon 的 toast 标题超过约 7 个汉字会被截断
        title: `已达成：${stage.stage_name}`,
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
    const totals = {}        // 原始投入（徽标 / 副文）
    const effective = {}     // 有效时长（熏听行的「有效 X 分钟」）
    const groupProgress = {}

    // 一次读取当天该阶段全部资源的时长，避免在循环内重复全量读取
    const { minutes, rawMinutes } = checkin.getDayTotalsByStage(stage.stage_id, checkin.todayStr())

    this.data.resourceGroups.forEach(g => {
      if (!g.clickable) return
      let groupToday = 0
      g.items.forEach(res => {
        // 时长 key 用资源名（记录里的名称快照）
        const minKey = `${g.key}|${res.name}`
        // 是否「今天打过卡」按原始投入判断：熏听在常规1/2 的有效时长为 0，
        // 若按有效值判断，这些行会被当成今天没打卡（徽标与分组头都不显示）
        const raw = rawMinutes[minKey] || 0
        if (raw > 0) {
          totals[minKey] = raw
          effective[minKey] = minutes[minKey] || 0
          groupToday += raw
        }
      })
      groupProgress[g.key] = { todayMin: groupToday }
    })
    this.setData({ resTotals: totals, resEffective: effective, groupProgress })
  },

  _refreshReadCounts() {
    const stage = this.data.stage
    if (!stage) return
    const counts = checkin.getReadCountByStage(stage.stage_id)
    this.setData({ readCounts: counts })
  },

  // 点击资源标签
  onResourceTap(e) {
    // 刚发生过左滑：本次 tap 不当作点击，避免滑完误开打卡弹窗
    if (this._moved) {
      this._moved = false
      return
    }
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
    // 熏听分组按当前阶段折算（0 / 0.5 / 0.8），其余分组恒为 1
    const factor = listeningFactor(stage.stage_id, groupKey)
    // 收起左滑操作区，避免弹窗关闭后行仍停在展开态
    this._closeSwipe()
    this.setData({
      showCheckin: true,
      currentGroup: { key: groupKey, label: groupLabel },
      currentResource: resourceName,
      currentResourceId: resourceId,
      durationInput: '20',
      remarkInput: defaultRemark,
      listeningFactor: factor,
      listeningTip: listeningTip(stage.stage_id, groupKey, 20)
    })
  },

  // 切换分组展开/折叠
  onToggleGroup(e) {
    const { groupKey } = e.currentTarget.dataset
    const expandedGroups = { ...this.data.expandedGroups }
    expandedGroups[groupKey] = !expandedGroups[groupKey]
    this.setData({ expandedGroups })
    // 折叠会让行卸载，先收起展开中的左滑操作区，避免重新展开时行仍停在滑开态
    this._closeSwipe()
  },

  // ===== 资源行左滑：露出「读完 +1 / 撤销 −1」操作区 =====
  // 行路径形如 resourceGroups[0].items[2]，用于 setData 精确定位（手势原语同打卡记录页 / 我的资源）
  _findRow(path) {
    const m = /^resourceGroups\[(\d+)\]\.items\[(\d+)\]$/.exec(path || '')
    if (!m) return null
    const g = this.data.resourceGroups[Number(m[1])]
    const it = g && g.items[Number(m[2])]
    return it || null
  },

  // 吸附：滑过一半即展开，否则回弹
  _snapDx(dx) {
    return dx <= -SWIPE_W / 2 ? -SWIPE_W : 0
  },

  // 收起全部已展开的操作区（打开打卡弹窗 / 从其他页返回时调用）
  _closeSwipe() {
    const patch = {}
    this.data.resourceGroups.forEach(g => {
      g.items.forEach(res => {
        if (res._dx) {
          patch[res._path + '._dx'] = 0
          patch[res._path + '._anim'] = true
        }
      })
    })
    if (Object.keys(patch).length) this.setData(patch)
  },

  onSwipeStart(e) {
    const { path, swipeable } = e.currentTarget.dataset
    // 未解锁 / 不参与打卡的行不响应滑动
    if (!path || !swipeable) return
    const t = e.touches[0]
    this._moved = false
    this._lastDx = 0

    // 关闭其他已展开的行，并让本行进入「拖动中」（关动画）
    const patch = {
      _curSwipePath: path,
      _touchStartX: t.clientX
    }
    this.data.resourceGroups.forEach(g => {
      g.items.forEach(res => {
        if (res._path !== path && res._dx) {
          patch[res._path + '._dx'] = 0
          patch[res._path + '._anim'] = true
        }
      })
    })
    patch[path + '._anim'] = false
    this.setData(patch)
  },

  onSwipeMove(e) {
    const path = this.data._curSwipePath
    if (!path) return
    const t = e.touches[0]
    // px → rpx（约 2 倍，与打卡记录页同口径）
    let newDx = (t.clientX - this.data._touchStartX) * 2
    if (newDx < -(SWIPE_W + 20)) newDx = -(SWIPE_W + 20)
    if (newDx > 10) newDx = 10
    // 有实际位移才算滑动（用于抑制滑动结束后的误点击）
    if (Math.abs(newDx) > 10) this._moved = true

    // 节流：位移变化小于 2rpx 时跳过，避免高频 setData 掉帧
    if (this._swipePath === path && Math.abs(newDx - this._lastDx) < 2) return
    this._swipePath = path
    this._lastDx = newDx
    this.setData({ [path + '._dx']: newDx })
  },

  onSwipeEnd() {
    const path = this.data._curSwipePath
    if (!path) return
    const cur = this._findRow(path)
    const target = this._snapDx(cur ? (cur._dx || 0) : 0)
    this.setData({
      [path + '._dx']: target,
      [path + '._anim']: true,
      _curSwipePath: ''
    })
  },

  // 左滑操作区：读完 +1
  // 滑动本身已提供误触保护，故不再二次确认；记完即收起操作区
  // （一册记一次、同一册要隔一整轮才会再记，不存在连着点同一行，收起不打断任何流程）
  onFinishRead(e) {
    const { groupKey, resourceId } = e.currentTarget.dataset
    const stage = this.data.stage
    if (!stage || !groupKey || !resourceId) return
    // 已开始有意点击按钮，解除滑动手势的点击抑制，否则紧接着点行体会被白吞一次
    this._moved = false
    const count = checkin.incrementReadCount(stage.stage_id, groupKey, resourceId)
    this._applyReadCount(groupKey, resourceId, count)
    this._closeSwipe()
    this._tapFeedback()
  },

  // 左滑操作区：撤销上一次「读完」
  onUndoFinishRead(e) {
    const { groupKey, resourceId } = e.currentTarget.dataset
    const stage = this.data.stage
    if (!stage || !groupKey || !resourceId) return
    this._moved = false
    const cur = this.data.readCounts[`${groupKey}|${resourceId}`] || 0
    if (cur <= 0) {
      wx.showToast({ title: '还没有读完记录', icon: 'none' })
      return
    }
    const count = checkin.decrementReadCount(stage.stage_id, groupKey, resourceId)
    this._applyReadCount(groupKey, resourceId, count)
    this._closeSwipe()
    this._tapFeedback()
  },

  // 轻震动确认「记上了」（不支持的基础库 / 机型静默忽略）
  _tapFeedback() {
    try {
      wx.vibrateShort({ type: 'light', fail: () => {} })
    } catch (err) {}
  },

  // 同步已读次数到行内徽标（左侧方块）
  _applyReadCount(groupKey, resourceId, count) {
    this.setData({ [`readCounts.${groupKey}|${resourceId}`]: count })
  },

  closeCheckin() {
    this.setData({ showCheckin: false })
  },

  onDurationInput(e) {
    const v = e.detail.value
    this.setData({ durationInput: v })
    this._refreshListeningTip(v)
  },

  // 快捷时长按钮
  quickDuration(e) {
    const { val } = e.currentTarget.dataset
    this.setData({ durationInput: String(val) })
    this._refreshListeningTip(val)
  },

  // 熏听折算提示随时长变化更新（非熏听分组 listeningFactor 为 1，直接跳过）
  _refreshListeningTip(minutes) {
    if (this.data.listeningFactor === 1) return
    const stage = this.data.stage
    const g = this.data.currentGroup
    if (!stage || !g) return
    this.setData({ listeningTip: listeningTip(stage.stage_id, g.key, minutes) })
  },

  onRemarkInput(e) {
    this.setData({ remarkInput: e.detail.value })
  },

  submitCheckin() {
    // 防重复提交：双击时两次事件会在 setData 渲染前先后进入本方法，写入两条记录
    if (this._submitting) return
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

    this._submitting = true
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
      this._submitting = false
      wx.showToast({ title: '保存失败,请检查存储空间', icon: 'none' })
      return
    }

    // 保存备注为默认值
    checkin.saveDefaultRemark(stage.stage_id, currentGroup.key, currentResourceId, remarkText)

    // 有效时长：熏听分组按系数折算（0 / 0.5 / 0.8），其余分组与原始值相同
    // 徽标与分组今日时长展示的是「原始投入」，有效值只用于熏听行副文的「有效 X 分钟」
    // （统计与阶段进度另行按有效值算）
    const factor = typeof this.data.listeningFactor === 'number' ? this.data.listeningFactor : 1
    const effMinutes = Math.round(minutes * factor)

    const resKey = `${currentGroup.key}|${currentResource}`
    // 基于本地值累加，避免再触发一次全量读取
    const newTotal = (Number(this.data.resTotals[resKey]) || 0) + minutes
    const newEffective = (Number(this.data.resEffective[resKey]) || 0) + effMinutes
    
    // 更新分组今日时长
    const groupProgress = { ...this.data.groupProgress }
    const prev = groupProgress[currentGroup.key] || { todayMin: 0 }
    groupProgress[currentGroup.key] = { todayMin: prev.todayMin + minutes }
    
    // 整体下发两个 map：资源名可能含 . [ ]（如「RAZ D.2」），
    // 用 `resTotals.${resKey}` 这种 dataPath 会被解析成多级路径，导致该行徽标不刷新
    const resTotals = { ...this.data.resTotals, [resKey]: newTotal }
    const resEffective = { ...this.data.resEffective, [resKey]: newEffective }

    this.setData({
      showCheckin: false,
      resTotals,
      resEffective,
      groupProgress
    })
    this._submitting = false

    // 打卡成功后刷新阶段进度（按钮填色 / 已投入时长 / 可完成态）
    this._refreshPromoteInfo()

    // toast 只报「原始时长」，两档统一带对勾：带 icon 的标题超过约 7 个汉字会被截断，
    // 而「有效 X」在弹窗提示行、阶段页徽标与记录页都能看到，不必挤进 toast
    wx.showToast({
      title: `已打卡 ${checkin.fmtMinutes(minutes)}`,
      icon: 'success'
    })
  }
})
