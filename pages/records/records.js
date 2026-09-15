const checkin = require('../../utils/checkin.js')

// 左滑操作区宽度（rpx）：编辑 + 删除 各 150，与 records.wxss 的 .swipe-bg 保持一致
const SWIPE_W = 300

Page({
  data: {
    records: [],
    // 当前月
    curYm: '',           // 'YYYY-MM'
    monthDisplay: '',    // '8月'
    yearText: '',        // '2026年'
    // 月份选择器
    monthPickerOpen: false,
    yearRange: [],
    monthRange: [],
    pickerValue: [0, 0],
    _pendingYear: 0,
    _pendingMonth: 0,
    // 滑动状态
    _touchStartX: 0,
    _touchStartY: 0,
    _curSwipeIdx: -1,
    fontClass: '',
    darkClass: ''
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    const now = new Date()
    const y = now.getFullYear()

    // 年份范围：今年 ±3（与首页一致）
    const yearRange = []
    for (let i = y - 3; i <= y + 3; i++) yearRange.push(i)
    const monthRange = []
    for (let i = 1; i <= 12; i++) monthRange.push(i)

    this.setData({
      curYm: this._toYm(now),
      yearRange,
      monthRange
    })
    // 列表数据统一由 onShow 加载，避免首屏重复计算两次
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    this._refresh()
  },

  // 阻止月份选择弹层内容区的点击冒泡（catchtap）
  noop() {},

  // 加载所选月份记录，按时间倒序
  _refresh() {
    const ym = this.data.curYm || this._toYm(new Date())
    // 不用数组解构：增强编译会生成 @swc/runtime/_array_with_holes 依赖，部分工具版本解析不到会报错
    const ymParts = ym.split('-').map(Number)
    const y = ymParts[0]
    const m = ymParts[1]

    const monthRecords = checkin.getByMonth(ym)
    monthRecords.sort((a, b) => b.timestamp - a.timestamp)
    const records = monthRecords.map(r => ({
      id: r.id,
      stageName: r.stageName,
      groupKey: r.groupKey,
      groupLabel: r.groupLabel,
      resourceName: r.resourceName,
      firstChar: (r.resourceName || '').trim().charAt(0) || '📖',
      remark: r.remark || '',
      backfilled: !!r.backfilled,
      durationText: checkin.fmtMinutes(r.durationMinutes),
      dateText: this._fmtDate(r.timestamp),
      _dx: 0,
      _anim: false
    }))

    const idx = this.data.yearRange.indexOf(y)
    this.setData({
      records,
      yearText: `${y}年`,
      monthDisplay: `${m}月`,
      pickerValue: [idx >= 0 ? idx : 0, m - 1]
    })
  },

  _toYm(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  },

  // 与首页一致: 08/31 07:27
  _fmtDate(ts) {
    const d = new Date(ts)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${m}/${day} ${hh}:${mm}`
  },

  // ===== 补录 =====
  // 跳转补录页（日期 + 阶段/分组/资源三级级联）
  goBackfill() {
    wx.navigateTo({ url: '/pages/backfill/backfill' })
  },

  // 补录页返回回调：切到补录月份并刷新，让新记录立即可见
  // （yearText / monthDisplay / pickerValue 由 _refresh 依据 curYm 回填）
  applyBackfill(opt) {
    const day = opt && opt.day ? String(opt.day) : ''
    const m = /^(\d{4})-(\d{2})$/.exec(day)
    if (m && this.data.yearRange.indexOf(Number(m[1])) >= 0) {
      this.setData({ curYm: `${m[1]}-${m[2]}` })
    }
    this._refresh()
  },

  // ===== 月份选择器（与首页一致） =====
  onToggleMonthPicker() {
    const ym = this.data.curYm
    // 同上：避免数组解构
    const ymParts = ym.split('-').map(Number)
    const y = ymParts[0]
    const m = ymParts[1]
    const idx = this.data.yearRange.indexOf(y)
    this.setData({
      monthPickerOpen: true,
      pickerValue: [idx >= 0 ? idx : 0, m - 1],
      _pendingYear: y,
      _pendingMonth: m
    })
  },

  onCloseMonthPicker() {
    this.setData({ monthPickerOpen: false })
  },

  onPickerChange(e) {
    const val = e.detail.value // [yearIdx, monthIdx]
    const y = this.data.yearRange[val[0]]
    const m = this.data.monthRange[val[1]]
    this.setData({ _pendingYear: y, _pendingMonth: m })
  },

  onConfirmMonthPicker() {
    const y = this.data._pendingYear
    const m = this.data._pendingMonth
    const ym = `${y}-${String(m).padStart(2, '0')}`

    // 不能超过当前月
    const nowYm = this._toYm(new Date())
    if (ym > nowYm) {
      wx.showToast({ title: '不能选择未来月份', icon: 'none' })
      return
    }
    this.setData({
      curYm: ym,
      monthPickerOpen: false
    })
    this._refresh()
  },

  // ===== 滑动删除（同首页） =====
  _snapDx(dx) {
    if (dx <= -SWIPE_W / 2) return -SWIPE_W
    return 0
  },

  onTouchStart(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const t = e.touches[0]
    this.setData({
      _touchStartX: t.clientX,
      _touchStartY: t.clientY,
      _curSwipeIdx: idx
    })
    // 关闭其他已打开的（先克隆：直接改 this.data 里的对象会绕过 setData 的引用管理）
    const records = this.data.records.map(r => ({ ...r }))
    let changed = false
    for (let i = 0; i < records.length; i++) {
      if (i !== idx && records[i]._dx !== 0) {
        records[i]._dx = 0
        records[i]._anim = true
        changed = true
      }
    }
    if (changed) {
      this.setData({ records })
    }
    // 开始拖动：关闭动画
    const cur = records[idx]
    if (!cur) return
    cur._anim = false
    this.setData({ [`records[${idx}]`]: cur })
  },

  onTouchMove(e) {
    const idx = this.data._curSwipeIdx
    if (idx < 0) return
    const t = e.touches[0]
    const dxPx = t.clientX - this.data._touchStartX
    // px → rpx (约 2 倍，简单换算)
    let newDx = dxPx * 2
    if (newDx < -(SWIPE_W + 20)) newDx = -(SWIPE_W + 20)
    if (newDx > 10) newDx = 10

    // 节流：同一次滑动内位移变化小于 2rpx 时跳过，避免高频 setData 掉帧
    if (this._swipeIdx === idx && Math.abs(newDx - this._lastDx) < 2) return
    this._swipeIdx = idx
    this._lastDx = newDx

    this.setData({ [`records[${idx}]._dx`]: newDx })
  },

  onTouchEnd() {
    const idx = this.data._curSwipeIdx
    if (idx < 0) return
    const r = this.data.records[idx]
    const targetDx = this._snapDx(r._dx)
    this.setData({
      [`records[${idx}]._dx`]: targetDx,
      [`records[${idx}]._anim`]: true,
      _curSwipeIdx: -1
    })
  },

  // 编辑记录：跳补录页的编辑态（复用同一套表单，见 backfill.js onLoad 的 options.id 分支）
  editRecord(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/pages/backfill/backfill?id=${id}` })
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除记录',
      content: '确认删除这条打卡记录？',
      success: (res) => {
        if (!res.confirm) return
        const ok = checkin.deleteCheckin(id)
        if (!ok) {
          wx.showToast({ title: '删除失败', icon: 'none' })
          return
        }
        wx.showToast({ title: '已删除', icon: 'success' })
        this._refresh()
      }
    })
  }
})
