// 自定义资源：存储 + 增删改（改名 / 改归属时先迁移历史数据再落盘）
// 存储结构（按「位置」保存）：
//   { [stageId]: { [groupKey]: [ { id, name, createdAt } ] } }
// 约束：
//   - 只能挂在「该阶段官方数据里已存在的分组」下
//   - 名称 trim 后 1~20 字，禁止包含 '|'（会破坏打卡 key 结构）
//   - 同阶段同分组禁止同名；每阶段上限 MAX_PER_STAGE 个
//   - 删除资源时保留历史打卡记录（统计不丢），只从清单移除
//
// 依赖方向：data.js ← checkin.js ← customResources.js

const checkin = require('./checkin.js')
const { routeData, resourceLabels } = require('./data.js')

const STORAGE_KEY = 'qingba_custom_resources'
const MAX_NAME_LEN = 20
const MAX_PER_STAGE = 50
const FORBIDDEN_CHAR = '|'

// 'u_' + 时间戳36进制 + 随机5位
function genId() {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function _normalizeName(name) {
  if (name === undefined || name === null) return ''
  return String(name).trim()
}

function _getStage(stageId) {
  return (routeData.stages || []).find(s => s.stage_id === stageId) || null
}

// 该阶段官方数据里是否已存在该分组
function isGroupAvailable(stageId, groupKey) {
  const stage = _getStage(stageId)
  if (!stage) return false
  return Array.isArray((stage.resources || {})[groupKey])
}

function _stageName(stageId) {
  const stage = _getStage(stageId)
  return stage ? stage.stage_name : ''
}

// ===== 读 =====

function getAll() {
  try {
    const v = wx.getStorageSync(STORAGE_KEY)
    return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}
  } catch (e) {
    return {}
  }
}

function _saveAll(data) {
  try {
    wx.setStorageSync(STORAGE_KEY, data || {})
    return true
  } catch (e) {
    return false
  }
}

function getByStage(stageId) {
  const all = getAll()
  return all[stageId] || {}
}

function countByStage(stageId) {
  const byGroup = getByStage(stageId)
  let n = 0
  for (const g in byGroup) {
    if (Array.isArray(byGroup[g])) n += byGroup[g].length
  }
  return n
}

function countAll() {
  const all = getAll()
  let n = 0
  for (const stageId in all) {
    const byGroup = all[stageId] || {}
    for (const g in byGroup) {
      if (Array.isArray(byGroup[g])) n += byGroup[g].length
    }
  }
  return n
}

// @returns {{ stageId, groupKey, index, resource }|null}
function findById(id) {
  if (!id) return null
  const all = getAll()
  for (const stageId in all) {
    const byGroup = all[stageId] || {}
    for (const groupKey in byGroup) {
      const list = byGroup[groupKey]
      if (!Array.isArray(list)) continue
      const index = list.findIndex(it => it && it.id === id)
      if (index >= 0) return { stageId, groupKey, index, resource: list[index] }
    }
  }
  return null
}

// 名称校验（新增与改名共用）
function _validateName(nm) {
  if (!nm) return '请输入资源名称'
  if (nm.length > MAX_NAME_LEN) return `名称不超过 ${MAX_NAME_LEN} 字`
  if (nm.indexOf(FORBIDDEN_CHAR) >= 0) return `名称不能包含 ${FORBIDDEN_CHAR} 符号`
  return ''
}

// ===== 写 =====

// 新增自定义资源
// @returns {{ ok: boolean, resource?: Object, error?: string }}
function add(opts) {
  const o = opts || {}
  const stageId = o.stageId || ''
  const groupKey = o.groupKey || ''
  const nm = _normalizeName(o.name)

  const nameErr = _validateName(nm)
  if (nameErr) return { ok: false, error: nameErr }
  if (!isGroupAvailable(stageId, groupKey)) return { ok: false, error: '归属分组不存在' }
  if (countByStage(stageId) >= MAX_PER_STAGE) {
    return { ok: false, error: `每个阶段最多 ${MAX_PER_STAGE} 个自定义资源` }
  }

  const all = getAll()
  if (!all[stageId]) all[stageId] = {}
  if (!Array.isArray(all[stageId][groupKey])) all[stageId][groupKey] = []
  const list = all[stageId][groupKey]
  if (list.some(it => it && it.name === nm)) {
    return { ok: false, error: '该分组下已有同名资源' }
  }

  const resource = { id: genId(), name: nm, createdAt: Date.now() }
  list.push(resource)
  if (!_saveAll(all)) return { ok: false, error: '保存失败' }

  return { ok: true, resource }
}

// 修改名称 / 归属（换阶段 + 换分组）
// 顺序不可反：先迁移历史数据（记录 + 已读次数 + 默认备注），成功后再落盘
// @returns {{ ok: boolean, error?: string }}
function update(id, opts) {
  const o = opts || {}
  const stageId = o.stageId || ''
  const groupKey = o.groupKey || ''
  const nm = _normalizeName(o.name)

  const found = findById(id)
  if (!found) return { ok: false, error: '资源不存在' }

  const nameErr = _validateName(nm)
  if (nameErr) return { ok: false, error: nameErr }
  if (!isGroupAvailable(stageId, groupKey)) return { ok: false, error: '归属分组不存在' }

  const samePlace = stageId === found.stageId && groupKey === found.groupKey
  // 换阶段时校验目标阶段数量上限（同阶段内移动不计自身）
  if (!samePlace) {
    const currentCount = countByStage(stageId) - (found.stageId === stageId ? 1 : 0)
    if (currentCount >= MAX_PER_STAGE) {
      return { ok: false, error: `每个阶段最多 ${MAX_PER_STAGE} 个自定义资源` }
    }
  }

  const all = getAll()
  if (!all[stageId]) all[stageId] = {}
  if (!Array.isArray(all[stageId][groupKey])) all[stageId][groupKey] = []
  const targetList = all[stageId][groupKey]
  if (targetList.some(it => it && it.id !== id && it.name === nm)) {
    return { ok: false, error: '该分组下已有同名资源' }
  }

  // 1) 先迁移历史数据
  if (!samePlace || nm !== found.resource.name) {
    const migrated = checkin.migrateResourceRecords({
      resourceId: id,
      resourceName: found.resource.name,
      fromStageId: found.stageId,
      fromGroupKey: found.groupKey,
      toStageId: stageId,
      toGroupKey: groupKey,
      toStageName: _stageName(stageId),
      toGroupLabel: resourceLabels[groupKey] || groupKey,
      toResourceName: nm
    })
    if (!migrated || !migrated.ok) {
      return { ok: false, error: '历史数据迁移失败，请重试' }
    }
  }

  // 2) 迁移成功后再落盘
  const fromList = all[found.stageId][found.groupKey]
  const idx = Array.isArray(fromList) ? fromList.findIndex(it => it && it.id === id) : -1
  if (idx >= 0) fromList.splice(idx, 1)
  targetList.push({ id, name: nm, createdAt: found.resource.createdAt || Date.now() })

  if (!_saveAll(all)) return { ok: false, error: '保存失败' }
  return { ok: true }
}

// 删除资源（历史记录/统计保留，仅移出清单）
// @returns {{ ok: boolean, error?: string }}
function remove(id) {
  const found = findById(id)
  if (!found) return { ok: false, error: '资源不存在' }

  const all = getAll()
  const list = all[found.stageId] && all[found.stageId][found.groupKey]
  if (Array.isArray(list)) {
    const idx = list.findIndex(it => it && it.id === id)
    if (idx >= 0) list.splice(idx, 1)
    if (list.length === 0) delete all[found.stageId][found.groupKey]
  }
  if (all[found.stageId] && Object.keys(all[found.stageId]).length === 0) {
    delete all[found.stageId]
  }
  if (!_saveAll(all)) return { ok: false, error: '保存失败' }
  return { ok: true }
}

function clearByStage(stageId) {
  const all = getAll()
  if (all[stageId]) {
    delete all[stageId]
    _saveAll(all)
  }
}

function clearAll() {
  try {
    wx.removeStorageSync(STORAGE_KEY)
  } catch (e) {}
}

// 覆盖式导入
function replaceAll(data) {
  const src = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {}
  return _saveAll(src)
}

// 合并式导入：按「阶段 + 分组 + 名称」去重，忽略非法分组与超限数据
// @returns {{ added: number }}
function mergeAll(data) {
  const src = (data && typeof data === 'object' && !Array.isArray(data)) ? data : {}
  const all = getAll()
  let added = 0

  for (const stageId in src) {
    const byGroup = src[stageId] || {}
    for (const groupKey in byGroup) {
      if (!isGroupAvailable(stageId, groupKey)) continue
      const incoming = byGroup[groupKey]
      if (!Array.isArray(incoming)) continue

      if (!all[stageId]) all[stageId] = {}
      if (!Array.isArray(all[stageId][groupKey])) all[stageId][groupKey] = []
      const list = all[stageId][groupKey]

      incoming.forEach(it => {
        if (!it || !it.name) return
        const nm = _normalizeName(it.name)
        if (!nm || nm.length > MAX_NAME_LEN || nm.indexOf(FORBIDDEN_CHAR) >= 0) return
        if (list.some(x => x && x.name === nm)) return
        if (countByStage(stageId) >= MAX_PER_STAGE) return
        list.push({ id: it.id || genId(), name: nm, createdAt: it.createdAt || Date.now() })
        added++
      })

      if (list.length === 0) delete all[stageId][groupKey]
    }
  }

  _saveAll(all)
  return { added }
}

module.exports = {
  STORAGE_KEY,
  MAX_NAME_LEN,
  MAX_PER_STAGE,
  genId,
  getAll,
  getByStage,
  findById,
  countByStage,
  countAll,
  isGroupAvailable,
  add,
  update,
  remove,
  clearByStage,
  clearAll,
  replaceAll,
  mergeAll
}
