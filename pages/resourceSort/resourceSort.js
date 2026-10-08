// 分组内拖拽排序（独立页面，从「我的资源」分组头「排序」进入）
//   - 两条拖拽通道：长按整行（系统 longpress）或按住行右侧手柄即拖（振动反馈），
//     其余行让位动画，松手滑入新槽位并落盘顺序覆盖快照
//   - 滚动冲突：整行通道靠 longpress（滑动自动取消）+ 激活时动态关 scroll-y，
//     激活前滑动照常滚；手柄通道靠 catch 手势天然不冒泡，列表其余区域照常滚动
//   - 拖到上下边缘自动补滚
//   - 「恢复默认」清除该组顺序覆盖；顺序经 resources.js 单点即时作用于阶段页 / 补录选择
// 顺序落盘即生效，无「取消」语义：返回（导航栏 / 手势）即完成，
// 「我的资源」onShow 的 refresh() 会按新顺序重建
const resourcePrefs = require('../../utils/resourcePrefs.js')
const resources = require('../../utils/resources.js')
const customResources = require('../../utils/customResources.js')

Page({
  data: {
    fontClass: '',
    darkClass: '',
    stageId: '',
    groupKey: '',
    label: '',
    items: [],   // [{ id, name, custom, _y(px位移), _drag, _anim }]
    svTop: 0,    // scroll-view scroll-top 绑定（边缘自动滚动用）
    svLocked: false  // 长按整行拖拽期间锁 scroll-y（防拖拽与滚动手势打架）
  },

  onLoad(options) {
    const stageId = decodeURIComponent(options.stageId || '')
    const groupKey = decodeURIComponent(options.groupKey || '')
    const label = decodeURIComponent(options.label || '')
    this.setData({ stageId, groupKey, label })
    // 导航栏标题带上分组名，页面语境更清楚
    if (label) wx.setNavigationBarTitle({ title: label })
    this._loadItems()
  },

  onReady() {
    this._measureSortSv()
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onHide() {
    // 拖拽中切走 / 返回：清计时器与拖拽态，避免后台空转
    this._teardownDrag()
  },

  onUnload() {
    this._teardownDrag()
  },

  // 载入该组全量清单（含隐藏资源——排序视图与「我的资源」所见一致）。
  // 历史变体分组（不在官方分组集合里）不在 resources 视图中，退回自定义存储
  _loadItems() {
    const { stageId, groupKey } = this.data
    const full = resources.getStageResources(stageId, { includeHidden: true })
    let list = full[groupKey]
    if (!list || !list.length) {
      const byGroup = customResources.getByStage(stageId) || {}
      list = (byGroup[groupKey] || []).map(it => ({ id: it.id, name: it.name, custom: true }))
    }
    list = Array.isArray(list) ? list : []

    // 不足 2 项没有可排序的意义：提示后自动退回（入口处已有 ≥2 项门槛，这里是兜底）
    if (list.length < 2) {
      wx.showToast({ title: '该分组暂无可排序的资源', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 600)
      return
    }

    this._sortOrder = list.map((_, i) => i)   // 内容序（元素为 items 下标）
    const hidden = resourcePrefs.getHiddenMap()
    this.setData({
      // _hid：隐藏项标淡（与「我的资源」同口径；隐藏项仍参与排序占位）
      items: list.map(it => ({ id: it.id, name: it.name, custom: !!it.custom, _hid: !!hidden[it.id], _y: 0, _drag: false, _anim: true })),
      svTop: 0
    })
    this._svCurTop = 0
  },

  // 量出 scroll-view 的视口位置（坐标换算与边缘自动滚动的基准，进页量一次）
  _measureSortSv() {
    const tick = wx.nextTick ? wx.nextTick.bind(wx) : (fn) => setTimeout(fn, 50)
    tick(() => {
      wx.createSelectorQuery().in(this)
        .select('.sort-sv')
        .boundingClientRect(rect => {
          if (rect) {
            this._svRectTop = rect.top
            this._svHeight = rect.height
          }
        })
        .exec()
    })
  },

  onSortScroll(e) {
    // 非拖拽状态滚列表时保持内容坐标基准新鲜
    if (!this._dragging) this._svCurTop = e.detail.scrollTop
  },

  // 恢复默认：清除该组顺序覆盖，按默认序（官方在前、自定义在后）重载
  onSortReset() {
    const { stageId, groupKey } = this.data
    resourcePrefs.saveGroupOrder(stageId, groupKey, [])
    const full = resources.getStageResources(stageId, { includeHidden: true })
    // 历史变体分组合成的清单不在 resources 视图里，此时按当前顺序原样保留
    const list = (full[groupKey] && full[groupKey].length)
      ? full[groupKey]
      : this.data.items
    this._sortOrder = list.map((_, i) => i)
    const hidden = resourcePrefs.getHiddenMap()
    this.setData({
      items: list.map(it => ({ id: it.id, name: it.name, custom: !!it.custom, _hid: !!hidden[it.id], _y: 0, _drag: false, _anim: true })),
      svTop: 0
    })
    this._svCurTop = 0
    wx.showToast({ title: '已恢复默认顺序', icon: 'none' })
  },

  onSortHandleStart(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const t = e.touches[0]
    this._dragIdx = idx
    this._targetIdx = idx
    this._startClientY = t.clientY
    this._grabOffset = this._fingerContentY(t.clientY) - idx * this._rowH()
    this._lastClientY = t.clientY
    this._dragging = false   // 位移超阈值才算真正拖拽，轻点手柄无副作用
  },

  onSortHandleMove(e) {
    const t = e.touches[0]
    if (!this._dragging) {
      if (Math.abs(t.clientY - this._startClientY) < 5) return
      this._dragging = true
      try { wx.vibrateShort() } catch (e2) {}
      this.setData({ ['items[' + this._dragIdx + ']._drag']: true })
      this._startAutoScroll()
    }
    this._lastClientY = t.clientY
    this._applyDrag()
  },

  onSortHandleEnd() {
    if (!this._dragging) {
      this._dragIdx = -1
      return
    }
    this._settle()
  },

  // —— 整行长按拖拽通道 ——
  // 系统longpress（约 350ms）：手指滑动会被系统自动取消，想滚动的用户不会误触发；
  // 激活即视为拖拽开始（不再要 5px 阈值），同时锁 scroll-y，此后手指完全接管
  onRowLongPress(e) {
    if (this._dragging) return
    const idx = Number(e.currentTarget.dataset.idx)
    const t = e.touches && e.touches[0]
    if (!t) return // 触点已消失（长按触发瞬间抬手等极端时序）：不进入拖拽
    this._armed = true
    this._dragIdx = idx
    this._targetIdx = idx
    this._startClientY = t.clientY
    this._grabOffset = this._fingerContentY(t.clientY) - idx * this._rowH()
    this._lastClientY = t.clientY
    this._dragging = true
    try { wx.vibrateShort() } catch (e2) {}
    this.setData({ ['items[' + idx + ']._drag']: true, svLocked: true })
    this._applyDrag()   // 手指未动也先落一次基准，让 _lastDraggedTop 有正确初值
    this._startAutoScroll()
  },

  onRowTouchMove(e) {
    if (!this._armed) return   // 未长按激活：放行，scroll-view 正常滚
    this._lastClientY = e.touches[0].clientY
    this._applyDrag()
  },

  onRowTouchEnd() {
    if (!this._armed) return
    this._armed = false
    this._settle()
  },

  // 视口坐标 → scroll-view 内容坐标（拖拽中列表可能被自动滚动）
  _fingerContentY(clientY) {
    return (this._svCurTop || 0) + (clientY - (this._svRectTop || 0))
  },

  // 行距：行高恒 88rpx（44pt 最小热区口径，wxss 覆盖 cell 后的实际行高，
  // 名称单行截断保证不撑高），换算成 px 参与取位计算
  _rowH() {
    if (!this._rowHp) {
      let ww = 375
      try { ww = (wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()).windowWidth || 375 } catch (e) {}
      this._rowHp = Math.round(ww / 750 * 88 * 100) / 100
    }
    return this._rowHp
  },

  // 拖拽主逻辑：算拖拽项内容坐标 → 更新自身位移 → 跨过邻行中线则换位并让位
  _applyDrag() {
    const H = this._rowH()
    const items = this.data.items
    if (!items || !items.length || this._dragIdx < 0) return

    const draggedTop = this._fingerContentY(this._lastClientY) - this._grabOffset
    this._lastDraggedTop = draggedTop
    const n = items.length
    let target = Math.round(draggedTop / H)
    if (target < 0) target = 0
    if (target > n - 1) target = n - 1

    const patch = { ['items[' + this._dragIdx + ']._y']: Math.round(draggedTop - this._dragIdx * H) }
    if (target !== this._targetIdx) {
      const order = this._sortOrder.slice()
      order.splice(order.indexOf(this._dragIdx), 1)
      order.splice(target, 0, this._dragIdx)
      this._sortOrder = order
      this._targetIdx = target
      order.forEach((itemIdx, slot) => {
        if (itemIdx !== this._dragIdx) {
          patch['items[' + itemIdx + ']._y'] = (slot - itemIdx) * H
        }
      })
    }
    this.setData(patch)
  },

  // 松手落定：按最终内容序重建 items（拖拽项带残差位移，让它滑入新槽位）、落盘快照
  _settle() {
    this._stopAutoScroll()
    const H = this._rowH()
    const items = this.data.items
    const order = this._sortOrder
    const next = order.map(itemIdx => {
      const it = items[itemIdx]
      return { id: it.id, name: it.name, custom: it.custom, _y: 0, _drag: false, _anim: true }
    })
    // 拖拽项残差：松手位置与目标槽位的差，交给 transition 滑进去
    const residual = Math.round((this._lastDraggedTop || 0) - this._targetIdx * H)
    if (next[this._targetIdx]) next[this._targetIdx]._y = residual

    this._dragging = false
    this._dragIdx = -1
    this.setData({ items: next, svLocked: false })
    // 槽位先捕获：50ms 内开始新拖拽会改写 _targetIdx，晚读会把新拖拽项的 _y 清零跳位
    const slot = this._targetIdx
    clearTimeout(this._settleTimer)
    this._settleTimer = setTimeout(() => {
      const cur = this.data.items[slot]
      // 槽位项已被新一轮拖拽抓起：不清零，交给新拖拽的 _applyDrag
      if (cur && !cur._drag) this.setData({ ['items[' + slot + ']._y']: 0 })
    }, 50)

    const { stageId, groupKey } = this.data
    resourcePrefs.saveGroupOrder(stageId, groupKey, next.map(it => it.id))
  },

  // 边缘自动滚动：手指停在列表上下边缘时按贴近程度加速滚动，滚动后重算拖拽位置
  _startAutoScroll() {
    this._stopAutoScroll()
    this._autoTimer = setInterval(() => {
      if (!this._dragging) return
      const EDGE = 56
      const y = this._lastClientY
      const top = this._svRectTop || 0
      const h = this._svHeight || 0
      if (!h) return
      let delta = 0
      if (y < top + EDGE) delta = -Math.ceil((top + EDGE - y) / 6)
      else if (y > top + h - EDGE) delta = Math.ceil((y - (top + h - EDGE)) / 6)
      if (!delta) return
      const max = this.data.items.length * this._rowH() - h
      let nt = (this._svCurTop || 0) + delta
      if (nt < 0) nt = 0
      if (nt > max) nt = Math.max(0, max)
      if (nt === this._svCurTop) return
      this._svCurTop = nt
      this.setData({ svTop: nt })
      this._applyDrag()
    }, 60)
  },

  _stopAutoScroll() {
    if (this._autoTimer) {
      clearInterval(this._autoTimer)
      this._autoTimer = null
    }
  },

  _teardownDrag() {
    this._stopAutoScroll()
    clearTimeout(this._settleTimer)   // 落定清零定时器：卸载后 setData 打到已销毁页面
    this._armed = false
    this._dragging = false
    this._dragIdx = -1
    // 拖拽中切走 / 返回：解锁滚动，避免回来后列表滚不动（幂等）
    if (this.data.svLocked) this.setData({ svLocked: false })
  }
})
