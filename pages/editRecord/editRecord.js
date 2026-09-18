// 编辑记录页：单条打卡记录的完整表单（日期 / 阶段 / 分组 / 资源 / 时长 / 备注）
// 入口：记录页左滑「编辑」带 ?id=xxx 进入
// 与补录页（pages/backfill，一次补一天的多条）职责分离，互不影响
//
// 阶段用原生 <picker mode="selector">；分组 + 资源用 <picker mode="multiSelector">
// 两列联动（左列分组、右列该分组的资源），与补录页改用原生选择器的取向一致，
// 也免去原先「三组整页单选列表」依次展开的长表单。
const resources = require('../../utils/resources.js')
const checkin = require('../../utils/checkin.js')
const { routeData, listeningFactor, listeningTip } = require('../../utils/data.js')

Page({
  data: {
    fontClass: '',
    darkClass: '',
    todayStr: '',
    dateStr: '',
    dateText: '',
    stages: [],            // [{ id, name }]
    stageNames: [],        // 阶段 picker 的 range
    stageIndex: 0,
    groups: [],            // [{ key, label }]
    multiRange: [[], []],  // 两列 picker 的 range：[分组名数组, 当前分组的资源名数组]
    multiValue: [0, 0],    // 两列 picker 的选中下标
    selectedStageId: '',
    selectedStageName: '',
    selectedGroupKey: '',
    selectedGroupLabel: '',
    selectedResourceId: '',
    selectedResourceName: '',
    durationInput: '',
    remarkInput: '',
    listeningTip: '',      // 熏听折算提示（选中熏听分组的资源时显示）
    canSubmit: false,
    id: ''
  },

  onLoad(options) {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    const today = checkin.todayStr()
    const stages = (routeData.stages || []).map(s => ({ id: s.stage_id, name: s.stage_name }))
    this.setData({ todayStr: today, stages, stageNames: stages.map(s => s.name) })

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

  // 把记录回填进表单：阶段 → 分组 → 资源各级反查下标，让两个 picker 定位到原值
  _fillForm(rec) {
    const day = rec.day || this.data.todayStr
    const stageId = rec.stageId || ''
    const groupKey = rec.groupKey || ''
    const resourceId = rec.resourceId || ''

    // 先选阶段：_selectStage 会重建分组列表与 multiRange
    this._selectStage(stageId)

    if (groupKey) {
      const groups = (this.data.groups || []).slice()
      let gi = groups.findIndex(g => g.key === groupKey)
      if (gi < 0) {
        // 记录里的分组不在当前列表（典型：熏听开关被关掉）：补一行占位。
        // 否则会静默落到第一个分组，一保存就把这条记录的分组改掉了
        groups.unshift({ key: groupKey, label: resources.getGroupLabel(groupKey) })
        this._groupItems.unshift(_loadItems(stageId, groupKey))
        gi = 0
      }

      const list = (this._groupItems[gi] || []).slice()
      // 资源可能已被删除 / 改名（记录里存的是当时的名称快照），
      // 或老记录本就没有 resourceId：把快照补进列表，保证选中态可见、可保存
      let ri = resourceId ? list.findIndex(it => it.id === resourceId) : -1
      if (ri < 0) {
        list.unshift({ id: resourceId, name: rec.resourceName || '未知资源', custom: true })
        ri = 0
      }
      this._groupItems[gi] = list

      this.setData({
        groups,
        'multiRange[0]': groups.map(g => g.label),
        'multiRange[1]': list.map(_itemLabel),
        multiValue: [gi, ri],
        selectedGroupKey: groupKey,
        selectedGroupLabel: resources.getGroupLabel(groupKey),
        selectedResourceId: resourceId,
        selectedResourceName: rec.resourceName || '',
        listeningTip: listeningTip(stageId, groupKey, rec.durationMinutes)
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

  // ===== 阶段（原生 picker：点「取消」不触发 bindchange，无需额外处理） =====
  onStageChange(e) {
    const s = (this.data.stages || [])[Number(e.detail.value)]
    if (!s) return
    // 改阶段会清空下级（分组 / 资源），与原「渐进展开」逻辑一致
    this._selectStage(s.id)
  },

  _selectStage(stageId) {
    const stage = resources.getStageById(stageId)
    const nextId = stage ? stageId : ''
    const stages = this.data.stages || []
    this.setData({
      selectedStageId: nextId,
      selectedStageName: stage ? stage.stage_name : '',
      stageIndex: Math.max(0, stages.findIndex(s => s.id === nextId))
    })
    this._loadGroups(nextId)
    this._refreshSubmit()
  },

  // 载入该阶段的全部资源并按分组缓存 —— 两列联动的右列直接从缓存取，不必反复读存储
  _loadGroups(stageId) {
    const groups = stageId
      ? resources.getStageGroupKeys(stageId).map(k => ({ key: k, label: resources.getGroupLabel(k) }))
      : []
    this._groupItems = groups.map(g => _loadItems(stageId, g.key))
    const first = this._groupItems[0] || []
    this.setData({
      groups,
      multiRange: [groups.map(g => g.label), first.map(_itemLabel)],
      multiValue: [0, 0],
      selectedGroupKey: '',
      selectedGroupLabel: '',
      selectedResourceId: '',
      selectedResourceName: '',
      listeningTip: ''
    })
  },

  // 左列（分组）滚动：重建右列，并把两列下标一起写回 ——
  // picker 的 value 是受控的，只改右列的话，它会拿没变的 multiValue[0]
  // 把左列复位回第一个分组（表现为「分组切不动」）；
  // 右列也必须重置为 0，否则会停在上一分组的旧下标上而错位
  onColumnChange(e) {
    const { column, value } = e.detail
    if (column !== 0) return
    const list = this._groupItems[value] || []
    this.setData({
      'multiRange[1]': list.map(_itemLabel),
      multiValue: [value, 0]
    })
  },

  // 点「确定」才落实选中（滚动过程中不改数据）
  onMultiConfirm(e) {
    const [gi, ri] = e.detail.value || []
    const g = (this.data.groups || [])[gi]
    const list = this._groupItems[gi] || []
    const r = list[ri]
    if (!g || !r) {
      // 空分组点确定不应静默失败，否则像「改不动」
      wx.showToast({ title: '该分组暂无资源', icon: 'none' })
      return
    }
    this.setData({
      // 同步下标：下次打开弹层停在这次选中的分组，而不是记录原来的分组
      multiValue: [gi, ri],
      selectedGroupKey: g.key,
      selectedGroupLabel: g.label,
      selectedResourceId: r.id,
      selectedResourceName: r.name,
      listeningTip: listeningTip(this.data.selectedStageId, g.key, this.data.durationInput)
    })
    this._refreshSubmit()
  },

  // ===== 时长 / 备注 =====
  onDurationInput(e) {
    const v = e.detail.value
    this.setData({ durationInput: v })
    // 熏听分组的折算提示随时长变化（非熏听分组返回空串，自动清除）
    if (this.data.selectedGroupKey) {
      this.setData({
        listeningTip: listeningTip(this.data.selectedStageId, this.data.selectedGroupKey, v)
      })
    }
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

// 两列 picker 里每项显示的文字：原生 picker 只能渲染纯文本，
// 所以「自定义」标记拼进名字（语义与补录页资源选择弹层的尾标一致）
function _itemLabel(it) {
  return it.custom ? `${it.name}（自定义）` : it.name
}

function _fmtDateText(day, today) {
  return day === today ? `${day}（今天）` : day
}
