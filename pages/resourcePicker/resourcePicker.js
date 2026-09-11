// 资源归属选择页（整页单选：先选阶段，再选该阶段下的分组）
// 返回方式：wx.navigateBack 后回调上一页（myResources.applyPickLocation）
const resources = require('../../utils/resources.js')
const customResources = require('../../utils/customResources.js')
const { routeData } = require('../../utils/data.js')

Page({
  data: {
    fontClass: '',
    darkClass: '',
    stages: [],            // [{ id, name, full }]
    groups: [],            // [{ key, label }]
    selectedStageId: '',
    selectedGroupKey: ''
  },

  onLoad(options) {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    const opt = options || {}
    const stages = (routeData.stages || []).map(s => ({
      id: s.stage_id,
      name: s.stage_name,
      full: customResources.countByStage(s.stage_id) >= customResources.MAX_PER_STAGE
    }))

    let stageId = opt.stageId || ''
    if (!resources.getStageById(stageId)) {
      stageId = stages.length ? stages[0].id : ''
    }

    this.setData({ stages, selectedStageId: stageId })
    this._loadGroups(stageId, opt.groupKey || '')
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  _loadGroups(stageId, keepKey) {
    const keys = resources.getStageGroupKeys(stageId)
    const groups = keys.map(k => ({ key: k, label: resources.getGroupLabel(k) }))
    const exists = groups.some(g => g.key === keepKey)
    this.setData({
      groups,
      selectedGroupKey: exists ? keepKey : (groups[0] ? groups[0].key : '')
    })
  },

  pickStage(e) {
    const id = e.currentTarget.dataset.id
    const st = (this.data.stages || []).find(s => s.id === id)
    if (!st) return
    // 该阶段已达上限且不是当前所属阶段：置灰并提示
    if (st.full && id !== this.data.selectedStageId) {
      wx.showToast({ title: `该阶段自定义资源已达 ${customResources.MAX_PER_STAGE} 个`, icon: 'none' })
      return
    }
    this.setData({ selectedStageId: id, selectedGroupKey: '' })
    this._loadGroups(id, '')
  },

  pickGroup(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    this.setData({ selectedGroupKey: key })
    this._confirm(this.data.selectedStageId, key)
  },

  _confirm(stageId, groupKey) {
    const stage = resources.getStageById(stageId)
    const opt = {
      stageId,
      stageName: stage ? stage.stage_name : '',
      groupKey,
      groupLabel: resources.getGroupLabel(groupKey)
    }

    const pages = getCurrentPages()
    const prev = pages.length >= 2 ? pages[pages.length - 2] : null
    wx.navigateBack({
      success: () => {
        if (prev && typeof prev.applyPickLocation === 'function') {
          prev.applyPickLocation(opt)
        }
      }
    })
  }
})
