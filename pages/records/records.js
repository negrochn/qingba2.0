const checkin = require('../../utils/checkin.js')
const share = require('../../utils/share.js')

// 左滑操作区宽度（rpx）：编辑 + 删除 各 150，与 records.wxss 的 .swipe-bg 保持一致
const SWIPE_W = 300

Page({
  data: {
    records: [],
    // 阶段选择器（与我的统计页同款：全页按所选阶段展示）
    stageOptions: [],    // [{ stage_id, stage_name }]
    stageNames: [],      // picker 的 range
    stageIndex: 0,
    stageName: '',
    summary: '',         // 该阶段摘要：共 X 天 · Y 条 · 累计 Z
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
    this._initStageOptions()
    // 列表数据统一由 onShow 加载，避免首屏重复计算两次
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    // 路线可能在设置页被切换：整体重建选择器与选中态（myStats 同款）
    if (this._loadedRouteId !== checkin.getCurrentRouteId()) {
      this._initStageOptions()
    }
    this._refresh()
  },

  // 分享给好友
  onShareAppMessage() {
    return share.appMessage('records')
  },

  // ===== 阶段选择（与我的统计页同款：全页按所选阶段展示） =====
  // 默认选中当前阶段；未设当前阶段时退到首个有数据的阶段，再退到第一个
  _initStageOptions() {
    this._loadedRouteId = checkin.getCurrentRouteId()
    const stageOptions = (checkin.getCurrentRoute().stages || []).map(x => ({
      stage_id: x.stage_id,
      stage_name: x.stage_name
    }))
    let idx = -1
    const cur = checkin.getCurrentStage()
    if (cur) idx = stageOptions.findIndex(x => x.stage_id === cur.id)
    if (idx < 0) {                          // 当前阶段无数据：取首个有数据的阶段
      const all = checkin.getAll()
      const hasData = {}
      for (const day in all) {
        const list = all[day]
        if (!Array.isArray(list)) continue
        for (const r of list) { if (r && r.stageId) hasData[r.stageId] = true }
      }
      idx = stageOptions.findIndex(x => hasData[x.stage_id])
    }
    if (idx < 0) idx = 0
    const sel = stageOptions[idx] || null
    this._selStageId = sel ? sel.stage_id : ''
    this.setData({
      stageOptions,
      stageNames: stageOptions.map(x => x.stage_name),
      stageIndex: idx,
      stageName: sel ? sel.stage_name : ''
    })
  },

  onStageChange(e) {
    const idx = Number(e.detail.value)
    const opts = this.data.stageOptions || []
    if (!opts[idx] || opts[idx].stage_id === this._selStageId) return
    this._selStageId = opts[idx].stage_id
    this.setData({ stageIndex: idx, stageName: opts[idx].stage_name })
    this._refresh()
  },

  // 加载所选阶段的记录，按时间倒序，并汇总摘要（共 X 天 · Y 条 · 累计 Z）
  _refresh() {
    const selId = this._selStageId
    // 记录不加路线字段、自带 stageId 快照，按它过滤即天然限定在当前路线
    // （两路线 stage_id 命名空间隔离，不会串数据），已存记录零迁移
    const all = checkin.getAll()
    const rows = []
    const daySet = {}
    let count = 0
    let totalMinutes = 0
    for (const day in all) {
      const list = all[day]
      if (!Array.isArray(list)) continue
      for (const r of list) {
        if (!r || r.stageId !== selId) continue
        daySet[day] = true
        count += 1
        totalMinutes += checkin.effectiveMinutes(r)
        rows.push(r)
      }
    }
    rows.sort((a, b) => b.timestamp - a.timestamp)
    const records = rows.map(r => {
      // 熏听记录：主数值仍是原始时长，后面跟一个系数标记（×0.5 / ×0.8 / 不计入），
      // 与打卡弹窗单位旁的标记同一套语汇；折算后的具体数值由统计 / 阶段进度体现
      const factor = typeof r.factor === 'number' ? r.factor : 1
      return {
        id: r.id,
        groupKey: r.groupKey,
        groupLabel: r.groupLabel,
        resourceName: r.resourceName,
        firstChar: (r.resourceName || '').trim().charAt(0) || '📖',
        remark: r.remark || '',
        backfilled: !!r.backfilled,
        durationText: checkin.fmtMinutes(r.durationMinutes),
        factorText: factor === 1 ? '' : (factor > 0 ? `×${factor}` : '不计入'),
        dateText: this._fmtDate(r.timestamp),
        _dx: 0,
        _anim: false
      }
    })
    // 摘要口径与我的统计页一致：时长按熏听折算后的有效时长（仅到小时，1 位小数）
    const summary = count
      ? `${count} 条 · ${Object.keys(daySet).length} 天 · ${this._fmtHours(totalMinutes)}`
      : ''

    this.setData({ records, summary })
  },

  // 与首页一致: 08/31 07:27；跨年阶段补年份: 2025/08/31 07:27
  _fmtDate(ts) {
    const d = new Date(ts)
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const md = `${m}/${day} ${hh}:${mm}`
    return d.getFullYear() === new Date().getFullYear() ? md : `${d.getFullYear()}/${md}`
  },

  // 分钟 → 小时文案：整点不带小数，否则保留 1 位（82 → 1.4，60 → 1，45 → 0.8）
  _fmtHours(minutes) {
    const h = Math.round((Number(minutes) || 0) / 6) / 10
    return `${Number.isInteger(h) ? h : h.toFixed(1)}小时`
  },

  // ===== 补录 =====
  // 跳转补录页（日期 + 阶段/分组/资源三级级联）
  goBackfill() {
    wx.navigateTo({ url: '/pages/backfill/backfill' })
  },

  // 补录页返回回调：切到补录记录所属阶段并刷新，让新记录立即可见
  applyBackfill(opt) {
    const stageId = opt && opt.stageId ? String(opt.stageId) : ''
    const opts = this.data.stageOptions || []
    const idx = opts.findIndex(x => x.stage_id === stageId)
    if (idx >= 0 && idx !== this.data.stageIndex) {
      this._selStageId = stageId
      this.setData({ stageIndex: idx, stageName: opts[idx].stage_name })
    }
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

  // 编辑记录：跳独立的编辑页（单条完整表单，见 pages/editRecord）
  editRecord(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/pages/editRecord/editRecord?id=${id}` })
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
