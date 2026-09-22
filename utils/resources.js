// 统一资源视图：官方资源（data.js）+ 自定义资源（customResources.js）合并
// 官方资源 id 形如 o_r1_mpb_01，自定义资源 id 形如 u_lz9k3a7x2
//
// 依赖方向：data.js ← checkin.js ← customResources.js ← resources.js

const { ROUTES, resourceLabels, LISTENING_GROUP_KEY } = require('./data.js')
const { GROUP_KEY_ALIAS } = require('./bigloop_route.js')
const customResources = require('./customResources.js')
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

// 阶段资源清单：官方在前、自定义在后
// @returns {Object} { [groupKey]: [{ id, name, custom }] }
function getStageResources(stageId) {
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
  return out
}

// 阶段页渲染用
// @returns {Array} [{ key, label, items: [{ id, name, custom }], clickable }]
function getStageGroups(stageId) {
  const map = getStageResources(stageId)
  return getStageGroupKeys(stageId).map(key => ({
    key,
    label: getGroupLabel(key),
    items: map[key] || [],
    clickable: true
  }))
}

function getResource(stageId, groupKey, resourceId) {
  const map = getStageResources(stageId)
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
  getStageResources,
  getStageGroups,
  getResource,
  getResourceName
}
