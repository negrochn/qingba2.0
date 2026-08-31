const checkin = require('../../utils/checkin.js')
const app = getApp()

// 删除按钮宽度（rpx），与样式保持一致
const DELETE_W = 150

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
    _curSwipeIdx: -1
  },

  onLoad() {
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
    this._refresh()
  },

  onShow() {
    this._refresh()
  },

  // 加载所选月份记录，按时间倒序
  _refresh() {
    const ym = this.data.curYm || this._toYm(new Date())
    const [y, m] = ym.split('-').map(Number)

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

  // ===== 月份选择器（与首页一致） =====
  onToggleMonthPicker() {
    const ym = this.data.curYm
    const [y, m] = ym.split('-').map(Number)
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
    if (dx <= -DELETE_W / 2) return -DELETE_W
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
    // 关闭其他已打开的
    const records = this.data.records
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
    records[idx]._anim = false
    this.setData({ [`records[${idx}]`]: records[idx] })
  },

  onTouchMove(e) {
    const idx = this.data._curSwipeIdx
    if (idx < 0) return
    const t = e.touches[0]
    const dxPx = t.clientX - this.data._touchStartX
    // px → rpx (约 2 倍，简单换算)
    let newDx = dxPx * 2
    if (newDx < -(DELETE_W + 20)) newDx = -(DELETE_W + 20)
    if (newDx > 10) newDx = 10
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
        try {
          if (app && app.globalData) app.globalData.checkinDirty = true
        } catch (ee) {}
        wx.showToast({ title: '已删除', icon: 'success' })
        this._refresh()
      }
    })
  }
})
