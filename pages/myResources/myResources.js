// 「我的资源」：全量资源管理（官方 + 自定义）
//   - 左滑隐藏（黑名单：不删数据，仅从打卡视图摘除）——官方与自定义均可；
//     隐藏行原位淡化展示，左滑「恢复」就地还原
//   - 左滑删除（仅自定义资源；历史记录与统计保留）
//   - 点自定义资源改名 / 改归属；官方资源只读
//   - 组内顺序在独立排序页调整（pages/resourceSort，分组头「排序」进入）
// 自定义资源会和官方资源一起参与打卡、统计与阶段进度
const customResources = require('../../utils/customResources.js')
const resourcePrefs = require('../../utils/resourcePrefs.js')
const resources = require('../../utils/resources.js')
const checkin = require('../../utils/checkin.js')

// 左滑按钮宽度（rpx）：隐藏钮 150，自定义资源追加删除钮 150（同打卡记录页 150/钮口径）
const HIDE_W = 150
const DEL_W = 150

// 阶段索引条文案：条上单字符（IDX_CHAR）+ 按住气泡短名（IDX_TIP）。
// 两条路线同表——stage_id 命名空间不撞；牛N 序号在整条大循环上全局唯一
// （调整线牛1-3 / 标准线牛4-6 / 三阶段牛7-9，互不重叠），条上无需轨道前缀，
// 轨道信息由气泡短名（调牛N / 标牛N）补足。映射缺项兜底取阶段名首字 / 全名
const IDX_CHAR = {
  regular_1: '1', regular_2: '2', regular_3: '3',
  regular_4: '4', regular_5: '5', regular_6: '6',
  pre_bridge: '准',
  big_loop_pre: '前', big_loop_1: '一',
  big_loop_2_adjust_niu1: '1', big_loop_2_adjust_niu2: '2', big_loop_2_adjust_niu3: '3',
  big_loop_2_standard_niu4: '4', big_loop_2_standard_niu5: '5', big_loop_2_standard_niu6: '6',
  big_loop_3: '三'
}
const IDX_TIP = {
  regular_1: '常规1', regular_2: '常规2', regular_3: '常规3',
  regular_4: '常规4', regular_5: '常规5', regular_6: '常规6',
  pre_bridge: '准桥梁',
  big_loop_pre: '前置', big_loop_1: '一阶',
  big_loop_2_adjust_niu1: '调牛1', big_loop_2_adjust_niu2: '调牛2', big_loop_2_adjust_niu3: '调牛3',
  big_loop_2_standard_niu4: '标牛4', big_loop_2_standard_niu5: '标牛5', big_loop_2_standard_niu6: '标牛6',
  big_loop_3: '三阶'
}

Page({
  data: {
    fontClass: '',
    darkClass: '',
    // [{ stageId, stageName, groups: [{ uid, key, label, hidden, items: [{ id, name, custom }] }] }]
    sections: [],
    totalCount: 0,
    isEmpty: true,
    // 分组展开 / 折叠状态 { [uid]: boolean }，uid = stageId|groupKey
    // 默认全部展开：索引条已解决长列表导航（此前靠折叠把页面压成分组目录），
    // 全展开后索引可一步定位到行，行左滑等操作也省去先展开的步骤；
    // 用户收起过的分组会话内照旧记忆
    expandedGroups: {},
    maxNameLen: customResources.MAX_NAME_LEN,
    // 左滑状态（与打卡记录页同一套实现）
    _curSwipePath: '',   // 当前正在拖动 / 展开的行路径
    _idxHide: false,     // 左滑拖动 / 滑开保持时渐隐索引条（让开右侧操作按钮区）
    _touchStartX: 0,
    _touchStartY: 0,
    // 半屏弹窗（添加 / 编辑，仅自定义资源）
    showSheet: false,
    sheetTitle: '添加资源',
    isEdit: false,
    editId: '',
    nameInput: '',
    // 归属：阶段 + 分组两行原生 picker（联动 —— 不同阶段的分组集合有差异）
    stageOptions: [],   // [{ id, name }]
    stageNames: [],     // 阶段 picker 的 range
    stageIndex: 0,
    groupOptions: [],   // 当前阶段的 [{ key, label }]
    groupNames: [],     // 分组 picker 的 range
    groupIndex: 0,
    pickStageId: '',
    pickGroupKey: '',
    // 阶段索引条（右侧浮层）：[{ stageId, char, tip }]，sections < 3 时视图层不渲染
    idxBar: [],
    idxActive: -1,   // 触摸命中项下标（-1 = 未触摸）
    idxTip: '',      // 按住气泡短名（空 = 不显示）
    idxTipTop: 0     // 气泡垂直位置（px，跟随命中项）
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.refresh()
    // 进入 / 返回本页不产生滚动事件，高亮跟随不会被触发，主动同步一次
    this._syncIdxSoon()
  },

  // 组装展示数据：全量资源树（官方 + 自定义）。隐藏项不抽离——管理页 = 全量 + 状态：
  // 隐藏行原位淡化、左滑「恢复」就地还原。组内顺序走 resources.js 单点（顺序覆盖已应用）
  refresh() {
    const hidden = resourcePrefs.getHiddenMap()
    const sections = []
    let total = 0

    ;(checkin.getCurrentRoute().stages || []).forEach(stage => {
      const full = resources.getStageResources(stage.stage_id, { includeHidden: true })
      const visible = resources.getStageGroupKeys(stage.stage_id)
      const keys = visible.slice()

      // 并上「有自定义资源但不在官方分组集合里」的历史分组（变体 key）：
      // resources.js 会跳过这类分组，管理页不能失管，合成进 full 一起渲染
      const byGroup = customResources.getByStage(stage.stage_id) || {}
      Object.keys(byGroup).forEach(k => {
        const l = byGroup[k]
        if (Array.isArray(l) && l.length && !full[k]) {
          full[k] = l.map(it => ({ id: it.id, name: it.name, custom: true }))
          keys.push(k)
        }
      })

      const groups = []
      keys.forEach(key => {
        const list = Array.isArray(full[key]) ? full[key] : []
        if (!list.length) return

        const groupsBefore = groups.length
        const sectionsBefore = sections.length
        let hidCount = 0
        const items = list.map((it, ii) => {
          const hid = !!hidden[it.id]
          if (hid) hidCount++
          return {
            id: it.id,
            name: it.name,
            custom: !!it.custom,
            // 隐藏行：原位淡化展示，左滑首钮为「恢复」
            _hid: hid,
            // 左滑宽度：自定义 = 恢复/隐藏 + 删除 两钮；官方 = 单钮（同 150/钮口径）
            _w: it.custom ? HIDE_W + DEL_W : HIDE_W,
            // 供左滑 setData 精确定位到该行（每次 refresh 重建）
            _path: `sections[${sectionsBefore}].groups[${groupsBefore}].items[${ii}]`,
            _dx: 0,
            _anim: true
          }
        })
        groups.push({
          uid: `${stage.stage_id}|${key}`,
          key,
          label: resources.getGroupLabel(key),
          hidden: visible.indexOf(key) < 0,
          hidCount,
          items
        })
        total += list.length
      })
      if (groups.length) {
        sections.push({ stageId: stage.stage_id, stageName: stage.stage_name, groups })
      }
    })

    // 折叠状态：保留用户已展开 / 收起的分组，新增的分组默认展开
    const expandedGroups = { ...this.data.expandedGroups }
    sections.forEach(sec => {
      sec.groups.forEach(grp => {
        if (expandedGroups[grp.uid] === undefined) expandedGroups[grp.uid] = true
      })
    })

    // 索引条数据与 sections 同源同序（有资源的阶段才出现索引项）
    const idxBar = sections.map(sec => ({
      stageId: sec.stageId,
      char: IDX_CHAR[sec.stageId] || (sec.stageName || '').charAt(0),
      tip: IDX_TIP[sec.stageId] || sec.stageName
    }))

    this._secTops = null // 页面结构可能变化，滚动联动位置缓存失效
    this.setData({
      sections,
      totalCount: total,
      isEmpty: !sections.length,
      expandedGroups,
      idxBar,
      _idxHide: false // 重建后所有行 _dx 归零，滑开态不复存在（如删除了滑开行），索引条恢复
    })
    // 隐藏 / 恢复 / 删除等触发的 refresh 不经 onShow 也无滚动事件，高亮若不
    // 主动对齐会停在旧值（当前段被删空时甚至越界），直到下次滚动才纠正
    this._syncIdxSoon()
  },

  // ===== 归属：阶段 + 分组两行原生 picker（联动） =====
  // 打开弹窗时初始化归属：阶段定位到目标阶段，分组定位到目标分组（找不到则取第一个）
  _initLocation(stageId, groupKey) {
    const stageOptions = (checkin.getCurrentRoute().stages || []).map(s => ({ id: s.stage_id, name: s.stage_name }))
    let si = stageOptions.findIndex(s => s.id === stageId)
    if (si < 0) si = 0
    const id = stageOptions[si] ? stageOptions[si].id : ''
    this.setData({
      stageOptions,
      stageNames: stageOptions.map(s => s.name),
      stageIndex: si,
      pickStageId: id
    })
    this._loadGroupOptions(id, groupKey)
  },

  // 载入某阶段的分组选项；keepGroupKey 传空即取第一个分组。
  // 目标分组不在该阶段的列表里时（典型：熏听开关被关掉）补一行占位 ——
  // 否则会静默落到第一个分组，一保存就把资源挪到了别的分组
  _loadGroupOptions(stageId, keepGroupKey) {
    const keys = stageId ? resources.getStageGroupKeys(stageId) : []
    const groupOptions = keys.map(k => ({ key: k, label: resources.getGroupLabel(k) }))
    let gi = 0
    if (keepGroupKey) {
      const i = groupOptions.findIndex(g => g.key === keepGroupKey)
      if (i >= 0) {
        gi = i
      } else {
        groupOptions.unshift({ key: keepGroupKey, label: resources.getGroupLabel(keepGroupKey) })
        gi = 0
      }
    }
    this.setData({
      groupOptions,
      groupNames: groupOptions.map(g => g.label),
      groupIndex: gi,
      pickGroupKey: groupOptions[gi] ? groupOptions[gi].key : ''
    })
  },

  // 阶段 picker：切阶段要重建分组列表（不同阶段的分组集合有差异），分组下标归零
  onStageChange(e) {
    const si = Number(e.detail.value)
    const st = (this.data.stageOptions || [])[si]
    if (!st) return
    this.setData({ stageIndex: si, pickStageId: st.id })
    this._loadGroupOptions(st.id, '')
  },

  // 分组 picker
  onGroupChange(e) {
    const gi = Number(e.detail.value)
    const g = (this.data.groupOptions || [])[gi]
    if (!g) return
    this.setData({ groupIndex: gi, pickGroupKey: g.key })
  },

  // 分组展开 / 折叠（与阶段详情页同交互）
  onToggleGroup(e) {
    const uid = e.currentTarget.dataset.uid
    if (!uid) return
    const expandedGroups = { ...this.data.expandedGroups }
    expandedGroups[uid] = !expandedGroups[uid]
    this._secTops = null // 页高变化，滚动联动位置缓存失效
    this.setData({ expandedGroups })
    this._syncIdxSoon() // 展开 / 收起不产生滚动事件，主动对齐当前段
  },

  // ===== 弹窗 =====
  openAdd() {
    const cur = checkin.getCurrentStage()
    const stageId = (cur && resources.getStageById(cur.id))
      ? cur.id
      : (((checkin.getCurrentRoute().stages || [])[0] || {}).stage_id || '')

    this.setData({
      showSheet: true,
      sheetTitle: '添加资源',
      isEdit: false,
      editId: '',
      nameInput: ''
    })
    // 默认归属：当前阶段 + 该阶段第一个分组（keepGroupKey 传空即落到第 0 项）
    this._initLocation(stageId, '')
  },

  openEdit(e) {
    // 官方资源只读：无编辑入口（有左滑隐藏）
    if (!e.currentTarget.dataset.custom) return
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
      nameInput: found.resource.name
    })
    // 回填归属：阶段与分组各自定位到原值
    this._initLocation(found.stageId, found.groupKey)
  },

  closeSheet() {
    this.setData({ showSheet: false })
  },

  onNameInput(e) {
    this.setData({ nameInput: e.detail.value })
  },

  // 失焦截断：maxlength 会把拼音组合期的字母计入长度导致打不完拼音，
  // 故放开 maxlength，blur 时按「字」截断（提交时 _validateName 再兜底）
  onNameBlur(e) {
    const chars = Array.from(String(e.detail.value || '').trim())
    if (chars.length > customResources.MAX_NAME_LEN) {
      this.setData({ nameInput: chars.slice(0, customResources.MAX_NAME_LEN).join('') })
      wx.showToast({ title: `名称不超过 ${customResources.MAX_NAME_LEN} 字`, icon: 'none' })
    }
  },

  // 提交新增 / 保存编辑
  submitSheet() {
    // 防重复提交：连点会重复调用 add（第二次命中同名校验，用户看到无谓报错）
    if (this._submitting) return
    const { isEdit, editId, nameInput, pickStageId, pickGroupKey } = this.data
    if (!pickStageId || !pickGroupKey) {
      wx.showToast({ title: '请选择归属', icon: 'none' })
      return
    }

    this._submitting = true
    const payload = { stageId: pickStageId, groupKey: pickGroupKey, name: nameInput }
    const res = isEdit
      ? customResources.update(editId, payload)
      : customResources.add(payload)
    this._submitting = false

    if (!res || !res.ok) {
      wx.showToast({ title: (res && res.error) || '操作失败', icon: 'none' })
      return
    }

    this.setData({ showSheet: false })
    this.refresh()
    wx.showToast({ title: isEdit ? '已保存' : '已添加', icon: 'success' })
  },

  // ===== 左滑操作（隐藏 / 删除，与打卡记录页同一套手势） =====
  // 行路径形如 sections[0].groups[1].items[2]，用于 setData 定位
  _findItem(path) {
    const m = /^sections\[(\d+)\]\.groups\[(\d+)\]\.items\[(\d+)\]$/.exec(path || '')
    if (!m) return null
    const sec = this.data.sections[Number(m[1])]
    const grp = sec && sec.groups[Number(m[2])]
    const it = grp && grp.items[Number(m[3])]
    return it || null
  },

  _snapDx(dx, w) {
    return dx <= -w / 2 ? -w : 0
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
    const cur = this._findItem(path)
    const w = cur ? cur._w : HIDE_W
    // px → rpx（约 2 倍，与打卡记录页同口径）
    let newDx = (t.clientX - this.data._touchStartX) * 2
    if (newDx < -(w + 20)) newDx = -(w + 20)
    if (newDx > 10) newDx = 10
    if (Math.abs(newDx) > 10) {
      this._moved = true
      // 横向位移主导才隐索引：竖滑滚动 dx 常超阈值，宽判定会让索引频繁闪隐
      if (!this.data._idxHide &&
          Math.abs(t.clientX - this.data._touchStartX) > Math.abs(t.clientY - this.data._touchStartY)) {
        this.setData({ _idxHide: true })
      }
    }

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
    const w = cur ? cur._w : HIDE_W
    const target = this._snapDx(cur ? (cur._dx || 0) : 0, w)
    this.setData({
      [path + '._dx']: target,
      [path + '._anim']: true,
      _curSwipePath: '',
      _idxHide: target !== 0 // 吸附为滑开保持则索引继续隐藏，合上即渐显
    })
  },

  // 左滑露出的隐藏按钮（黑名单：不删数据，仅从打卡视图摘除；左滑「恢复」就地还原）
  onHideItem(e) {
    const id = e.currentTarget.dataset.id
    const res = resourcePrefs.hide(id)
    if (!res || !res.ok) {
      wx.showToast({ title: (res && res.error) || '操作失败', icon: 'none' })
      return
    }
    this.refresh()
    wx.showToast({ title: '已隐藏，左滑可恢复', icon: 'none' })
  },

  // 左滑露出的恢复按钮（隐藏行首钮）：就地还原，非破坏性不二次确认（再藏回去也容易）
  onShowItem(e) {
    const id = e.currentTarget.dataset.id
    const res = resourcePrefs.unhide(id)
    if (!res || !res.ok) {
      wx.showToast({ title: '操作失败', icon: 'none' })
      return
    }
    this.refresh()
    wx.showToast({ title: '已恢复', icon: 'success' })
  },

  // 左滑露出的删除按钮（仅自定义资源；二次确认；历史记录与统计保留）
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
        // 顺带清掉可能存在的隐藏标记，避免留下永不渲染的死键
        resourcePrefs.unhide(id)
        // 备注预填随资源消亡：精确清该资源 id 的默认备注键（per-child id 天然隔离，不波及他人）
        checkin.removeDefaultRemark(found.stageId, found.groupKey, id)
        this.refresh()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  // ===== 分组内拖拽排序（独立页面 pages/resourceSort） =====
  // 拖拽逻辑整体在排序页；这里只负责带参跳转。
  // 顺序落盘即生效，返回时 onShow 的 refresh() 会按新顺序重建
  openSort(e) {
    const { stage, key, label } = e.currentTarget.dataset
    wx.navigateTo({
      url: `../resourceSort/resourceSort?stageId=${encodeURIComponent(stage || '')}&groupKey=${encodeURIComponent(key || '')}&label=${encodeURIComponent(label || '')}`
    })
  },

  // ===== 阶段索引条（右侧浮层；TDesign Indexes 同款交互、自研实现） =====
  // 点击跳转不缓存 offsetTop——折叠 / 展开随时改变页面高度，点按 / 滑动时实时实测
  // 目标节点再 pageScrollTo，永不失准；滚动联动高亮用惰性缓存（滚动本身不改布局，
  // 页高只在 refresh / 展开收起时变化，两处已置 _secTops 失效）
  onPageScroll(e) {
    // _jumping：索引跳转动画期间挂起联动——动画会扫过中间各段，不挂起则沿途索引闪亮
    if (this._idxTouching || this._jumping || !this.data.idxBar.length) return
    if (this._secTops) { this._syncIdxActive(e.scrollTop); return }
    this._syncIdxSoon()
  },

  // 主动 / 惰性重建位置缓存并同步高亮（无滚动事件的场景也要对齐：进入、返回、
  // 展开收起后）。nextTick 等 refresh 的 setData 渲染完成再实测，否则拿到旧布局；
  // 测量中不重入
  _syncIdxSoon() {
    if (!this.data.idxBar.length || this._secMeasuring) return
    this._secMeasuring = true
    wx.nextTick(() => {
      const q = wx.createSelectorQuery()
      q.selectAll('.sec-anchor').boundingClientRect()
      q.selectViewport().scrollOffset()
      q.exec(res => {
        this._secMeasuring = false
        const rects = res && res[0]
        const vp = res && res[1]
        if (!rects || rects.length !== this.data.idxBar.length || !vp) return
        this._secTops = rects.map(r => r.top + vp.scrollTop)
        this._syncIdxActive(vp.scrollTop)
      })
    })
  },

  // 文档坐标判定当前段：取最后一个标题 docTop ≤ 视口顶 + 13px 的段（判定线与点击
  // 定位的 12px 落点对齐，点完跳转高亮即停在所点字母）；滚到顶强制亮首段——首段
  // 标题上方是页头留白，其 docTop 大于判定线、物理上滚不过线（scrollTop 已到 0），
  // 「到顶 = 正处在第一阶段」才符合直觉，点索引「1」跳转后高亮也稳稳停住。
  // 以 idxActive 去重，高频滚动回调里只有几次数组比较，命中不变零 setData，无需节流
  _syncIdxActive(scrollTop) {
    const tops = this._secTops
    if (!tops || !tops.length) return
    let i = -1
    if (scrollTop <= 1) {
      i = 0
    } else {
      const line = scrollTop + 13
      for (let k = tops.length - 1; k >= 0; k--) {
        if (tops[k] <= line) { i = k; break }
      }
    }
    if (i === this.data.idxActive) return
    this.setData({ idxActive: i })
  },

  onIdxTouchStart(e) {
    this._idxTouching = true
    // 实测每个索引项的位置：命中区间与气泡锚点都用真实 rect，对条内 padding /
    // 项高不均等样式调整天然免疫（此前按条高均分估算，padding 摊进每一份，
    // 两端项的中心偏差 3-4px，气泡与命中项错位）
    wx.createSelectorQuery().selectAll('.idx-bar .idx-item').boundingClientRect(rects => {
      this._idxRects = rects && rects.length ? rects : null
      // 轻点场景：end 可能已先跑完，这里仍要命中一次（点一下即跳转的反馈）
      if (this._idxRects) this._idxHit(e.touches[0].clientY)
    }).exec()
  },

  onIdxTouchMove(e) {
    if (!this._idxTouching) return
    this._idxHit(e.touches[0].clientY)
  },

  onIdxTouchEnd() {
    this._idxTouching = false
    this._idxRects = null
    // 延迟收尾：气泡消失；高亮不用 -1 熄灭，而是交还滚动联动——按当前位置重算
    // （点「1」跳到顶后仍亮「1」，与到顶亮首段的语义闭环）
    clearTimeout(this._idxTipTimer)
    this._idxTipTimer = setTimeout(() => {
      this.setData({ idxTip: '' })
      this._syncIdxSoon()
    }, 250)
  },

  // 按真实项矩形找命中项（[top, bottom) 区间，上下越界 clamp 到首/末项）；
  // 命中变化才 setData（高频 move 不掉帧），气泡锚在命中项垂直中心——严格同轴
  _idxHit(y) {
    const rects = this._idxRects
    const bar = this.data.idxBar
    if (!rects || rects.length !== bar.length) return
    let i = rects.length - 1
    for (let k = 0; k < rects.length; k++) {
      if (y < rects[k].bottom) { i = k; break }
    }
    if (i === this.data.idxActive) return
    const item = bar[i]
    this.setData({
      idxActive: i,
      idxTip: item.tip,
      idxTipTop: rects[i].top + rects[i].height / 2
    })
    this._scrollToStage(item.stageId)
  },

  // 实时查询目标标题位置 + 当前滚动位，滚到「标题贴视口顶」（留 2px 防取整裁切）。
  // 不留 12px 呼吸位——那会露出文档里标题上方的内容（上一阶段行尾 + 间距），
  // 视觉上是一条白色空气；贴顶后上方内容全部滚出视口。
  // 跳转全程挂起滚动联动（_jumping）：pageScrollTo 动画会扫过中间各段，联动若
  // 不挂起，沿途索引依次闪亮（起点、途经段都亮过才算完）。落位后 _jumpRelease
  // 交还联动并按最终位置对齐高亮。
  // 落位校验补滚：pageScrollTo 动画偶发少滚 / 被系统钳制，实测标题未贴顶（偏差
  // > 4px）时动画结束后无动画直落一次。只补一轮（_retry）防死循环；以
  // _lastJumpStage 判新——连续滑动时旧跳转的校验不得拉扯新跳转。
  // 动画中途重查的 rect.top / scrollTop 均为实时值，连续调用计算天然收敛
  _scrollToStage(stageId, _retry) {
    if (!stageId) return
    this._lastJumpStage = stageId
    if (!_retry) this._jumping = true
    const q = wx.createSelectorQuery()
    q.select(`#sec-${stageId}`).boundingClientRect()
    q.selectViewport().scrollOffset()
    q.exec(res => {
      // 已被更新的跳转取代：本次滚动不执行（判新不能只靠 260ms 校验——快速连点时
      // 旧跳转的查询回调晚归，仍会 pageScrollTo 一次旧目标，多一次滚动抖动）
      if (this._lastJumpStage !== stageId) return
      const rect = res && res[0]
      const vp = res && res[1]
      // 查询失败也必须交还联动，否则 _jumping 悬挂、滚动高亮永久失灵
      if (!rect || !vp) { this._jumpRelease(); return }
      wx.pageScrollTo({
        scrollTop: Math.max(0, vp.scrollTop + rect.top - 2),
        duration: _retry ? 0 : 200
      })
      if (_retry) {
        // 瞬移刚发起尚未生效，稍候其落定再交还联动，交还时的对齐测量才准
        setTimeout(() => this._jumpRelease(), 50)
        return
      }
      setTimeout(() => {
        // 目标已被新跳转取代：本次校验作废——挂起与收尾都由新跳转接管
        if (this._lastJumpStage !== stageId) return
        const q2 = wx.createSelectorQuery()
        q2.select(`#sec-${stageId}`).boundingClientRect()
        q2.selectViewport().scrollOffset()
        q2.exec(r2 => {
          const rc = r2 && r2[0]
          const v2 = r2 && r2[1]
          if (!rc || !v2) { this._jumpRelease(); return }
          // 实际停在「标题距顶 2px」±4px 以外：补滚一次（无动画，瞬间贴合）
          if (Math.abs(rc.top - 2) > 4) {
            this._scrollToStage(stageId, true)
          } else {
            this._jumpRelease()
          }
        })
      }, 260)
    })
  },

  // 跳转收尾：解除联动挂起，并按最终落位主动对齐一次高亮（终点在段首、判定线
  // 内，所点字母稳稳亮住）
  _jumpRelease() {
    this._jumping = false
    this._syncIdxSoon()
  },

})
