// 资源偏好：隐藏清单（黑名单）+ 分组内顺序覆盖（按孩子隔离）
// 设计：
//   - 官方资源是只读内置数据加不了字段，隐藏 / 顺序都以 resourceId 为键外置存储
//   - 隐藏 = 黑名单：不删数据、不碰打卡历史与统计，仅从打卡视图（阶段页 / 资源选择）摘除
//   - 顺序 = 完整快照（resourceId 数组）：首次排序时生成；官方升级新增 / 后加的
//     自定义资源不在快照里，消费端按「快照序在前、其余按默认序殿后」合并（resources.js）
// 依赖方向：children.js ← 本文件 ← resources.js（children 删孩子时经延迟 require 调
// removeChildData 级联清理，与本文件无加载环）
//
// 存储结构（键按孩子隔离，与 customResources 同一套约定）：
//   qingba_hidden_resources_<childId> : { [resourceId]: true }
//   qingba_resource_order_<childId>   : { [stageId]: { [groupKey]: [resourceId, ...] } }

const children = require('./children.js')
const storage = require('./storage.js')

const HIDDEN_KEY = 'qingba_hidden_resources'
const ORDER_KEY = 'qingba_resource_order'

function _hiddenKey() {
  return HIDDEN_KEY + '_' + (children.getActiveChildId() || '')
}

function _orderKey() {
  return ORDER_KEY + '_' + (children.getActiveChildId() || '')
}

// ===== 隐藏清单 =====

function getHiddenMap() {
  try {
    const v = storage.get(_hiddenKey())
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  } catch (e) {
    return {}
  }
}

function isHidden(resourceId) {
  return !!getHiddenMap()[resourceId]
}

// @returns {{ ok: boolean, error?: string }}
function hide(resourceId) {
  if (!resourceId) return { ok: false, error: '参数缺失' }
  const map = getHiddenMap()
  map[resourceId] = true
  try {
    storage.set(_hiddenKey(), map)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: '保存失败' }
  }
}

// @returns {{ ok: boolean }}
function unhide(resourceId) {
  if (!resourceId) return { ok: false }
  const map = getHiddenMap()
  if (!map[resourceId]) return { ok: true }
  delete map[resourceId]
  try {
    // 清空后删键，避免留下空对象键
    if (Object.keys(map).length === 0) storage.remove(_hiddenKey())
    else storage.set(_hiddenKey(), map)
    return { ok: true }
  } catch (e) {
    return { ok: false }
  }
}

// ===== 分组内顺序覆盖 =====

function getOrderMap() {
  try {
    const v = storage.get(_orderKey())
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  } catch (e) {
    return {}
  }
}

// @returns {string[]|null} 该分组的顺序快照；无覆盖时返回 null
function getGroupOrder(stageId, groupKey) {
  const all = getOrderMap()
  const byGroup = all[stageId]
  const list = byGroup ? byGroup[groupKey] : null
  return Array.isArray(list) ? list : null
}

// 整组覆盖式保存顺序快照；ids 为空视为清除该组覆盖（「恢复默认」）
// @returns {{ ok: boolean, error?: string }}
function saveGroupOrder(stageId, groupKey, ids) {
  if (!stageId || !groupKey) return { ok: false, error: '参数缺失' }
  const arr = Array.isArray(ids) ? ids.filter(id => typeof id === 'string' && id) : []
  // 去重：重复 id 会把消费端的排序合并搞乱，这里做最后一道防线
  const uniq = []
  const seen = {}
  arr.forEach(id => {
    if (!seen[id]) { seen[id] = true; uniq.push(id) }
  })

  const all = getOrderMap()
  if (!uniq.length) {
    if (all[stageId]) {
      delete all[stageId][groupKey]
      if (Object.keys(all[stageId]).length === 0) delete all[stageId]
    }
  } else {
    if (!all[stageId]) all[stageId] = {}
    all[stageId][groupKey] = uniq
  }

  try {
    if (Object.keys(all).length === 0) storage.remove(_orderKey())
    else storage.set(_orderKey(), all)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: '保存失败' }
  }
}

// ===== 级联清理 =====

// 删除某孩子的全部偏好（供 children.removeChild 延迟 require 级联调用）
function removeChildData(childId) {
  if (!childId) return
  try { storage.remove(HIDDEN_KEY + '_' + childId) } catch (e) {}
  try { storage.remove(ORDER_KEY + '_' + childId) } catch (e) {}
}

module.exports = {
  HIDDEN_KEY,
  ORDER_KEY,
  getHiddenMap,
  isHidden,
  hide,
  unhide,
  getOrderMap,
  getGroupOrder,
  saveGroupOrder,
  removeChildData
}
