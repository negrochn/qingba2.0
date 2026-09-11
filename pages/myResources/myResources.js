// 「我的资源」：管理自定义资源（新增 / 改名 / 改归属 / 删除）
// 自定义资源会和官方资源一起参与打卡、统计与阶段进度
const customResources = require('../../utils/customResources.js')
const resources = require('../../utils/resources.js')
const checkin = require('../../utils/checkin.js')
const { routeData } = require('../../utils/data.js')

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
        groups.push({
          uid: `${stage.stage_id}|${key}`,
          key,
          label: resources.getGroupLabel(key),
          items: list.map(it => ({ id: it.id, name: it.name }))
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

  // 删除资源（历史记录与统计保留）
  onDelete() {
    const { editId, nameInput } = this.data
    if (!editId) return

    wx.showModal({
      title: '删除资源',
      content: `确认删除《${nameInput}》？已产生的打卡记录与统计会保留。`,
      confirmText: '删除',
      cancelText: '取消',
      confirmColor: '#e74c3c',
      success: (r) => {
        if (!r.confirm) return
        const res = customResources.remove(editId)
        if (!res || !res.ok) {
          wx.showToast({ title: (res && res.error) || '删除失败', icon: 'none' })
          return
        }
        this.setData({ showSheet: false })
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  }
})
