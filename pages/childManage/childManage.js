// 孩子管理页：radio-list 形式（点击行切换当前孩子）+ 左滑改名/删除 + 添加
// 唯一孩子禁止删除（左滑只露「改名」）；删除走强确认（输入孩子名字）
const children = require('../../utils/children.js')
const checkin = require('../../utils/checkin.js')

// 左滑操作区按钮宽度（rpx）：改名 150 + 删除 150；唯一孩子只有改名 150
const ACT_W = 150

// 分钟 -> 小时文本（与首页统计卡同口径）
function fmtHours(minutes) {
  const v = Number(minutes) / 60
  if (!v) return '0'
  return v % 1 === 0 ? String(v) : v.toFixed(1)
}

Page({
  data: {
    fontClass: '',
    darkClass: '',
    // [{ id, name, initial, color, descText, active, canDelete, _limit, _dx, _anim, _path }]
    items: [],
    childCount: 0,
    maxChildren: children.MAX_CHILDREN,
    isFull: false,
    // 左滑状态（与我的资源页同一套手势）
    _curSwipePath: '',
    _touchStartX: 0,
    _touchStartY: 0,
    // 添加 / 改名弹层
    sheetVisible: false,
    sheetMode: 'add',        // add | rename
    sheetTitle: '添加孩子',
    editId: '',
    nameInput: '',
    // 删除强确认弹层
    deleteVisible: false,
    deleteId: '',
    deleteName: '',
    deleteInput: '',
    deleteReady: false
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this._refresh()
  },

  _refresh() {
    const list = children.getChildren()
    const activeId = children.getActiveChildId()
    const canDelete = list.length > 1
    const items = list.map((c, i) => {
      const s = checkin.getChildSummary(c.id)
      return {
        id: c.id,
        name: c.name,
        initial: String(c.name || '').trim().charAt(0) || '·',
        color: c.color,
        descText: s.count > 0
          ? `打卡 ${s.count} 条 · 累计 ${fmtHours(s.minutes)} 小时`
          : '还未开始打卡',
        active: c.id === activeId,
        canDelete,
        _limit: canDelete ? -(ACT_W * 2) : -ACT_W,
        _dx: 0,
        _anim: true,
        _path: `items[${i}]`
      }
    })
    this.setData({
      items,
      childCount: items.length,
      isFull: items.length >= children.MAX_CHILDREN
    })
  },

  // ===== 点行切换当前孩子（radio 语义；当前项点击无动作） =====
  onPickChild(e) {
    const id = e.currentTarget.dataset.id
    const hit = this.data.items.find(it => it.id === id)
    if (!hit) return
    // 左滑展开中的行：先收起，不触发切换
    if (hit._dx) {
      this.setData({ [hit._path + '._dx']: 0, [hit._path + '._anim']: true })
      return
    }
    if (hit.active) return
    const res = children.switchChild(id)
    if (!res.ok) {
      wx.showToast({ title: res.error || '切换失败', icon: 'none' })
      return
    }
    wx.showToast({ title: `已切换到${hit.name}`, icon: 'none' })
    this._refresh()
  },

  // ===== 左滑手势（与我的资源 / 打卡记录页同一套实现） =====
  onTouchStart(e) {
    const path = e.currentTarget.dataset.path
    if (!path) return
    const t = e.touches[0]
    this._moved = false
    this._lastDx = 0

    // 关闭其他已展开的行，并让本行进入「拖动中」（关动画）
    const patch = {
      _curSwipePath: path,
      _touchStartX: t.clientX,
      _touchStartY: t.clientY
    }
    this.data.items.forEach(it => {
      if (it._path !== path && it._dx) {
        patch[it._path + '._dx'] = 0
        patch[it._path + '._anim'] = true
      }
    })
    patch[path + '._anim'] = false
    this.setData(patch)
  },

  onTouchMove(e) {
    const path = this.data._curSwipePath
    if (!path) return
    const hit = this.data.items.find(it => it._path === path)
    if (!hit) return
    const t = e.touches[0]
    // px -> rpx（约 2 倍，同打卡记录页口径）
    let newDx = (t.clientX - this.data._touchStartX) * 2
    const limit = hit._limit
    if (newDx < limit - 20) newDx = limit - 20
    if (newDx > 10) newDx = 10
    if (Math.abs(newDx) > 10) this._moved = true

    // 节流：位移变化小于 2rpx 时跳过，避免高频 setData 掉帧
    if (this._swipePath === path && Math.abs(newDx - this._lastDx) < 2) return
    this._swipePath = path
    this._lastDx = newDx
    this.setData({ [path + '._dx']: newDx })
  },

  onTouchEnd() {
    const path = this.data._curSwipePath
    if (!path) return
    const hit = this.data.items.find(it => it._path === path)
    if (!hit) return
    const dx = hit._dx || 0
    const limit = hit._limit
    // 越过操作区一半即吸附展开，否则收回
    const target = dx <= limit / 2 ? limit : 0
    this.setData({
      [path + '._dx']: target,
      [path + '._anim']: true,
      _curSwipePath: ''
    })
  },

  // 左滑露出的操作按钮
  onSwipeRename(e) {
    const id = e.currentTarget.dataset.id
    const hit = this.data.items.find(it => it.id === id)
    if (!hit) return
    this.setData({
      sheetVisible: true,
      sheetMode: 'rename',
      sheetTitle: '改名',
      editId: id,
      nameInput: hit.name
    })
  },

  onSwipeDelete(e) {
    const id = e.currentTarget.dataset.id
    const hit = this.data.items.find(it => it.id === id)
    if (!hit) return
    if (!hit.canDelete) {
      wx.showToast({ title: '至少保留一个孩子', icon: 'none' })
      return
    }
    this.setData({
      deleteVisible: true,
      deleteId: id,
      deleteName: hit.name,
      deleteInput: '',
      deleteReady: false
    })
  },

  // ===== 添加 / 改名弹层 =====
  openAdd() {
    if (this.data.isFull) {
      wx.showToast({ title: `最多 ${children.MAX_CHILDREN} 个孩子`, icon: 'none' })
      return
    }
    this.setData({
      sheetVisible: true,
      sheetMode: 'add',
      sheetTitle: '添加孩子',
      editId: '',
      nameInput: ''
    })
  },

  closeSheet() {
    this.setData({ sheetVisible: false })
  },

  onNameInput(e) {
    this.setData({ nameInput: e.detail.value })
  },

  // 失焦截断：maxlength 会把拼音组合期间的字母也计入长度，导致全拼
  // 没打完就输不进（限 8 字时「xiaoerzi」这类全拼必然触发），故输入框
  // 放开 maxlength，在 blur（组合必已结束）按显示宽度截断
  // （汉字 1 / 字母 0.5，与 children._validateName 同口径）；提交时再兜底
  onNameBlur(e) {
    const v = String(e.detail.value || '').trim()
    const clipped = children.clipName(v)
    if (clipped !== v) {
      this.setData({ nameInput: clipped })
      wx.showToast({ title: '最多8个汉字或16个字母', icon: 'none' })
    }
  },

  submitSheet() {
    const isEdit = this.data.sheetMode === 'rename'
    const res = isEdit
      ? children.renameChild(this.data.editId, this.data.nameInput)
      : children.addChild(this.data.nameInput)
    if (!res.ok) {
      wx.showToast({ title: res.error || '保存失败', icon: 'none' })
      return
    }
    this.setData({ sheetVisible: false })
    this._refresh()
  },

  // ===== 删除强确认：输入孩子名字，一致才可删 =====
  onDeleteInput(e) {
    const v = String(e.detail.value || '').trim()
    this.setData({
      deleteInput: v,
      deleteReady: v !== '' && v === this.data.deleteName
    })
  },

  closeDelete() {
    this.setData({ deleteVisible: false })
  },

  confirmDelete() {
    if (!this.data.deleteReady) return
    const wasActive = children.getActiveChildId() === this.data.deleteId
    const res = children.removeChild(this.data.deleteId)
    if (!res.ok) {
      wx.showToast({ title: res.error || '删除失败', icon: 'none' })
      return
    }
    this.setData({ deleteVisible: false })
    this._refresh()
    wx.showToast({
      title: wasActive ? '已删除，切换为剩余孩子' : '已删除',
      icon: 'none'
    })
  }
})
