// 统一资源视图：官方资源（data.js）+ 自定义资源（customResources.js）合并
// 官方资源 id 形如 o_r1_mpb_01，自定义资源 id 形如 u_lz9k3a7x2
//
// 依赖方向：data.js ← checkin.js ← customResources.js ← resourcePrefs.js ← resources.js

const { ROUTES, resourceLabels, LISTENING_GROUP_KEY } = require('./data.js')
const { GROUP_KEY_ALIAS } = require('./bigloop_route.js')
const customResources = require('./customResources.js')
const resourcePrefs = require('./resourcePrefs.js')
const checkin = require('./checkin.js')

// 分组顺序（与阶段页展示顺序一致）
// 「熏听」仅作占位（官方无素材，靠自定义资源填充），且受设置页开关控制是否可见
const GROUP_ORDER = [
  'main_picture_books',   // 主线绘本
  'main_graded_readers',  // 主线分级
  'main_animations',      // 主线动画
  'sub_graded_readers',   // 辅线分级
  'sub_animations',       // 辅线动画
  'fun_extensions',       // 趣味拓展
  'science_extensions',   // 科普拓展
  'fusion_apps',          // 融合APP
  'listening_audio'       // 熏听
]

// 分组识别色（与阶段详情页 / 我的资源页的 --dot-* 变量同源同值）：
// CSS 变量 JS 读不到，图表 / 自绘面板要用色时走这张表；非标准 key（大循环官方中文分组）兜底灰
const GROUP_COLORS = {
  main_picture_books: '#e74c3c',   // 主线绘本
  main_graded_readers: '#e67e22',  // 主线分级
  main_animations: '#f1c40f',      // 主线动画
  sub_graded_readers: '#2ecc71',   // 辅线分级
  sub_animations: '#1abc9c',       // 辅线动画
  fun_extensions: '#3498db',       // 趣味拓展
  science_extensions: '#9b59b6',   // 科普拓展
  fusion_apps: '#8e44ad',          // 融合APP
  listening_audio: '#607d8b'       // 熏听
}
const GROUP_COLOR_DEFAULT = '#888888'

function getGroupColor(groupKey) {
  return GROUP_COLORS[groupKey] || GROUP_COLOR_DEFAULT
}

// 全路线查找（两路线 stage_id 命名空间隔离，不会互撞）；
// 入参只带 stageId，按当前路线优先语义等价于精确命中
function getStageById(stageId) {
  if (!stageId) return null
  const rids = Object.keys(ROUTES)
  for (let i = 0; i < rids.length; i++) {
    const hit = (ROUTES[rids[i]].stages || []).find(s => s.stage_id === stageId)
    if (hit) return hit
  }
  return null
}

// 熏听分组是否可见（设置页开关；读不到时按关闭处理）
// 收敛在此一处判断，阶段页 / 我的资源 / 资源归属 / 资源选择弹层全部自动一致
function isListeningVisible() {
  try {
    return !!checkin.isListeningEnabled()
  } catch (e) {
    return false
  }
}

// 该阶段官方数据里实际存在的分组
// 标准英文分组按 GROUP_ORDER 排序；非标准 key（大循环的官方中文分组，如「优选分级」）
// 按数据原序殿后——不能只按 GROUP_ORDER 过滤，否则大循环分组会被整体滤掉
// 熏听开关关闭时把该分组摘掉：不展示、不可打卡、资源归属里也不可选
function getStageGroupKeys(stageId) {
  const stage = getStageById(stageId)
  if (!stage) return []
  const res = stage.resources || {}
  const present = Object.keys(res).filter(k => Array.isArray(res[k]))
  const ordered = GROUP_ORDER.filter(k => present.indexOf(k) >= 0)
  present.forEach(k => {
    if (ordered.indexOf(k) < 0) ordered.push(k)
  })
  if (isListeningVisible()) return ordered
  return ordered.filter(k => k !== LISTENING_GROUP_KEY)
}

function getGroupLabel(groupKey) {
  return resourceLabels[groupKey] || groupKey
}

// 顺序覆盖合并：快照序在前（按快照内位置），快照未覆盖的资源（官方升级新增 /
// 后加的自定义）按默认序殿后——保证新资源不丢、被删资源自动跳过
function _applyOrder(list, orderIds) {
  const pos = {}
  orderIds.forEach((id, i) => {
    if (typeof id === 'string' && id && pos[id] === undefined) pos[id] = i
  })
  const known = list.filter(it => pos[it.id] !== undefined).sort((a, b) => pos[a.id] - pos[b.id])
  const rest = list.filter(it => pos[it.id] === undefined)
  return known.concat(rest)
}

// 阶段资源清单：官方在前、自定义在后；统一在此应用「隐藏过滤 + 组内顺序覆盖」，
// 阶段页 / 补录选择弹层 / 资源名称解析等消费端全部自动一致
// @param {Object} [opts] { includeHidden: boolean } 编辑历史记录等管理场景传 true：
//   记录还挂在已隐藏资源上时，编辑页必须仍能选到它
// @returns {Object} { [groupKey]: [{ id, name, custom }] }
function getStageResources(stageId, opts) {
  const includeHidden = !!(opts && opts.includeHidden)
  const stage = getStageById(stageId)
  if (!stage) return {}

  const out = {}
  const res = stage.resources || {}
  getStageGroupKeys(stageId).forEach(k => {
    out[k] = (res[k] || []).map(it => ({ id: it.id, name: it.name, custom: false }))
  })

  // 自定义资源若其分组在该阶段官方数据里不存在，直接跳过不渲染。
  // 历史 key 归一：GROUP_KEY_ALIAS 是「中文标准名→标准 key」固定字典，历史存储里
  // 挂旧同义变体 key（如「优选分级」「入门绘本」）的素材已不在表中、不再迁移
  const custom = customResources.getByStage(stageId) || {}
  for (const groupKey in custom) {
    let gk = groupKey
    if (!out[gk]) {
      const aliased = GROUP_KEY_ALIAS[groupKey]
      if (aliased && out[aliased]) gk = aliased
    }
    if (!out[gk]) continue
    const list = custom[groupKey]
    if (!Array.isArray(list)) continue
    list.forEach(it => {
      if (!it || !it.id || !it.name) return
      out[gk].push({ id: it.id, name: it.name, custom: true })
    })
  }

  // 单点收口：隐藏过滤 + 顺序覆盖。includeHidden 时跳过过滤但仍应用顺序
  // （管理页与打卡视图所见顺序一致）
  const hidden = includeHidden ? {} : resourcePrefs.getHiddenMap()
  const orderMap = resourcePrefs.getOrderMap()[stageId] || {}
  for (const gk in out) {
    let list = out[gk]
    if (!includeHidden && list.length) list = list.filter(it => !hidden[it.id])
    const orderIds = orderMap[gk]
    if (Array.isArray(orderIds) && orderIds.length) list = _applyOrder(list, orderIds)
    out[gk] = list
  }
  return out
}

// 阶段页渲染用。分组剔除规则：
//   - 原本就空的分组（如熏听占位）保留 —— 维持既有占位行为
//   - 因资源全部被隐藏而清空的分组剔除 —— 空壳分组头是噪音
// @returns {Array} [{ key, label, items: [{ id, name, custom }], clickable }]
function getStageGroups(stageId) {
  const full = getStageResources(stageId, { includeHidden: true })
  const shown = getStageResources(stageId)
  const out = []
  getStageGroupKeys(stageId).forEach(key => {
    const items = shown[key] || []
    if (!items.length && (full[key] || []).length > 0) return
    out.push({
      key,
      label: getGroupLabel(key),
      items,
      clickable: true
    })
  })
  return out
}

function getResource(stageId, groupKey, resourceId) {
  // 名称解析不过滤隐藏资源：历史记录的名称兜底不能因隐藏而失效
  const map = getStageResources(stageId, { includeHidden: true })
  const list = map[groupKey]
  if (!Array.isArray(list)) return null
  return list.find(it => it.id === resourceId) || null
}

// 名称解析：资源已删除时返回 fallback（fallback 缺省为空串）
function getResourceName(stageId, groupKey, resourceId, fallback) {
  const r = getResource(stageId, groupKey, resourceId)
  if (r) return r.name
  return fallback === undefined ? '' : fallback
}

module.exports = {
  GROUP_ORDER,
  getStageById,
  getStageGroupKeys,
  isListeningVisible,
  getGroupLabel,
  getGroupColor,
  getStageResources,
  getStageGroups,
  getResource,
  getResourceName
}
