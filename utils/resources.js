// 统一资源视图：官方资源（data.js）+ 自定义资源（customResources.js）合并
// 官方资源 id 形如 o_r1_mpb_01，自定义资源 id 形如 u_lz9k3a7x2
//
// 依赖方向：data.js ← checkin.js ← customResources.js ← resources.js

const { routeData, resourceLabels } = require('./data.js')
const customResources = require('./customResources.js')

// 分组顺序（与阶段页展示顺序一致，8 类全部可打卡）
const GROUP_ORDER = [
  'main_picture_books',   // 主线绘本
  'main_graded_readers',  // 主线分级
  'main_animations',      // 主线动画
  'sub_graded_readers',   // 辅线分级
  'sub_animations',       // 辅线动画
  'fun_extensions',       // 趣味拓展
  'science_extensions',   // 科普拓展
  'fusion_apps'           // 融合APP
]

function getStageById(stageId) {
  return (routeData.stages || []).find(s => s.stage_id === stageId) || null
}

function getStageIndex(stageId) {
  return (routeData.stages || []).findIndex(s => s.stage_id === stageId)
}

// 该阶段官方数据里实际存在的分组（按 GROUP_ORDER 顺序）
function getStageGroupKeys(stageId) {
  const stage = getStageById(stageId)
  if (!stage) return []
  const res = stage.resources || {}
  return GROUP_ORDER.filter(k => Array.isArray(res[k]))
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

  // 自定义资源若其分组在该阶段官方数据里不存在，直接跳过不渲染
  const custom = customResources.getByStage(stageId) || {}
  for (const groupKey in custom) {
    if (!out[groupKey]) continue
    const list = custom[groupKey]
    if (!Array.isArray(list)) continue
    list.forEach(it => {
      if (!it || !it.id || !it.name) return
      out[groupKey].push({ id: it.id, name: it.name, custom: true })
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

// 老数据兼容：按名称反查 id（找不到返回 ''）
function findIdByName(stageId, groupKey, name) {
  const map = getStageResources(stageId)
  const list = map[groupKey]
  if (!Array.isArray(list)) return ''
  const hit = list.find(it => it.name === name)
  return hit ? hit.id : ''
}

// 扁平列表（带分组信息）
function getAllResources(stageId) {
  const map = getStageResources(stageId)
  const out = []
  getStageGroupKeys(stageId).forEach(groupKey => {
    (map[groupKey] || []).forEach(it => {
      out.push({
        id: it.id,
        name: it.name,
        custom: !!it.custom,
        groupKey,
        groupLabel: getGroupLabel(groupKey)
      })
    })
  })
  return out
}

module.exports = {
  GROUP_ORDER,
  getStageById,
  getStageIndex,
  getStageGroupKeys,
  getGroupLabel,
  getStageResources,
  getStageGroups,
  getResource,
  getResourceName,
  findIdByName,
  getAllResources
}
