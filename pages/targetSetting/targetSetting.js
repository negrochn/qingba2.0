// 阶段目标时长设置页
// 两层结构：默认档位（一个值管所有未单独设置的阶段）+ 各阶段自定义（填了就压过默认档）
const checkin = require('../../utils/checkin.js')
const { parseTargetHours, getRequiredHours } = require('../../utils/data.js')

// 自定义目标的小时数范围（整数，与官方 time_investment 的 H 单位一致）
const HOURS_MIN = 1
const HOURS_MAX = 999

// 小时数展示：整数直接显示，非整数收敛到 1 位小数（自定义值由本页保证为整数，此处兜住历史/导入数据）
function fmtHours(h) {
  const n = Number(h) || 0
  if (!(n > 0)) return '—'
  return Number.isInteger(n) ? String(n) : String(+n.toFixed(1))
}

Page({
  data: {
    mode: 'upper',
    modeItems: [
      { key: 'upper', label: '建议区间上限', desc: '如常规1 的「60-80H」按 80H 计算（默认）' },
      { key: 'lower', label: '建议区间下限', desc: '如常规1 的「60-80H」按 60H 计算，进度更快' }
    ],
    stages: [],
    // 目标时长编辑弹层
    showSheet: false,
    editingId: '',
    editingName: '',
    editingSuggestion: '',
    editingCustom: false,
    hoursInput: '',
    quickHours: [],
    fontClass: '',
    darkClass: ''
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

  // 各阶段的「生效值」统一由 getRequiredHours 算出（与进度计算同一处口径，页面不自算）
  refresh() {
    const mode = checkin.getTargetMode()
    const customMap = checkin.getCustomTargets()
    const stages = checkin.getCurrentRoute().stages.map(s => {
      const customHours = customMap[s.stage_id]
      const required = getRequiredHours(s, { mode, custom: customHours })
      return {
        id: s.stage_id,
        name: s.stage_name,
        suggestion: s.time_investment || '—',
        hoursText: fmtHours(required.hours) + (required.hours > 0 ? 'H' : ''),
        custom: typeof customHours === 'number'
      }
    })
    this.setData({ mode, stages })
  },

  // 切换默认档位：未自定义的阶段会跟着变（列表随之重算）
  onModeChange(e) {
    if (checkin.setTargetMode(e.detail.key)) {
      this.refresh()
    }
  },

  // 点某阶段：打开目标时长弹层。快捷按钮取该阶段官方区间的两端（无区间时只有一个）
  onStageTap(e) {
    const { id, name } = e.currentTarget.dataset
    const stage = checkin.getCurrentRoute().stages.find(s => s.stage_id === id)
    const item = this.data.stages.find(s => s.id === id)
    if (!stage || !item) return

    const target = parseTargetHours(stage.time_investment)
    // 快捷值 = 官方区间两端（无区间时只有一个）。
    // str 用于与输入框比较选中态（wxml 里不能调 String()），label 带单位
    const quickHours = target
      ? (target.min === target.max ? [target.min] : [target.min, target.max]).map(n => ({
          str: String(n),
          label: `${n}H`
        }))
      : []
    const customHours = checkin.getCustomTarget(id)
    const hasCustom = typeof customHours === 'number'
    // 回填值：有覆盖用覆盖值，否则用该阶段当前的生效值（跟随默认档）
    const current = hasCustom ? customHours : getRequiredHours(stage, { mode: this.data.mode }).hours

    this.setData({
      showSheet: true,
      editingId: id,
      editingName: name,
      editingSuggestion: item.suggestion,
      editingCustom: hasCustom,
      hoursInput: current > 0 ? String(current) : '',
      quickHours
    })
  },

  closeSheet() {
    this.setData({ showSheet: false })
  },

  onHoursInput(e) {
    this.setData({ hoursInput: e.detail.value })
  },

  quickHours(e) {
    this.setData({ hoursInput: String(e.currentTarget.dataset.val) })
  },

  // 保存自定义目标
  submitSheet() {
    const id = this.data.editingId
    if (!id) return
    const raw = String(this.data.hoursInput || '').trim()
    // 只收正整数：1-999（0 与空串都视为非法，不用真值判断兜底）
    if (!/^\d{1,3}$/.test(raw)) {
      wx.showToast({ title: `请输入 ${HOURS_MIN}-${HOURS_MAX} 的整数`, icon: 'none' })
      return
    }
    const hours = Number(raw)
    if (hours < HOURS_MIN || hours > HOURS_MAX) {
      wx.showToast({ title: `请输入 ${HOURS_MIN}-${HOURS_MAX} 的整数`, icon: 'none' })
      return
    }
    if (!checkin.setCustomTarget(id, hours)) {
      wx.showToast({ title: '保存失败,请检查存储空间', icon: 'none' })
      return
    }
    this.setData({ showSheet: false })
    this.refresh()
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  // 恢复默认：删掉覆盖，该阶段重新跟随默认档
  onRestore() {
    const id = this.data.editingId
    if (!id) return
    if (!checkin.clearCustomTarget(id)) {
      wx.showToast({ title: '保存失败,请检查存储空间', icon: 'none' })
      return
    }
    this.setData({ showSheet: false })
    this.refresh()
    wx.showToast({ title: '已恢复默认', icon: 'success' })
  }
})
