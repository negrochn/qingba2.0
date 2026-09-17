// 编辑记录页：单条打卡记录的完整表单（日期 / 阶段 / 分组 / 资源 / 时长 / 备注）
// 入口：记录页左滑「编辑」带 ?id=xxx 进入
// 与补录页（pages/backfill，一次补一天的多条）职责分离，互不影响
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
    durationInput: '',
    remarkInput: '',
    canSubmit: false,
    id: ''
  },

  onLoad(options) {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    const today = checkin.todayStr()
    const stages = (routeData.stages || []).map(s => ({ id: s.stage_id, name: s.stage_name }))
    this.setData({ todayStr: today, stages })

    const id = (options && options.id) || ''
    const rec = id ? checkin.getCheckinById(id) : null
    if (!rec) {
      // 记录已被删除 / 数据异常：提示后回退，避免停在空表单上误存
      wx.showToast({ title: '记录不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }

    this.setData({ id })
    wx.setNavigationBarTitle({ title: '编辑记录' })
    this._fillForm(rec)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  // 把记录回填进表单（含阶段 → 分组 → 资源三级级联的展开与选中）
  _fillForm(rec) {
    const day = rec.day || this.data.todayStr
    const stageId = rec.stageId || ''
    const groupKey = rec.groupKey || ''
    const resourceId = rec.resourceId || ''

    // 必须先选阶段：_selectStage 会重载分组列表并清空下级
    this._selectStage(stageId)

    if (groupKey) {
      const items = _loadItems(stageId, groupKey)
      // 资源可能已被删除 / 改名（记录里存的是当时的名称快照），
      // 或老记录本就没有 resourceId：把快照补进列表，保证选中态可见、可保存
      const hit = !!resourceId && items.some(it => it.id === resourceId)
      if (!hit) {
        items.unshift({ id: resourceId, name: rec.resourceName || '未知资源', custom: true })
      }
      this.setData({
        selectedGroupKey: groupKey,
        selectedGroupLabel: resources.getGroupLabel(groupKey),
        items,
        selectedResourceId: resourceId,
        selectedResourceName: rec.resourceName || ''
      })
    }

    this.setData({
      dateStr: day,
      dateText: _fmtDateText(day, this.data.todayStr),
      durationInput: rec.durationMinutes ? String(rec.durationMinutes) : '',
      remarkInput: rec.remark || ''
    })
    this._refreshSubmit()
  },

  // ===== 日期（原生 picker，end 锁今天 → 未来不可选） =====
  onDateChange(e) {
    const day = e.detail.value || ''
    if (!day) return
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

  // 时长校验：>0、<=999、取整后 >=1（与补录页、阶段页打卡弹窗同口径）
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
    // 资源判定：id 优先；老记录可能只有名称快照（无 resourceId），此时按名称放行
    const hasResource = !!this.data.selectedResourceId || !!this.data.selectedResourceName
    this.setData({
      canSubmit: !!this.data.dateStr && hasResource && dur.ok
    })
  },

  // ===== 保存修改 =====
  submit() {
    // 防重复提交：成功后要等 600ms 才 navigateBack，期间连点会重复写入
    if (this._submitting) return

    const d = this.data
    if (!d.id) return
    if (!d.dateStr) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (d.dateStr > d.todayStr) {
      wx.showToast({ title: '不能改为未来日期', icon: 'none' })
      return
    }
    if (!d.selectedResourceId && !d.selectedResourceName) {
      wx.showToast({ title: '请选择资源', icon: 'none' })
      return
    }
    const dur = this._validateDuration()
    if (!dur.ok) {
      wx.showToast({ title: dur.msg, icon: 'none' })
      return
    }

    // 校验全部通过后才上锁（失败路径负责释放）
    this._submitting = true

    const payload = {
      day: d.dateStr,
      stageId: d.selectedStageId,
      stageName: d.selectedStageName,
      groupKey: d.selectedGroupKey,
      groupLabel: d.selectedGroupLabel,
      resourceId: d.selectedResourceId,
      resourceName: d.selectedResourceName,
      durationMinutes: dur.minutes,
      remark: String(d.remarkInput || '').trim()
    }

    // 原地更新记录（保留 id；跨日 / 跨月由 updateCheckin 处理）
    const res = checkin.updateCheckin(d.id, payload)
    if (!res || !res.ok) {
      this._submitting = false
      wx.showToast({ title: '保存失败，请检查存储空间', icon: 'none' })
      return
    }
    wx.showToast({ title: '已保存', icon: 'success' })
    this._backToList(res.day)
  },

  // 返回记录页并让它切到目标月份（回调 records.applyBackfill），改后的记录立即可见
  _backToList(day) {
    const pages = getCurrentPages()
    const prev = pages.length >= 2 ? pages[pages.length - 2] : null
    setTimeout(() => {
      wx.navigateBack({
        success: () => {
          if (prev && typeof prev.applyBackfill === 'function') {
            prev.applyBackfill({ day })
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
