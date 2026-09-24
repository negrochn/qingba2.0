// 孩子管理：孩子列表 CRUD + 当前孩子（activeChildId）
// 依赖方向：本文件不依赖其它 utils；checkin.js / customResources.js 反向依赖本文件
//
// child = { id, name, color, createdAt }
//   id     'ch_<ts36>_<rand6>'，唯一且永不变更，作为 per-child 存储键段
//   name   展示名，trim 后 1~8 字，允许重复（删除确认按名字输入）
//   color  头像色板索引：green / blue / orange / purple / pink

const CHILDREN_KEY = 'qingba_children'           // child 数组，恒 ≥1 项
const ACTIVE_CHILD_KEY = 'qingba_active_child_id'
const MAX_CHILDREN = 5                            // 软上限（定案 2026-09-23）
const MAX_NAME_LEN = 8                            // 昵称宽度上限：汉字计 1、英文字母计 0.5（= 最多 16 个字母）
const DEFAULT_NAME = '宝宝'
// 头像色板：按添加顺序循环取色；迁移主孩子固定 green
const AVATAR_COLORS = ['green', 'blue', 'orange', 'purple', 'pink']

function _readList() {
  try {
    const v = wx.getStorageSync(CHILDREN_KEY)
    if (Array.isArray(v) && v.length > 0) return v.filter(c => c && c.id)
  } catch (e) {}
  return []
}

function _saveList(list) {
  try {
    wx.setStorageSync(CHILDREN_KEY, list || [])
    return true
  } catch (e) {
    return false
  }
}

function genChildId() {
  return 'ch_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

// app.js onLaunch 调用：保证孩子列表与 activeChildId 恒有效
// 无孩子列表时创建主孩子（默认名「宝宝」，可在孩子管理页改名）
function ensureInit() {
  let list = _readList()
  if (list.length === 0) {
    list = [{ id: genChildId(), name: DEFAULT_NAME, color: AVATAR_COLORS[0], createdAt: Date.now() }]
    _saveList(list)
  }
  const active = getActiveChildId()
  if (!active || !list.some(c => c.id === active)) {
    try { wx.setStorageSync(ACTIVE_CHILD_KEY, list[0].id) } catch (e) {}
  }
  return list
}

function getChildren() {
  return _readList()
}

function getActiveChildId() {
  try {
    return wx.getStorageSync(ACTIVE_CHILD_KEY) || ''
  } catch (e) {
    return ''
  }
}

// 主孩子（children[0]）：legacy 单孩数据兜底迁移的目标（§3.3，仅主孩子兜底防串数据）
function getPrimaryChildId() {
  const list = _readList()
  return list.length ? list[0].id : ''
}

function getActiveChild() {
  const list = _readList()
  const id = getActiveChildId()
  return list.find(c => c.id === id) || list[0] || null
}

// 所有多孩 UI 的显隐开关（首页切换器 / 路线页孩子 cell / …）
function isMultiChild() {
  return _readList().length > 1
}

// 昵称显示宽度：按码点遍历，>0xFF（汉字/全角/emoji）计 1，其余（字母/数字/半角符号）计 0.5
// —— 纯汉字口径会把 Christopher 这类常见英文名挡在门外，混排（Emma小宝 = 4）也公平
function nameWidth(str) {
  let w = 0
  for (const ch of String(str || '')) {
    w += ch.codePointAt(0) > 0xff ? 1 : 0.5
  }
  return w
}

// 按宽度截断昵称（失焦时用；不超限则原样返回）
function clipName(str) {
  let w = 0
  let out = ''
  for (const ch of String(str || '')) {
    w += ch.codePointAt(0) > 0xff ? 1 : 0.5
    if (w > MAX_NAME_LEN) break
    out += ch
  }
  return out
}

function _validateName(nm) {
  if (!nm) return '请输入昵称'
  if (nameWidth(nm) > MAX_NAME_LEN) return '昵称最多8个汉字或16个字母'
  return ''
}

// 添加孩子：创建后自动切换为当前孩子（P1 添加流程约定）
function addChild(name) {
  const nm = String(name || '').trim()
  const err = _validateName(nm)
  if (err) return { ok: false, error: err }
  const list = _readList()
  if (list.length >= MAX_CHILDREN) {
    return { ok: false, error: `最多添加 ${MAX_CHILDREN} 个孩子` }
  }
  const child = {
    id: genChildId(),
    name: nm,
    color: AVATAR_COLORS[list.length % AVATAR_COLORS.length],
    createdAt: Date.now()
  }
  list.push(child)
  if (!_saveList(list)) return { ok: false, error: '保存失败' }
  try { wx.setStorageSync(ACTIVE_CHILD_KEY, child.id) } catch (e) {}
  return { ok: true, child }
}

function renameChild(id, name) {
  const nm = String(name || '').trim()
  const err = _validateName(nm)
  if (err) return { ok: false, error: err }
  const list = _readList()
  const hit = list.find(c => c.id === id)
  if (!hit) return { ok: false, error: '孩子不存在' }
  if (hit.name === nm) return { ok: true }
  hit.name = nm
  if (!_saveList(list)) return { ok: false, error: '保存失败' }
  return { ok: true }
}

// 删除孩子：级联清除其全部 per-child 数据（打卡分片/读次数/资源/进度/目标等）
// 删的是当前孩子时 activeChildId 自动回退到剩余列表第一个；唯一孩子禁止删除
function removeChild(id) {
  const list = _readList()
  const idx = list.findIndex(c => c.id === id)
  if (idx < 0) return { ok: false, error: '孩子不存在' }
  if (list.length <= 1) return { ok: false, error: '至少保留一个孩子' }

  // 先级联清数据再改列表：清数据失败则中止，避免留下「无主」数据键
  // 延迟 require：checkin.js 顶层依赖本文件，此处反向调用须避开模块加载环
  try {
    require('./checkin.js').removeChildData(id)
    require('./customResources.js').removeChildData(id)
  } catch (e) {
    console.error('removeChild cascade failed:', e)
    return { ok: false, error: '数据清理失败，请重试' }
  }

  list.splice(idx, 1)
  if (!_saveList(list)) return { ok: false, error: '保存失败' }

  const active = getActiveChildId()
  if (active === id || !list.some(c => c.id === active)) {
    try { wx.setStorageSync(ACTIVE_CHILD_KEY, list[0].id) } catch (e) {}
  }
  return { ok: true }
}

// 切换当前孩子：只改 activeChildId，各页面 onShow 重读 per-child 键即得新孩子视图
function switchChild(id) {
  const list = _readList()
  const hit = list.find(c => c.id === id)
  if (!hit) return { ok: false, error: '孩子不存在' }
  if (getActiveChildId() === id) return { ok: true, child: hit }
  try {
    wx.setStorageSync(ACTIVE_CHILD_KEY, id)
  } catch (e) {
    return { ok: false, error: '保存失败' }
  }
  return { ok: true, child: hit }
}

module.exports = {
  CHILDREN_KEY,
  ACTIVE_CHILD_KEY,
  MAX_CHILDREN,
  MAX_NAME_LEN,
  DEFAULT_NAME,
  AVATAR_COLORS,
  clipName,
  genChildId,
  ensureInit,
  getChildren,
  getActiveChildId,
  getPrimaryChildId,
  getActiveChild,
  isMultiChild,
  addChild,
  renameChild,
  removeChild,
  switchChild
}
