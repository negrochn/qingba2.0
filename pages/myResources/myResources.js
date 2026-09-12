// 「我的资源」：管理自定义资源（新增 / 改名 / 改归属 / 删除）
// 自定义资源会和官方资源一起参与打卡、统计与阶段进度
const customResources = require('../../utils/customResources.js')
const resources = require('../../utils/resources.js')
const checkin = require('../../utils/checkin.js')
const { routeData } = require('../../utils/data.js')

// 左滑删除按钮宽度（rpx），与样式 .swipe-bg / .swipe-del 保持一致（同打卡记录页）
const DELETE_W = 150

Page({
  data: {
    fontClass: '',
    darkClass: '',
    // [{ stageId, stageName, groups: [{ uid, key, label, items: [{ id, name }] }] }]
    sections: [],
    totalCount: 0,
    isEmpty: true,
    // 分组展开 / 折叠状态 { [uid]: boolean }，uid = stageId|groupKey（默认全部展开）
    expandedGroups: {},
    maxNameLen: customResources.MAX_NAME_LEN,
    // 左滑删除状态（与打卡记录页同一套实现）
    _curSwipePath: '',   // 当前正在拖动 / 展开的行路径
    _touchStartX: 0,
    _touchStartY: 0,
    // 半屏弹窗（添加 / 编辑）
    showSheet: false,
    sheetTitle: '添加资源',
    isEdit: false,
    editId: '',
    nameInput: '',
    pickStageId: '',
    pickGroupKey: '',
    locationText: '未选择'
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.refresh()
  },

  // 组装展示数据：按阶段分组，阶段内按官方分组顺序列出
  refresh() {
    const all = customResources.getAll()
    const sections = []
    let total = 0

    ;(routeData.stages || []).forEach(stage => {
      const byGroup = all[stage.stage_id] || {}
      const groups = []
      resources.getStageGroupKeys(stage.stage_id).forEach(key => {
        const list = Array.isArray(byGroup[key]) ? byGroup[key] : []
        if (!list.length) return
        const groupsBefore = groups.length
        const sectionsBefore = sections.length
        groups.push({
          uid: `${stage.stage_id}|${key}`,
          key,
          label: resources.getGroupLabel(key),
          items: list.map((it, ii) => ({
            id: it.id,
            name: it.name,
            // 供左滑删除用 setData 精确定位到该行（每次 refresh 重建）
            _path: `sections[${sectionsBefore}].groups[${groupsBefore}].items[${ii}]`,
            _dx: 0,
            _anim: true
          }))
        })
        total += list.length
      })
      if (groups.length) {
        sections.push({ stageId: stage.stage_id, stageName: stage.stage_name, groups })
      }
    })

    // 折叠状态：保留用户已折叠的分组，新增的分组默认展开
    const expandedGroups = { ...this.data.expandedGroups }
    sections.forEach(sec => {
      sec.groups.forEach(grp => {
        if (expandedGroups[grp.uid] === undefined) expandedGroups[grp.uid] = true
      })
    })

    this.setData({ sections, totalCount: total, isEmpty: total === 0, expandedGroups })
  },

  _stageName(stageId) {
    const stage = resources.getStageById(stageId)
    return stage ? stage.stage_name : ''
  },

  _syncLocationText(stageId, groupKey) {
    if (!stageId || !groupKey) {
      this.setData({ locationText: '未选择' })
      return
    }
    this.setData({
      locationText: `${this._stageName(stageId)} · ${resources.getGroupLabel(groupKey)}`
    })
  },

  // 分组展开 / 折叠（与阶段详情页同交互）
  onToggleGroup(e) {
    const uid = e.currentTarget.dataset.uid
    if (!uid) return
    const expandedGroups = { ...this.data.expandedGroups }
    expandedGroups[uid] = !expandedGroups[uid]
    this.setData({ expandedGroups })
  },

  // ===== 弹窗 =====
  openAdd() {
    const cur = checkin.getCurrentStage()
    const stageId = (cur && resources.getStageById(cur.id))
      ? cur.id
      : ((routeData.stages[0] || {}).stage_id || '')
    const keys = resources.getStageGroupKeys(stageId)

    this.setData({
      showSheet: true,
      sheetTitle: '添加资源',
      isEdit: false,
      editId: '',
      nameInput: '',
      pickStageId: stageId,
      pickGroupKey: keys[0] || ''
    })
    this._syncLocationText(stageId, keys[0] || '')
  },

  openEdit(e) {
    // 刚发生过左滑：本次 tap 不当作点击，避免滑完误开弹窗
    if (this._moved) {
      this._moved = false
      return
    }
    const id = e.currentTarget.dataset.id
    const found = customResources.findById(id)
    if (!found) {
      wx.showToast({ title: '资源不存在', icon: 'none' })
      return
    }
    this.setData({
      showSheet: true,
      sheetTitle: '编辑资源',
      isEdit: true,
      editId: id,
      nameInput: found.resource.name,
      pickStageId: found.stageId,
      pickGroupKey: found.groupKey
    })
    this._syncLocationText(found.stageId, found.groupKey)
  },

  closeSheet() {
    this.setData({ showSheet: false })
  },

  noop() {},

  onNameInput(e) {
    this.setData({ nameInput: e.detail.value })
  },

  // 跳转归属选择页（整页单选，返回后由本页 applyPickLocation 接收）
  goPicker() {
    const { pickStageId, pickGroupKey } = this.data
    wx.navigateTo({
      url: `/pages/resourcePicker/resourcePicker?stageId=${pickStageId}&groupKey=${pickGroupKey}`
    })
  },

  // 归属选择页回调
  applyPickLocation(opt) {
    if (!opt || !opt.stageId) return
    this.setData({ pickStageId: opt.stageId, pickGroupKey: opt.groupKey || '' })
    this._syncLocationText(opt.stageId, opt.groupKey || '')
  },

  // 提交新增 / 保存编辑
  submitSheet() {
    const { isEdit, editId, nameInput, pickStageId, pickGroupKey } = this.data
    if (!pickStageId || !pickGroupKey) {
      wx.showToast({ title: '请选择归属', icon: 'none' })
      return
    }

    const payload = { stageId: pickStageId, groupKey: pickGroupKey, name: nameInput }
    const res = isEdit
      ? customResources.update(editId, payload)
      : customResources.add(payload)

    if (!res || !res.ok) {
      wx.showToast({ title: (res && res.error) || '操作失败', icon: 'none' })
      return
    }

    this.setData({ showSheet: false })
    this.refresh()
    wx.showToast({ title: isEdit ? '已保存' : '已添加', icon: 'success' })
  },

  // ===== 左滑删除（与打卡记录页同一套交互） =====
  // 行路径形如 sections[0].groups[1].items[2]，用于 setData 定位
  _findItem(path) {
    const m = /^sections\[(\d+)\]\.groups\[(\d+)\]\.items\[(\d+)\]$/.exec(path || '')
    if (!m) return null
    const sec = this.data.sections[Number(m[1])]
    const grp = sec && sec.groups[Number(m[2])]
    const it = grp && grp.items[Number(m[3])]
    return it || null
  },

  _snapDx(dx) {
    return dx <= -DELETE_W / 2 ? -DELETE_W : 0
  },

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
    this.data.sections.forEach(sec => {
      sec.groups.forEach(grp => {
        grp.items.forEach(it => {
          if (it._path !== path && it._dx) {
            patch[it._path + '._dx'] = 0
            patch[it._path + '._anim'] = true
          }
        })
      })
    })
    patch[path + '._anim'] = false
    this.setData(patch)
  },

  onTouchMove(e) {
    const path = this.data._curSwipePath
    if (!path) return
    const t = e.touches[0]
    // px → rpx（约 2 倍，与打卡记录页同口径）
    let newDx = (t.clientX - this.data._touchStartX) * 2
    if (newDx < -(DELETE_W + 20)) newDx = -(DELETE_W + 20)
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
    const cur = this._findItem(path)
    const target = this._snapDx(cur ? (cur._dx || 0) : 0)
    this.setData({
      [path + '._dx']: target,
      [path + '._anim']: true,
      _curSwipePath: ''
    })
  },

  // 左滑露出的删除按钮（二次确认；历史记录与统计保留）
  onDeleteItem(e) {
    const id = e.currentTarget.dataset.id
    const found = customResources.findById(id)
    if (!found) {
      wx.showToast({ title: '资源不存在', icon: 'none' })
      return
    }

    wx.showModal({
      title: '删除资源',
      content: `确认删除《${found.resource.name}》？已产生的打卡记录与统计会保留。`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#e74c3c',
      success: (r) => {
        if (!r.confirm) return
        const res = customResources.remove(id)
        if (!res || !res.ok) {
          wx.showToast({ title: (res && res.error) || '删除失败', icon: 'none' })
          return
        }
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  }
})
