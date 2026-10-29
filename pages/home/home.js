const checkin = require('../../utils/checkin.js')
const children = require('../../utils/children.js')
const { getRequiredHours, isRouteCompleted } = require('../../utils/data.js')
const share = require('../../utils/share.js')
const backup = require('../../utils/backup.js')
const cloudBackup = require('../../utils/cloudBackup.js')

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// 毕业卡文案：按路线区分（key = ROUTES.id，未知路线兜底常规）
const GRAD_TEXTS = {
  bigloop: { title: '大循环路线圆满收官', subtitle: '从慢半拍的孩子，变成并肩的同伴' },
  regular: { title: '常规路线圆满完成', subtitle: '从听故事的人，变成读故事的人' }
}
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

// 按小时给出时间问候（英文）
function greetByHour(h) {
  if (h < 6) return 'Early morning'
  if (h < 11) return 'Good morning'
  if (h < 13) return 'Good noon'
  if (h < 18) return 'Good afternoon'
  if (h < 22) return 'Good evening'
  return 'Good night'
}

// 分钟 -> 小时文本（去尾零：12.5 / 0 / 60）
function fmtHours(minutes) {
  const v = Number(minutes) / 60
  if (!v) return '0'
  return v % 1 === 0 ? String(v) : v.toFixed(1)
}

// 分钟 -> { h, m } 结构（首页「数字大 / 单位小」的分段排版用）
function splitDuration(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  return { h: Math.floor(m / 60), m: m % 60 }
}

// 分钟 -> 小时文本（固定 1 位小数：12.5 / 1.0 / 0.0），首页阶段时长用
function fmtHoursFixed(minutes) {
  return (Math.max(0, Number(minutes) || 0) / 60).toFixed(1)
}

Page({
  data: {
    fontClass: '',
    darkClass: '',
    dateText: '',
    greetText: '',
    todayCount: 0,
    weekTime: { h: 0, m: 0 },          // 本周时长（分段：小时/分钟）
    weekDeltaText: '—',
    weekDeltaValue: '',                // 周环比数值（带符号）；'' = 无对比
    weekDeltaState: '',                // 周环比方向：'up' 绿 / 'down' 红 / '' 中性（持平或无对比）
    weekBars: [],
    activeBar: -1,                     // 周柱状图选中柱（点按气泡），-1 = 无
    barScaleText: '1小时',
    todayTime: { h: 0, m: 0 },         // 今日时长（分段）
    totalHoursText: '0.0',             // 阶段时长（小时，固定 1 位小数）
    stagePercent: 0,
    stageDays: 0,                      // 当前阶段打卡天数（去重日期数，非连续）
    hasStage: false,
    // 今日明细弹窗（今日时长 / 今日打卡 共用一套面板，随入口切换度量）
    sheetVisible: false,
    sheetMode: 'minutes',
    sheetTime: { h: 0, m: 0 },         // 弹窗汇总分段（仅 minutes 模式使用）
    sheetTitle: '',
    sheetSummaryMain: '',
    sheetItems: [],
    journeyText: '',
    // 毕业态（主链终点已完成）：庆祝卡 + 全程口径，无统计与操作入口
    graduated: false,
    gradTitle: '',
    gradSubtitle: '',
    companionDays: 0,
    allHours: '0',
    allDays: 0,
    // 孩子切换器（仅多孩显示切换箭头）：身份条头像 + 切换弹层
    isMultiChild: false,
    activeChildInitial: '',
    activeChildColor: 'green',
    activeChildName: '',
    childSheetVisible: false,
    // 阶段进度环显示值（transition 驱动，与 stagePercent 分离：先归零再赋目标值触发动画）
    ringPct: 0,
    // 备份提醒：一次性引导弹层优先，其次顶部轻条（两者不同时出现）
    guideVisible: false,
    backupTipVisible: false
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this._refreshChild()
    this._refresh()
    this._playRing()
    this._refreshBackupState()
  },

  // tab 切走时关闭弹层：原生 tabBar 层级高于页面蒙层，弹窗开着也能直接点「路线/我的」切走；
  // 切 tab 只 hide 不销毁页面，弹层状态会残留（回来还挂着蒙层，孩子列表也可能过期）。
  // 页面隐藏期间滑出动画照常走完，回来时已是干净状态
  onHide() {
    if (this.data.childSheetVisible || this.data.sheetVisible || this.data.guideVisible) {
      this.setData({ childSheetVisible: false, sheetVisible: false, guideVisible: false })
    }
    // 柱状图气泡一并收起：定时器不清会在后台仍触发 setData
    if (this._barTipTimer) { clearTimeout(this._barTipTimer); this._barTipTimer = null }
    if (this._ringTimer) { clearTimeout(this._ringTimer); this._ringTimer = null }
    this._barTouching = false
    if (this.data.activeBar !== -1) this.setData({ activeBar: -1 })
  },

  // ===== 备份提醒 =====
  // 一次性引导优先：累计满一周记录且未展示过 → 弹引导（弹出即标记，不再重复）；
  // 否则按提醒条件（从未备份/超 30 天未备份）显示顶部轻条，关闭后 30 天冷却
  _refreshBackupState() {
    try {
      if (backup.shouldShowGuide()) {
        backup.markGuideShown()
        this.setData({ guideVisible: true, backupTipVisible: false })
        return
      }
      const tipVisible = backup.shouldShowHomeTip()
      this.setData({ backupTipVisible: tipVisible })
      // 换机回落真空期修正：本地时间戳与云端缓存都空（getLastBackupTime()===0）但云端
      // 可能有快照，此时「数据仅存本机」轻条是误报——异步刷一次云端状态后复查。
      // 会话级只刷一次：从未云备份的用户（回落恒为 0）不会每次进首页都调云函数
      if (tipVisible && backup.getLastBackupTime() === 0 && !this._cloudStateRefreshed) {
        this._cloudStateRefreshed = true
        cloudBackup.refreshCloudState(() => {
          this.setData({ backupTipVisible: backup.shouldShowHomeTip() })
        })
      }
    } catch (e) {}
  },

  // 轻条 / 引导的「去备份」：直达数据管理页
  goDataBackup() {
    this.setData({ backupTipVisible: false, guideVisible: false })
    wx.navigateTo({ url: '/pages/dataBackup/dataBackup' })
  },

  // 关闭轻条：记冷却时间戳
  dismissBackupTip() {
    backup.dismissReminder()
    this.setData({ backupTipVisible: false })
  },

  closeGuide() {
    this.setData({ guideVisible: false })
  },

  // 孩子切换器状态：身份条始终显示当前孩子（单/多孩一致），仅切换箭头随多孩显隐
  _refreshChild() {
    const active = children.getActiveChild() || {}
    this.setData({
      isMultiChild: children.isMultiChild(),
      activeChildInitial: String(active.name || '').trim().charAt(0) || '·',
      activeChildColor: active.color || 'green',
      activeChildName: String(active.name || '').trim() || '宝宝'
    })
  },

  // 进度环动画：--p 需先归零上屏、再赋目标值 transition 才触发（两帧合并则直接终态）。
  // 延时 50ms 等 0% 帧渲染；旧内核不支持 @property 注册时无动画、终态正确。
  // 无阶段 / 无目标阶段 / 毕业态一律归零（环不渲染或停 0，不误报进度）
  _playRing() {
    const play = this.data.hasStage && !this.data.stageNoTarget && !this.data.graduated
    const pct = play ? this.data.stagePercent : 0
    this.setData({ ringPct: 0 })
    if (!pct) return
    if (this._ringTimer) clearTimeout(this._ringTimer)
    this._ringTimer = setTimeout(() => {
      this._ringTimer = null
      this.setData({ ringPct: pct })
    }, 50)
  },

  // 进度环点按：进阶段页。stage 页以 ?index= 定位阶段（route 页同款入口），
  // 裸跳会因索引缺失提示「阶段不存在」并自动退回
  goStage() {
    const cur = checkin.getCurrentStage()
    const stages = checkin.getCurrentRoute().stages || []
    const index = cur ? stages.findIndex(s => s.stage_id === cur.id) : -1
    if (index < 0) return
    wx.navigateTo({ url: `/pages/stage/stage?index=${index}` })
  },

  // 分享给好友：标题带上当前累计时长（比纯口号更有说服力），落地页统一首页
  onShareAppMessage() {
    const hours = Number(this.data.totalHours) || 0
    return share.appMessage('home', {
      title: hours > 0 ? `陪孩子练英语听力，已累计 ${this.data.totalHours} 小时` : ''
    })
  },

  // 主刷新：全部以「当前阶段」为口径聚合
  _refresh() {
    const now = new Date()
    const h = now.getHours()
    const wd = now.getDay()
    const dateText = `${MONTH_EN[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

    const cur = checkin.getCurrentStage()
    const stageId = cur ? cur.id : ''
    const route = checkin.getCurrentRoute()

    // 本周一（周一为周起点）
    const daysSinceMonday = wd === 0 ? 6 : wd - 1
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday)
    const todayStr = checkin.todayStr(now)
    const weekStartStr = checkin.todayStr(monday)
    // 上周起点（前 7 天）；上周同期终点 = 今天 - 7 天——环比对齐到相同天数
    // （本周 N 天 vs 上周同期 N 天），周初不再被「本周 1 天 vs 上周 7 天」压扁
    const lastMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7)
    const lastWeekStartStr = checkin.todayStr(lastMonday)
    const lastSameDayStr = checkin.todayStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7))

    const all = checkin.getAll()
    const weekDayMinutes = {}
    const lastWeekDayMinutes = {}    // 上周每日（叠色柱对比用）
    let thisWeek = 0
    let lastWeek = 0
    let todayMinutes = 0
    let todayCount = 0
    let totalMinutes = 0
    const daysSet = new Set()

    for (const day in all) {
      const list = all[day] || []
      for (const r of list) {
        if (r.stageId !== stageId) continue          // 只统计当前阶段
        const min = checkin.effectiveMinutes(r)      // 熏听时长按 factor 折算后计入
        totalMinutes += min                            // 阶段时长（当前阶段）
        daysSet.add(day)
        if (day === todayStr) {
          todayMinutes += min
          todayCount += 1                          // 今日打卡次数（当前阶段口径）
        }
        if (day >= weekStartStr && day <= todayStr) {
          weekDayMinutes[day] = (weekDayMinutes[day] || 0) + min
          thisWeek += min
        } else if (day >= lastWeekStartStr && day < weekStartStr) {
          lastWeekDayMinutes[day] = (lastWeekDayMinutes[day] || 0) + min  // 灰柱要完整上周
          if (day <= lastSameDayStr) lastWeek += min                      // 环比只取上周同期
        }
      }
    }

    // 柱状图：本周 7 天（周一~周日），叠上周同日灰柱对比。满刻度取本周+上周最大值
    // 向上取整到 0.5h（下限 1h）——两周共用同一把尺才有对比意义，
    // 柱高为对满刻度的绝对占比，配合顶部/中部/底部三条参考线与满刻度标签读数
    let maxVal = 0
    const bars = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      const ds = checkin.todayStr(d)
      // 上周同星期列：日期位移 -7 天（列 key 是本周日期，上周数据要按偏移对齐取）
      const ld = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 + i)
      const lastDs = checkin.todayStr(ld)
      const val = weekDayMinutes[ds] || 0
      const lastVal = lastWeekDayMinutes[lastDs] || 0
      if (val > maxVal) maxVal = val
      if (lastVal > maxVal) maxVal = lastVal
      bars.push({ day: ds, label: DAY_LABELS[i], isToday: ds === todayStr, lastDay: lastDs })
    }
    const scaleMinutes = Math.max(60, Math.ceil(maxVal / 30) * 30)   // 满刻度（分钟）
    const scaleH = Math.floor(scaleMinutes / 60), scaleM = scaleMinutes % 60
    const barScaleText = scaleM ? `${scaleH}小时${scaleM}分` : `${scaleH}小时`   // 参考线标签
    const weekBars = bars.map(b => {
      const val = weekDayMinutes[b.day] || 0
      // 零 = 无柱（透明轨道上零值画柱会误读成打过卡）；非零下限 2%（≈2px）：
      // 保住「打过卡必可见」的区分，又把旧下限 6% 的读数虚高压到可忽略。
      // 上周灰柱/顶线同规则、同刻度
      const percent = val > 0 ? Math.max(2, Math.round(val / scaleMinutes * 100)) : 0
      const lastVal = lastWeekDayMinutes[b.lastDay] || 0
      const lastPercent = lastVal > 0 ? Math.max(2, Math.round(lastVal / scaleMinutes * 100)) : 0
      // 点按气泡（echarts tooltip 风格）：两行「标签 + 值」左右对齐——本周行 /
      // 上周同星期行（Last Wed 比「上周」更点明对比对象）。上周行整行弱化
      // （--text2，参考值整体退后，不只弱化数值）；未来日不显示本周行——「未到」
      // 不是数据，此时气泡只剩上周同天一行。零值统一「0分钟」，不做额外弱化
      // （上周行已整行弱化，层级足够；再弱一档反而碎）
      const fmt = m => {
        const h = Math.floor(m / 60), mm = m % 60
        return h ? (mm ? `${h}小时${mm}分钟` : `${h}小时`) : `${mm}分钟`
      }
      const isFuture = !b.isToday && b.day > todayStr   // YYYY-MM-DD 字典序即时间序
      const tipRows = []
      if (!isFuture) tipRows.push({ label: b.isToday ? 'Today' : b.label, val: fmt(val), rowCls: '' })
      tipRows.push({ label: `Last ${b.label}`, val: fmt(lastVal), rowCls: 'home-bar-tip-row--sub' })
      // 气泡锚定列内最高柱顶（本周/上周谁高锚谁）：叠色柱下灰柱更高时，气泡若锚在
      // 矮的绿柱顶会「陷」在灰柱半腰。柱高 = 192rpx 轨道×max(percent, lastPercent)%，
      // + 标签区/间隙 68rpx。JS 直接拼好最终值，内联 style 只做字符串替换——
      // 规避真机 calc 乘法兼容坑。箭头独立于气泡、以列定位（恒指列中心，不受首尾
      // clamp 影响），底边=气泡底-8rpx 三角高
      const tipBase = Math.round(Math.max(percent, lastPercent) * 1.92 + 68)
      return {
        day: b.day, label: b.label, isToday: b.isToday, percent, lastPercent,
        tipRows,
        tipBottom: `${tipBase}rpx`,
        tipArrowBottom: `${tipBase - 8}rpx`
      }
    })

    // 周环比（同比口径：本周 N 天 vs 上周同期 N 天，与柱状图叠上周同星期一致；
    // 涨绿 / 跌红只作用于数值，「较上周」前缀保持中性灰）
    let weekDeltaText = '—'
    let weekDeltaValue = ''
    let weekDeltaState = ''
    if (thisWeek > 0 && lastWeek > 0) {
      const pct = Math.round((thisWeek - lastWeek) / lastWeek * 100)
      weekDeltaValue = pct >= 0 ? `+${pct}%` : `${pct}%`
      weekDeltaState = pct > 0 ? 'up' : (pct < 0 ? 'down' : '')
    } else if (thisWeek > 0) {
      weekDeltaValue = '+100%'
      weekDeltaState = 'up'
    }

    // 欢迎语：时段问候 + 名字（问候行不再承担打卡引导，职能归「今日打卡」卡）。
    // 名字拼在 js：_refreshChild 先行 setData 同步可读，wxml 只做展示
    const greet = greetByHour(h)
    const childName = this.data.activeChildName || '宝宝'
    let greetText = `${greet}, ${childName}`

    // ===== 毕业态：主链终点已被显式标记完成 → 口径整体切「全程」 =====
    // 判定是纯运行时计算：老用户零迁移，切走复习自动失效
    const graduated = cur
      ? isRouteCompleted(route.stages, cur, checkin.getCompletedStages())
      : false
    let companionDays = 0
    let allHoursText = '0'
    let allDaysCount = 0
    if (graduated) {
      let allMinutes = 0
      const allDaysSet = new Set()
      let allFirstDay = ''
      for (const day in all) {
        const list = all[day] || []
        for (const r of list) {
          if (!r || !r.stageId) continue
          allMinutes += checkin.effectiveMinutes(r)
          allDaysSet.add(day)
          if (!allFirstDay || day < allFirstDay) allFirstDay = day
        }
      }
      allHoursText = fmtHours(allMinutes)
      allDaysCount = allDaysSet.size
      if (allFirstDay) {
        companionDays = Math.max(1, Math.round(
          (checkin.dayToTimestamp(todayStr) - checkin.dayToTimestamp(allFirstDay)) / 86400000
        ) + 1)
      }
      // 毕业是状态而非时刻：祝贺语 + 名字
      greetText = `Congratulations, ${childName}`
    }
    const gradTexts = GRAD_TEXTS[route.id] || GRAD_TEXTS.regular

    // 阶段进度（与 route / stage 详情页完全同口径）；无时长目标的支线不显示百分比（显示 —）
    let stagePercent = 0
    let stageNoTarget = false
    if (cur) {
      const stageFull = route.stages.find(s => s.stage_id === cur.id)
      if (stageFull) {
        const required = getRequiredHours(stageFull, checkin.getTargetOption(cur.id))
        const minutes = required.type === 'accumulated'
          ? checkin.getAccumulatedMinutes(cur.id)
          : totalMinutes
        stageNoTarget = !(required.hours > 0)
        stagePercent = stageNoTarget
          ? 0
          : Math.min(100, Math.floor((minutes / 60) / required.hours * 100))
      }
    }

    this.setData({
      dateText,
      greetText,
      weekTime: splitDuration(thisWeek),
      weekDeltaText,
      weekDeltaValue,
      weekDeltaState,
      weekBars,
      activeBar: -1,                   // 数据重建后旧气泡失去意义，复位
      barScaleText,
      todayTime: splitDuration(todayMinutes),
      todayCount,
      totalHoursText: fmtHoursFixed(totalMinutes),   // 当前阶段累计，非全阶段
      stagePercent,
      stageNoTarget,
      stageDays: daysSet.size,        // 阶段内去重日期数（断续累计，非连续天数）
      hasStage: !!cur,
      journeyText: route.journeyText || '',
      routeName: route.name || '',
      graduated,
      gradTitle: gradTexts.title,
      gradSubtitle: gradTexts.subtitle,
      companionDays,
      allHours: allHoursText,
      allDays: allDaysCount
    })
  },

  // 欢迎卡主操作：去选择当前阶段（stagePicker 选完 navigateBack 回首页）
  goStagePicker() {
    wx.navigateTo({ url: '/pages/stagePicker/stagePicker' })
  },

  // 欢迎卡次操作：去选择当前路线（routePicker 选完 navigateBack，
  // onShow 自动刷新欢迎卡文案与路线名；阶段槽位按路线隔离，换路线后欢迎卡
  // 会重新出现，引导为新路线选阶段）
  goRoutePicker() {
    wx.navigateTo({ url: '/pages/routePicker/routePicker' })
  },

  // 点「今日时长」/「今日打卡」打开今日明细弹窗（mode: minutes | count）
  openTodaySheet(e) {
    const mode = e.currentTarget.dataset.mode === 'count' ? 'count' : 'minutes'
    this._buildSheet(mode)
    this.setData({ sheetVisible: true })
  },

  closeSheet() {
    this.setData({ sheetVisible: false })
  },

  // ===== 周柱状图触摸气泡（echarts tooltip 效果） =====
  // 触屏没有 hover：点按柱子或按住横向滑动，气泡跟随手指所在列；抬手保留，4s 自动消失
  onBarTap(e) {
    // 点按：幂等显示。不 toggle（touchstart 已显示同列，再 toggle 会「按一下闪没」），
    // 关闭交给抬手后的 4s 自动收起与 onHide
    this._showBarTip(Number(e.currentTarget.dataset.idx))
  },

  // 按下：立即定位显示，并量取柱区几何供 move 换列
  onBarsTouchStart(e) {
    const t = e.touches && e.touches[0]
    this._barTouching = !!t
    if (!t) return
    this._lastTouchX = t.clientX
    this._measureBars()
    const idx = this._hitBar(t.clientX)
    if (idx >= 0) this._showBarTip(idx, true)
  },

  // 滑动：经过哪列显示哪列（只在换列时 setData）。catchtouchmove 阻断页面滚动，
  // 图表窄条区域内竖向滚动让位于横向浏览（同基金走势图惯例）
  onBarsTouchMove(e) {
    const t = e.touches && e.touches[0]
    if (!t || !this._barTouching) return
    this._lastTouchX = t.clientX
    const idx = this._hitBar(t.clientX)
    if (idx >= 0 && idx !== this.data.activeBar) this._showBarTip(idx, true)
  },

  // 抬手/系统打断：气泡保留在手最后所在列，4s 后自动收起
  onBarsTouchEnd() {
    this._barTouching = false
    if (this.data.activeBar >= 0) this._armBarTipTimer()
  },

  // 量柱区矩形（px）。每次手势开始都重量：无缓存时序坑，也不怕布局变化；
  // 异步回来时手指未抬则按最新触点补定位，保证首次触摸不缺帧
  _measureBars() {
    wx.createSelectorQuery().in(this)
      .select('.home-hero-bars')
      .boundingClientRect(rect => {
        if (!rect || !rect.width) return
        this._barsRect = rect
        if (this._barTouching && this._lastTouchX != null) {
          const idx = this._hitBar(this._lastTouchX)
          if (idx >= 0 && idx !== this.data.activeBar) this.setData({ activeBar: idx })
        }
      }).exec()
  },

  // 触点 x → 柱下标：越界夹取到端点列，手指略滑出边界不丢气泡
  _hitBar(clientX) {
    const r = this._barsRect
    if (!r || !r.width) return -1
    return Math.max(0, Math.min(6, Math.floor((clientX - r.left) / (r.width / 7))))
  },

  // hold = 手指仍按着（start/move）：不启动自动收起，抬手时才计时
  _showBarTip(idx, hold) {
    if (this._barTipTimer) { clearTimeout(this._barTipTimer); this._barTipTimer = null }
    this.setData({ activeBar: idx })
    if (!hold && idx >= 0) this._armBarTipTimer()
  },

  _armBarTipTimer() {
    if (this._barTipTimer) { clearTimeout(this._barTipTimer); this._barTipTimer = null }
    this._barTipTimer = setTimeout(() => {
      this._barTipTimer = null
      this.setData({ activeBar: -1 })
    }, 4000)
  },

  // ===== 孩子切换 =====
  openChildSheet() {
    this.setData({ childSheetVisible: true })
  },

  closeChildSheet() {
    this.setData({ childSheetVisible: false })
  },

  // 切换成功：统计卡 / 欢迎卡 / 毕业卡整体按新孩子口径重建（onShow 同款刷新）
  onChildChanged() {
    this._refreshChild()
    this._refresh()
    this._playRing()
  },

  // 构建今日明细：口径与卡片完全一致（仅当前阶段、仅今天）
  // mode='minutes' 按时长降序；mode='count' 按次数降序
  // 行样式与占比口径对齐统计页「时长排行榜 / 读完排行榜」：榜首为 100%
  _buildSheet(mode) {
    const now = new Date()
    const todayStr = checkin.todayStr(now)
    const cur = checkin.getCurrentStage()
    const stageId = cur ? cur.id : ''
    const list = (checkin.getAll()[todayStr] || []).filter(r => r && r.stageId === stageId)

    const map = {}
    const order = []
    let totalMinutes = 0
    let totalCount = 0

    for (const r of list) {
      const groupKey = r.groupKey || ''
      // 聚合口径：资源 id 优先（与已读次数 key 一致），老记录回退「分组 + 名称」
      const key = r.resourceId ? `${groupKey}|${r.resourceId}` : `${groupKey}|${r.resourceName}`
      let it = map[key]
      if (!it) {
        it = { key, name: r.resourceName || '未命名资源', minutes: 0, count: 0 }
        map[key] = it
        order.push(it)
      }
      const min = checkin.effectiveMinutes(r)   // 熏听按 factor 折算
      it.minutes += min
      it.count += 1
      totalMinutes += min
      totalCount += 1
    }

    const byCount = mode === 'count'
    order.sort((a, b) => byCount
      ? (b.count - a.count || b.minutes - a.minutes)
      : (b.minutes - a.minutes || b.count - a.count))

    // 时长模式过滤掉有效时长为 0 的项（如常规1/2 的熏听）：它们确实是当天的打卡，
    // 但在这张「有效时长」榜里没有可展示的量，留着只会显示「0分钟」；
    // 次数模式保留（「打过一次」本身有意义）
    const rows = byCount ? order : order.filter(it => it.minutes > 0)

    // 占比分母为该统计范围的累计值（今日总时长 / 今日总次数），各行相加为 100%
    const base = byCount ? totalCount : totalMinutes
    const items = rows.map(it => {
      const val = byCount ? it.count : it.minutes
      return {
        key: it.key,
        name: it.name,
        char: (it.name || '').trim().charAt(0) || '·',
        percent: base > 0 ? Math.round(val / base * 100) : 0,
        valueText: byCount ? `${it.count}次` : checkin.fmtMinutesCN(it.minutes)
      }
    })

    this.setData({
      sheetMode: mode,
      sheetTitle: byCount ? '今日打卡' : '今日时长',
      // minutes 模式：数字分段由 sheetTime 承载（wxml 分「小时/分钟」渲染，单位小字）；
      // count 模式：main 只放数字，「次」由 wxml 补单位小字
      sheetSummaryMain: byCount ? `${totalCount}` : '',
      sheetTime: byCount ? { h: 0, m: 0 } : splitDuration(totalMinutes),
      sheetItems: items
    })
  }
})
