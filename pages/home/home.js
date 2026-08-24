const checkin = require('../../utils/checkin.js')

// 删除按钮宽度（px），与样式保持一致
const DELETE_W = 75

Page({
  data: {
    // 月视图
    selectedMonth: '', // 'YYYY-MM'
    monthLabel: '',    // '2026年8月'
    monthTotalText: '0m',
    monthDays: 0,
    monthCount: 0,
    // 按日期分组的记录: [{ day, dayLabel, totalText, list: [...] }]
    groupedRecords: [],
    swipedId: '',
    _startX: 0,
    _startDx: 0,
    _curId: ''
  },

  onShow() {
    try {
      const app = getApp()
      if (app && app.globalData && app.globalData.checkinDirty) {
        app.globalData.checkinDirty = false
        this._refresh()
      } else {
        this._refresh()
      }
    } catch (e) {
      this._refresh()
    }
  },

  _refresh() {
    let month = this.data.selectedMonth
    if (!month) {
      const now = new Date()
      month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }
    this._loadMonth(month)
  },

  _loadMonth(ym) {
    const list = checkin.getByMonth(ym)
    const totalMin = list.reduce((s, c) => s + c.durationMinutes, 0)

    // 按日期分组
    const groups = {}
    list.forEach(r => {
      if (!groups[r.day]) groups[r.day] = []
      groups[r.day].push(r)
    })

    const grouped = Object.keys(groups)
      .sort((a, b) => b.localeCompare(a)) // 日期倒序
      .map(day => {
        const dayList = groups[day].slice().sort((a, b) => b.timestamp - a.timestamp)
        const dayTotal = dayList.reduce((s, c) => s + c.durationMinutes, 0)
        return {
          day,
          dayLabel: this._fmtDayLabel(day),
          totalText: checkin.fmtMinutes(dayTotal),
          list: dayList.map(r => ({
            id: r.id,
            stageName: r.stageName,
            groupLabel: r.groupLabel,
            resourceName: r.resourceName,
            durationText: checkin.fmtMinutes(r.durationMinutes),
            timeText: this._fmtTime(r.timestamp),
            _dx: 0,
            _anim: false
          }))
        }
      })

    // 月份标签
    const [y, m] = ym.split('-')
    const monthLabel = `${y}年${parseInt(m, 10)}月`

    this.setData({
      selectedMonth: ym,
      monthLabel,
      monthTotalText: checkin.fmtMinutes(totalMin),
      monthDays: Object.keys(groups).filter(d => groups[d].length > 0).length,
      monthCount: list.length,
      groupedRecords: grouped,
      swipedId: ''
    })
  },

  _fmtDayLabel(day) {
    const today = checkin.todayStr()
    const yesterday = this._yesterdayStr()
    if (day === today) return '今天'
    if (day === yesterday) return '昨天'
    const d = new Date(day)
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    return `${parseInt(day.slice(-2), 10)}日 周${weekdays[d.getDay()]}`
  },

  _yesterdayStr() {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return checkin.todayStr(d)
  },

  _fmtTime(ts) {
    const d = new Date(ts)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  },

  // -------- 月份切换 --------

  prevMonth() {
    const [y, m] = this.data.selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1) // 上一月
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    this._loadMonth(ym)
  },

  nextMonth() {
    const [y, m] = this.data.selectedMonth.split('-').map(Number)
    const d = new Date(y, m, 1) // 下一月
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    // 不允许超过当前月
    const now = new Date()
    const curYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    if (ym > curYm) return
    this._loadMonth(ym)
  },

  // -------- 滑动删除 --------

  onTouchStart(e) {
    const id = e.currentTarget.dataset.id
    const touch = e.touches[0]
    const startX = touch.clientX

    const curDx = this.data.swipedId === id ? -DELETE_W : 0

    this.setData({
      _startX: startX,
      _startDx: curDx,
      _curId: id
    })

    // 关闭其他已打开的项
    const grouped = this.data.groupedRecords.map(g => ({
      ...g,
      list: g.list.map(r => {
        if (r.id !== id && r._dx !== 0) {
          return { ...r, _dx: 0, _anim: true }
        }
        return r
      })
    }))
    this.setData({ groupedRecords: grouped })
  },

  onTouchMove(e) {
    const touch = e.touches[0]
    const dx = this.data._startDx + (touch.clientX - this.data._startX)

    const minX = -DELETE_W - 20
    const clamped = Math.max(minX, Math.min(10, dx))

    const grouped = this.data.groupedRecords.map(g => ({
      ...g,
      list: g.list.map(r => {
        if (r.id === this.data._curId) {
          return { ...r, _dx: clamped, _anim: false }
        }
        return r
      })
    }))
    this.setData({ groupedRecords: grouped })
  },

  onTouchEnd() {
    const id = this.data._curId
    let found = null
    for (const g of this.data.groupedRecords) {
      const r = g.list.find(x => x.id === id)
      if (r) { found = r; break }
    }
    if (!found) return

    const shouldOpen = found._dx < -DELETE_W / 2
    const targetDx = shouldOpen ? -DELETE_W : 0

    const grouped = this.data.groupedRecords.map(g => ({
      ...g,
      list: g.list.map(r => {
        if (r.id === id) {
          return { ...r, _dx: targetDx, _anim: true }
        }
        return r
      })
    }))

    this.setData({
      groupedRecords: grouped,
      swipedId: shouldOpen ? id : ''
    })
  },

  // -------- 删除 --------

  deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除打卡记录',
      content: '确定要删除这条打卡记录吗？',
      success: (res) => {
        if (res.confirm) {
          const ok = checkin.deleteCheckin(id)
          if (ok) {
            try {
              const app = getApp()
              if (app && app.globalData) app.globalData.checkinDirty = true
            } catch (e) {}
            this._refresh()
            wx.showToast({ title: '已删除', icon: 'success' })
          } else {
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
