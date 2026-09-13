// 打卡补录页：日期 + 阶段/分组/资源三级级联（同页渐进展开）+ 时长 + 备注
// 补录数据计入阶段时长、统计与晋级判定，记录带 backfilled 标记
const resources = require('../../utils/resources.js')
const checkin = require('../../utils/checkin.js')
const { routeData } = require('../../utils/data.js')

Page({
  data: {
    fontClass: '',
    darkClass: '',
    todayStr: '',
    dateStr: '',
    dateText: '',
    stages: [],       // [{ id, name }]
    groups: [],       // [{ key, label }]
    items: [],        // [{ id, name, custom }]
    selectedStageId: '',
    selectedStageName: '',
    selectedGroupKey: '',
    selectedGroupLabel: '',
    selectedResourceId: '',
    selectedResourceName: '',
    durationInput: '20',
    remarkInput: '',
    canSubmit: false
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    const today = checkin.todayStr()
    const stages = (routeData.stages || []).map(s => ({ id: s.stage_id, name: s.stage_name }))

    // 默认阶段：当前阶段优先，否则第一个
    const cur = checkin.getCurrentStage()
    const stageId = (cur && resources.getStageById(cur.id))
      ? cur.id
      : (stages[0] ? stages[0].id : '')

    this.setData({
      todayStr: today,
      dateStr: today,
      dateText: _fmtDateText(today, today),
      stages
    })
    this._selectStage(stageId)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  // ===== 日期 =====
  onDateChange(e) {
    const day = String(e.detail.value || '')
    this.setData({
      dateStr: day,
      dateText: _fmtDateText(day, this.data.todayStr)
    })
    this._refreshSubmit()
  },

  // ===== 阶段 / 分组 / 资源（渐进展开，改上级清空下级） =====
  pickStage(e) {
    this._selectStage(e.currentTarget.dataset.id || '')
  },

  _selectStage(stageId) {
    const stage = resources.getStageById(stageId)
    const nextId = stage ? stageId : ''
    this.setData({
      selectedStageId: nextId,
      selectedStageName: stage ? stage.stage_name : ''
    })
    this._loadGroups(nextId)
    this._refreshSubmit()
  },

  _loadGroups(stageId) {
    const groups = stageId
      ? resources.getStageGroupKeys(stageId).map(k => ({ key: k, label: resources.getGroupLabel(k) }))
      : []
    this.setData({
      groups,
      items: [],
      selectedGroupKey: '',
      selectedGroupLabel: '',
      selectedResourceId: '',
      selectedResourceName: ''
    })
  },

  pickGroup(e) {
    const key = e.currentTarget.dataset.key || ''
    if (!key) return
    this.setData({
      selectedGroupKey: key,
      selectedGroupLabel: resources.getGroupLabel(key),
      items: _loadItems(this.data.selectedStageId, key),
      selectedResourceId: '',
      selectedResourceName: ''
    })
    this._refreshSubmit()
  },

  pickResource(e) {
    const id = e.currentTarget.dataset.id || ''
    const hit = this.data.items.find(it => it.id === id)
    if (!hit) return
    this.setData({ selectedResourceId: hit.id, selectedResourceName: hit.name })
    this._refreshSubmit()
  },

  // ===== 时长 / 备注 =====
  onDurationInput(e) {
    this.setData({ durationInput: e.detail.value })
    this._refreshSubmit()
  },

  quickDuration(e) {
    this.setData({ durationInput: String(e.currentTarget.dataset.val) })
    this._refreshSubmit()
  },

  onRemarkInput(e) {
    this.setData({ remarkInput: e.detail.value })
  },

  // 时长校验：>0、<=999、取整后 >=1（与阶段页打卡弹窗同口径）
  _validateDuration() {
    const raw = String(this.data.durationInput || '').trim()
    if (!raw) return { ok: false, msg: '请输入时长' }
    const num = Number(raw)
    if (!isFinite(num) || num <= 0) return { ok: false, msg: '时长需为正数' }
    if (num > 999) return { ok: false, msg: '时长过大，请确认' }
    const minutes = Math.round(num)
    if (minutes <= 0) return { ok: false, msg: '时长不足 1 分钟' }
    return { ok: true, minutes }
  },

  _refreshSubmit() {
    const dur = this._validateDuration()
    this.setData({
      canSubmit: !!this.data.dateStr && !!this.data.selectedResourceId && dur.ok
    })
  },

  // ===== 提交 =====
  submit() {
    const d = this.data
    if (!d.dateStr) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (d.dateStr > d.todayStr) {
      wx.showToast({ title: '不能补录未来日期', icon: 'none' })
      return
    }
    if (!d.selectedResourceId) {
      wx.showToast({ title: '请选择资源', icon: 'none' })
      return
    }
    const dur = this._validateDuration()
    if (!dur.ok) {
      wx.showToast({ title: dur.msg, icon: 'none' })
      return
    }

    const record = checkin.addCheckin({
      day: d.dateStr,
      backfilled: true,
      stageId: d.selectedStageId,
      stageName: d.selectedStageName,
      groupKey: d.selectedGroupKey,
      groupLabel: d.selectedGroupLabel,
      resourceId: d.selectedResourceId,
      resourceName: d.selectedResourceName,
      durationMinutes: dur.minutes,
      remark: String(d.remarkInput || '').trim()
    })
    if (!record) {
      wx.showToast({ title: '保存失败，请检查存储空间', icon: 'none' })
      return
    }

    wx.showToast({ title: `已补录 ${checkin.fmtMinutes(dur.minutes)}`, icon: 'success' })

    // 返回记录页并切到补录月份（回调 applyBackfill）
    const pages = getCurrentPages()
    const prev = pages.length >= 2 ? pages[pages.length - 2] : null
    setTimeout(() => {
      wx.navigateBack({
        success: () => {
          if (prev && typeof prev.applyBackfill === 'function') {
            prev.applyBackfill({ day: d.dateStr })
          }
        }
      })
    }, 600)
  }
})

// 该阶段某分组的资源清单（官方 + 自定义）
function _loadItems(stageId, groupKey) {
  const map = resources.getStageResources(stageId)
  const list = map[groupKey]
  if (!Array.isArray(list)) return []
  return list.map(it => ({ id: it.id, name: it.name, custom: !!it.custom }))
}

function _fmtDateText(day, today) {
  return day === today ? `${day}（今天）` : day
}
