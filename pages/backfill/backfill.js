// 补录页：一次补「一天」，当天可以填多条（不同资源 / 时长各占一条），一次写盘
//
// 三个提效点：
//   1) 不离开页面 —— 资源用底部弹层选，选完直接聚焦该行时长输入框
//   2) 不重复选上下文 —— 阶段固定在页面顶部（默认当前阶段），分组随资源一起带出
//   3) 不分次提交 —— 全填完一次性落盘（checkin.addCheckinsOnDay，一次读一次写）
//
// 单条记录的编辑在 pages/editRecord，两页职责分离
const resources = require('../../utils/resources.js')
const checkin = require('../../utils/checkin.js')
const { routeData } = require('../../utils/data.js')

const MAX_ROWS = 10 // 单天上限

let _ridSeq = 0
function _newRid() {
  _ridSeq++
  return 'r' + Date.now().toString(36) + '_' + _ridSeq
}

function _fmtDateText(day, today) {
  return day === today ? `${day}（今天）` : day
}

// 时长：>0、<=999、取整后 >=1（与 editRecord、阶段页打卡弹窗同口径）
function _parseDuration(v) {
  const raw = String(v == null ? '' : v).trim()
  if (!raw) return 0
  const num = Number(raw)
  if (!isFinite(num) || num <= 0 || num > 999) return 0
  const minutes = Math.round(num)
  return minutes > 0 ? minutes : 0
}

Page({
  data: {
    fontClass: '',
    darkClass: '',
    todayStr: '',
    dateStr: '',
    dateText: '',

    // 阶段：原生 picker 选择（与日期行同一交互）
    stages: [],       // [{ id, name }]
    stageNames: [],   // picker range
    stageIndex: 0,
    selectedStageId: '',
    selectedStageName: '',

    // 当天的记录行
    rows: [],
    focusRowKey: '',     // 当前聚焦的时长输入框

    // 资源选择器弹层
    pickerShow: false,
    pickerRowKey: '',
    pickerValue: '',

    totalCount: 0,
    totalMinutes: 0,
    totalText: '',
    canSubmit: false
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)

    const today = checkin.todayStr()
    const stages = (routeData.stages || []).map(s => ({ id: s.stage_id, name: s.stage_name }))

    // 默认阶段：当前阶段优先，否则第一个
    const cur = checkin.getCurrentStage()
    const stageId = (cur && resources.getStageById(cur.id)) ? cur.id : (stages[0] ? stages[0].id : '')
    const stage = resources.getStageById(stageId)

    const idx = stages.findIndex(s => s.id === stageId)

    this.setData({
      todayStr: today,
      dateStr: today,
      dateText: _fmtDateText(today, today),
      stages,
      stageNames: stages.map(s => s.name),
      stageIndex: idx >= 0 ? idx : 0,
      selectedStageId: stageId,
      selectedStageName: stage ? stage.stage_name : '',
      rows: [this._blankRow()]
    })
    this._refreshTotals()
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onUnload() {
    if (this._totalsTimer) clearTimeout(this._totalsTimer)
    this._totalsTimer = null
    if (this._kbTimer) clearTimeout(this._kbTimer)
    this._kbTimer = null
  },

  _blankRow() {
    return {
      rid: _newRid(),
      resourceId: '',
      resourceName: '',
      groupKey: '',
      groupLabel: '',
      durationInput: ''
    }
  },

  // ===== 日期（原生 picker，end 锁今天 → 未来不可选） =====
  onDateChange(e) {
    const day = e.detail.value || ''
    if (!day) return
    this.setData({
      dateStr: day,
      dateText: _fmtDateText(day, this.data.todayStr)
    })
  },

  // ===== 阶段（原生 picker，点「取消」不触发 bindchange，故无需额外处理） =====
  onStageChange(e) {
    const idx = Number(e.detail.value)
    const stage = (this.data.stages || [])[idx]
    if (!stage || stage.id === this.data.selectedStageId) return

    const apply = () => {
      this.setData({
        stageIndex: idx,
        selectedStageId: stage.id,
        selectedStageName: stage.name,
        rows: [this._blankRow()],
        focusRowKey: ''
      })
      this._refreshTotals()
    }

    // 行里存的是旧阶段的资源快照，切阶段必须清掉，否则会写出「阶段与资源不匹配」的记录
    const filled = (this.data.rows || []).filter(r => r.resourceId).length
    if (filled > 0) {
      wx.showModal({
        title: '切换阶段',
        content: `已填写的 ${filled} 条记录会被清空，确认切换？`,
        success: (res) => { if (res.confirm) apply() }
      })
      return
    }
    apply()
  },

  // ===== 记录行 =====
  onAddRow() {
    if (this.data.rows.length >= MAX_ROWS) {
      wx.showToast({ title: `单日最多 ${MAX_ROWS} 条`, icon: 'none' })
      return
    }
    const rows = this.data.rows.concat([this._blankRow()])
    this.setData({ rows })
    // 新行直接弹出资源选择器，省掉一次点击
    this._openPicker(rows[rows.length - 1].rid)
  },

  onRemoveRow(e) {
    const rid = e.currentTarget.dataset.rid
    if (!rid) return
    this.setData({
      rows: this.data.rows.filter(r => r.rid !== rid),
      focusRowKey: ''
    })
    this._refreshTotals()
  },

  // ===== 资源选择 =====
  openPicker(e) {
    const rid = e.currentTarget.dataset.rid
    if (rid) this._openPicker(rid)
  },

  _openPicker(rid) {
    const row = (this.data.rows || []).find(r => r.rid === rid) || null
    this._pickerRid = rid

    // 开弹层前必须收键盘：软键盘是原生层、**永远盖在弹层之上**（表现为弹层刚推出就被数字键盘压住）。
    // 真机上「先收键盘、再显示弹层」不够：
    //   · iOS 有「input 失焦后键盘不自动收起」的已知问题；
    //   · 弹层自身的 transform 过渡会在输入框仍聚焦时把键盘重新拉起来
    //     （官方 input 文档 Tip：「在 input 聚焦期间，避免使用 css 动画」）。
    // 所以分两步：先把受控 focus 归零 —— 配合 onDurationFocus，focusRowKey 一定指向真正聚焦的
    // 那一行，置空才会产生 true→false 的属性变化、框架才可能失焦；再等弹层渲染落地后补收一次
    // 键盘，让键盘成为最后一个动作。
    if (this._kbTimer) clearTimeout(this._kbTimer)
    this.setData({ focusRowKey: '' })
    this._hideKeyboard()

    this.setData({
      pickerShow: true,
      pickerRowKey: rid,
      pickerValue: row ? row.resourceId : ''
    })

    this._kbTimer = setTimeout(() => {
      this._kbTimer = null
      // 弹层已被关掉就别再动键盘 —— 用户选中资源时 _focusRow 刚把键盘叫回来，不能误收
      if (!this.data.pickerShow) return
      this._hideKeyboard()
    }, 120)
  },

  // 收软键盘：低版本客户端没有该方法，先判断再调（同 theme.js 的兜底写法）；无键盘时它走 fail，忽略
  _hideKeyboard() {
    if (wx.hideKeyboard) wx.hideKeyboard({ fail: () => {} })
  },

  onPickerClose() {
    this.setData({ pickerShow: false, pickerRowKey: '' })
  },

  // 选中资源 → 更新该行（分组一并带出）→ 关弹层 → 自动聚焦该行时长框
  onResourceChange(e) {
    const d = e.detail || {}
    const rid = this._pickerRid
    const idx = (this.data.rows || []).findIndex(r => r.rid === rid)
    if (idx < 0) {
      this.setData({ pickerShow: false, pickerRowKey: '' })
      return
    }

    const updates = {
      pickerShow: false,
      pickerRowKey: '',
      pickerValue: d.resourceId || ''
    }
    updates[`rows[${idx}].resourceId`] = d.resourceId || ''
    updates[`rows[${idx}].resourceName`] = d.resourceName || ''
    updates[`rows[${idx}].groupKey`] = d.groupKey || ''
    updates[`rows[${idx}].groupLabel`] = d.groupLabel || ''

    this.setData(updates)
    this._refreshTotals()
    this._focusRow(rid)
  },

  // 聚焦某行的时长输入框（rid 传空串 = 收起键盘）
  // 同一行重复聚焦时 focus 属性值没变化、不会重新唤起键盘，故先置空、下一拍再置回
  _focusRow(rid) {
    if (rid && rid === this.data.focusRowKey) {
      this.setData({ focusRowKey: '' })
      setTimeout(() => this.setData({ focusRowKey: rid }), 60)
      return
    }
    this.setData({ focusRowKey: rid })
  },

  // ===== 时长 =====
  // 用户直接点击某行时长框也会聚焦，这里跟着记下来 —— 否则 focusRowKey 只反映
  // _focusRow() 的程序化聚焦，「置空 focusRowKey 以失焦」时可能清的是个不相干的值，
  // 真正聚焦的那个 input 属性值没变化、框架无从失焦（真机踩坑，详见 _openPicker）
  onDurationFocus(e) {
    const rid = e.currentTarget.dataset.rid
    if (rid && rid !== this.data.focusRowKey) this.setData({ focusRowKey: rid })
  },

  onDurationInput(e) {
    const rid = e.currentTarget.dataset.rid
    const idx = (this.data.rows || []).findIndex(r => r.rid === rid)
    if (idx < 0) return
    // 只更新对应行的路径，避免整个 rows 走一轮 setData
    this.setData({ [`rows[${idx}].durationInput`]: e.detail.value })
    this._scheduleTotals()
  },

  // 键盘「完成」→ 跳到下一条已选资源的行；没有则收起键盘
  onDurationConfirm(e) {
    const rid = e.currentTarget.dataset.rid
    const rows = this.data.rows || []
    const idx = rows.findIndex(r => r.rid === rid)
    let next = ''
    for (let i = idx + 1; i < rows.length; i++) {
      if (rows[i].resourceId) { next = rows[i].rid; break }
    }
    this._focusRow(next)
  },

  // 汇总做 200ms 节流：连续输入时不必每敲一个数字都重算
  _scheduleTotals() {
    if (this._totalsTimer) clearTimeout(this._totalsTimer)
    this._totalsTimer = setTimeout(() => {
      this._totalsTimer = null
      this._refreshTotals()
    }, 200)
  },

  _refreshTotals() {
    let count = 0
    let minutes = 0
    ;(this.data.rows || []).forEach(r => {
      const m = _parseDuration(r.durationInput)
      if (r.resourceId && m > 0) {
        count++
        minutes += m
      }
    })
    this.setData({
      totalCount: count,
      totalMinutes: minutes,
      totalText: count ? `共 ${count} 条 · ${checkin.fmtMinutes(minutes)}` : '还没填内容',
      canSubmit: count > 0
    })
  },

  // ===== 提交 =====
  submit() {
    // 防重复提交：成功后要等 600ms 才 navigateBack，期间连点会重复写入
    if (this._submitting) return

    const d = this.data
    if (!d.dateStr) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (d.dateStr > d.todayStr) {
      wx.showToast({ title: '不能补录未来日期', icon: 'none' })
      return
    }
    if (!d.selectedStageId) {
      wx.showToast({ title: '请选择阶段', icon: 'none' })
      return
    }

    const records = []
    let partial = 0      // 半填行（只选了资源 / 只填了时长）
    let badDuration = 0  // 时长非法

    ;(d.rows || []).forEach(r => {
      const hasRes = !!r.resourceId
      const durRaw = String(r.durationInput == null ? '' : r.durationInput).trim()
      const hasDur = !!durRaw
      if (!hasRes && !hasDur) return // 完全空行：静默跳过
      if (!hasRes || !hasDur) {
        partial++
        return
      }
      const m = _parseDuration(durRaw)
      if (!m) {
        badDuration++
        return
      }
      records.push({
        stageId: d.selectedStageId,
        stageName: d.selectedStageName,
        groupKey: r.groupKey,
        groupLabel: r.groupLabel,
        resourceId: r.resourceId,
        resourceName: r.resourceName,
        durationMinutes: m
      })
    })

    if (partial) {
      wx.showToast({ title: '有未填完的记录，请补全或删除', icon: 'none' })
      return
    }
    if (badDuration) {
      wx.showToast({ title: '时长需为 1~999 分钟', icon: 'none' })
      return
    }
    if (!records.length) {
      wx.showToast({ title: '请至少填写一条记录', icon: 'none' })
      return
    }

    // 校验全部通过后才上锁（失败路径负责释放）
    this._submitting = true

    const res = checkin.addCheckinsOnDay(d.dateStr, records)
    if (!res || !res.ok) {
      this._submitting = false
      wx.showToast({ title: '保存失败，请检查存储空间', icon: 'none' })
      return
    }

    wx.showToast({ title: `已补录 ${res.count} 条`, icon: 'success' })
    this._backToList(d.dateStr)
  },

  // 返回记录页并让它切到补录月份（回调 records.applyBackfill），新记录立即可见
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
