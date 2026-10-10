const checkin = require('../../utils/checkin.js')
const children = require('../../utils/children.js')
const { getRequiredHours, isRouteCompleted } = require('../../utils/data.js')
const share = require('../../utils/share.js')
const backup = require('../../utils/backup.js')

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

Page({
  data: {
    fontClass: '',
    darkClass: '',
    dateText: '',
    greetText: '',
    stageName: '',
    todayCount: 0,
    weekTime: { h: 0, m: 0 },          // 本周时长（分段：小时/分钟）
    weekDeltaText: '—',
    weekDeltaValue: '',                // 周环比数值（带符号）；'' = 无对比
    weekDeltaState: '',                // 周环比方向：'up' 绿 / 'down' 红 / '' 中性（持平或无对比）
    weekBars: [],
    activeBar: -1,                     // 周柱状图选中柱（点按气泡），-1 = 无
    barScaleText: '1小时',
    todayTime: { h: 0, m: 0 },         // 今日时长（分段）
    totalTime: { h: 0, m: 0 },         // 阶段时长（分段）
    stagePercent: 0,
    dayNumber: 0,
    streakDays: 0,
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
    // 孩子切换器（仅多孩显示）：纯头像 + 切换弹层
    isMultiChild: false,
    activeChildInitial: '',
    activeChildColor: 'green',
    childSheetVisible: false,
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
      this.setData({ backupTipVisible: backup.shouldShowHomeTip() })
    } catch (e) {}
  },

  // 轻条 / 引导的「去备份」：直达数据与备份页
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

  // 孩子切换器状态：仅多孩时显示（单孩零感知）
  _refreshChild() {
    const active = children.getActiveChild() || {}
    this.setData({
      isMultiChild: children.isMultiChild(),
      activeChildInitial: String(active.name || '').trim().charAt(0) || '·',
      activeChildColor: active.color || 'green'
    })
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
    // 上周同区间起点（前 7 天）
    const lastMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7)
    const lastWeekStartStr = checkin.todayStr(lastMonday)

    const all = checkin.getAll()
    const weekDayMinutes = {}
    let thisWeek = 0
    let lastWeek = 0
    let todayMinutes = 0
    let todayCount = 0
    let totalMinutes = 0
    let firstDayStr = ''
    const daysSet = new Set()

    for (const day in all) {
      const list = all[day] || []
      for (const r of list) {
        if (r.stageId !== stageId) continue          // 只统计当前阶段
        const min = checkin.effectiveMinutes(r)      // 熏听时长按 factor 折算后计入
        totalMinutes += min                            // 阶段时长（当前阶段）
        daysSet.add(day)
        if (!firstDayStr || day < firstDayStr) firstDayStr = day   // 阶段首次打卡日（YYYY-MM-DD 字典序即时间序）
        if (day === todayStr) {
          todayMinutes += min
          todayCount += 1                          // 今日打卡次数（当前阶段口径）
        }
        if (day >= weekStartStr && day <= todayStr) {
          weekDayMinutes[day] = (weekDayMinutes[day] || 0) + min
          thisWeek += min
        } else if (day >= lastWeekStartStr && day < weekStartStr) {
          lastWeek += min
        }
      }
    }

    // 柱状图：本周 7 天（周一~周日）。满刻度 = 周内最大值向上取整到 0.5h（下限 1h），
    // 柱高为对满刻度的绝对占比，配合顶部/中部/底部三条参考线与满刻度标签读数
    let maxVal = 0
    const bars = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      const ds = checkin.todayStr(d)
      const val = weekDayMinutes[ds] || 0
      if (val > maxVal) maxVal = val
      bars.push({ day: ds, label: DAY_LABELS[i], isToday: ds === todayStr })
    }
    const scaleMinutes = Math.max(60, Math.ceil(maxVal / 30) * 30)   // 满刻度（分钟）
    const scaleH = Math.floor(scaleMinutes / 60), scaleM = scaleMinutes % 60
    const barScaleText = scaleM ? `${scaleH}小时${scaleM}分` : `${scaleH}小时`   // 参考线标签
    const weekBars = bars.map(b => {
      const val = weekDayMinutes[b.day] || 0
      // 零 = 无柱（透明轨道上零值画柱会误读成打过卡）；非零下限 2%（≈2px）：
      // 保住「打过卡必可见」的区分，又把旧下限 6% 的读数虚高压到可忽略
      const percent = val > 0 ? Math.max(2, Math.round(val / scaleMinutes * 100)) : 0
      // 点按气泡文案（echarts tooltip 同款信息）：星期：时长（零值即 0分钟）
      const bh = Math.floor(val / 60), bm = val % 60
      const dur = bh ? (bm ? `${bh}小时${bm}分钟` : `${bh}小时`) : `${bm}分钟`
      // 气泡锚定柱顶：柱高 = 192rpx 轨道×percent%，+ 标签区/间隙 68rpx。
      // JS 直接拼好最终值，内联 style 只做字符串替换——规避真机 calc 乘法兼容坑。
      // 箭头独立于气泡、以列定位（恒指列中心，不受首尾 clamp 影响），底边=气泡底-8rpx 三角高
      const tipBase = Math.round(percent * 1.92 + 68)
      return {
        day: b.day, label: b.label, isToday: b.isToday, percent,
        tipText: `${b.label}：${dur}`,
        tipBottom: `${tipBase}rpx`,
        tipArrowBottom: `${tipBase - 8}rpx`
      }
    })

    // 周环比（涨绿 / 跌红只作用于数值；「较上周」前缀保持中性灰）
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

    // 连续打卡天数（当前阶段口径）：今天未打卡则从昨天起算，避免当天还没打就归零
    let streakDays = 0
    const startOffset = daysSet.has(todayStr) ? 0 : 1
    for (let i = startOffset; i < 365; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      if (daysSet.has(checkin.todayStr(d))) streakDays++
      else break
    }

    // Day N：当前阶段首次打卡日 -> 今天（含首尾，首次当天为 Day 1；跨阶段自动重新计数）
    let dayNumber = 0
    if (firstDayStr) {
      const diffDays = Math.round(
        (checkin.dayToTimestamp(todayStr) - checkin.dayToTimestamp(firstDayStr)) / 86400000
      )
      dayNumber = Math.max(1, diffDays + 1)
    }

    // 欢迎语：时段问候 + Day N（当前阶段尚无记录时不显示）
    const greet = greetByHour(h)
    let greetText = dayNumber > 0 ? `${greet}, ` : `${greet}, start today`

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
      // 毕业是状态而非时刻：祝贺语固定，Day 切全程陪伴天数
      dayNumber = companionDays
      greetText = 'Congratulations, '
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
      stageName: cur ? (cur.name || '') : '',
      weekTime: splitDuration(thisWeek),
      weekDeltaText,
      weekDeltaValue,
      weekDeltaState,
      weekBars,
      activeBar: -1,                   // 数据重建后旧气泡失去意义，复位
      barScaleText,
      todayTime: splitDuration(todayMinutes),
      todayCount,
      totalTime: splitDuration(totalMinutes),   // 当前阶段累计，非全阶段
      stagePercent,
      stageNoTarget,
      dayNumber,
      streakDays,
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
