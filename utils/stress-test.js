// 压力测试数据生成
// 按真实计划生成：每个阶段累计打卡约80-90小时，每日总时长15-60分钟，约12%的天数缺卡
// 日期从今天往回推算
const { routeData, resourceLabels } = require('./data.js')
const { READ_COUNT_KEY, CURRENT_STAGE_KEY, saveAll } = require('./checkin.js')

function genId() {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function dateToStr(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// 获取阶段所有资源（扁平化）
function getStageResources(stage) {
  const resources = []
  const res = stage.resources
  for (const groupKey in res) {
    const groupLabel = resourceLabels[groupKey] || groupKey
    const items = res[groupKey]
    if (Array.isArray(items)) {
      for (const name of items) {
        resources.push({ groupKey, groupLabel, resourceName: name })
      }
    }
  }
  return resources
}

// 将某天总时长拆成 1-3 条记录（每条至少5分钟）
function splitDuration(total) {
  let n
  if (total <= 25) n = 1
  else if (total <= 45) n = 2
  else n = 3
  const splits = []
  let remain = total
  for (let k = 0; k < n; k++) {
    if (k === n - 1) {
      splits.push(remain)
    } else {
      const minSplit = 5
      const maxSplit = remain - (n - k - 1) * minSplit
      const s = minSplit + Math.floor(Math.random() * (maxSplit - minSplit + 1))
      splits.push(s)
      remain -= s
    }
  }
  return splits
}

/**
 * 生成压力测试数据
 * - 每个阶段累计打卡时长约 80-90 小时
 * - 每日打卡总时长 15-60 分钟（拆成 1-3 条记录）
 * - 约 12% 的天数缺卡
 * - 日期从今天往回推算
 * @param {Function} onProgress - 进度回调 (current, total, msg)
 * @returns {Object} 统计信息
 */
function generateStressData(onProgress) {
  const stages = routeData.stages // 7 stages

  // 逐阶段"模拟"：按目标累计时长生成每日计划，null 表示缺卡
  const stagePlans = stages.map(stage => {
    const targetMinutes = (80 + Math.floor(Math.random() * 11)) * 60 // 80-90 小时
    const days = []
    let acc = 0
    while (acc < targetMinutes) {
      // 约 12% 概率缺卡
      if (Math.random() < 0.12) {
        days.push(null)
        continue
      }
      const m = 15 + Math.floor(Math.random() * 46) // 15-60 分钟
      days.push(m)
      acc += m
    }
    return { stage, days, targetMinutes, actualMinutes: acc }
  })

  const spanDays = stagePlans.reduce((s, p) => s + p.days.length, 0)

  // 从今天往回推算起始日期
  const endDate = new Date()
  endDate.setHours(0, 0, 0, 0)
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - (spanDays - 1))
  startDate.setHours(0, 0, 0, 0)

  const allCheckins = {}
  const readCounts = {}
  let totalRecords = 0
  let totalMinutes = 0
  let checkedDays = 0
  let dayIdx = 0

  for (const plan of stagePlans) {
    const { stage, days } = plan
    const resources = getStageResources(stage)

    for (const dayMinutes of days) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + dayIdx)
      const dayStr = dateToStr(d)
      dayIdx++

      // 缺卡日：不生成记录
      if (dayMinutes === null) {
        if (onProgress && dayIdx % 100 === 0) {
          onProgress(dayIdx, spanDays, `生成中: ${dayStr} (${stage.stage_name})`)
        }
        continue
      }

      // 拆成 1-3 条记录
      const splits = splitDuration(dayMinutes)

      // 当天随机起点时间
      const hour = 7 + Math.floor(Math.random() * 14) // 7:00-21:00
      const minute = Math.floor(Math.random() * 60)
      const baseTs = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute, Math.floor(Math.random() * 60)).getTime()

      const dayRecords = []
      for (let j = 0; j < splits.length; j++) {
        const res = resources[Math.floor(Math.random() * resources.length)]
        dayRecords.push({
          id: genId(),
          day: dayStr,
          stageId: stage.stage_id,
          stageName: stage.stage_name,
          groupKey: res.groupKey,
          groupLabel: res.groupLabel,
          resourceName: res.resourceName,
          durationMinutes: splits[j],
          remark: '',
          timestamp: baseTs + j * 30 * 60 * 1000 // 多条记录间隔30分钟
        })
        totalRecords++
        totalMinutes += splits[j]
      }
      allCheckins[dayStr] = dayRecords
      checkedDays++

      // 每两周产生 1-2 次已读完
      if (dayIdx > 0 && dayIdx % 14 === 0) {
        const readCount = 1 + Math.floor(Math.random() * 2) // 1-2
        for (let r = 0; r < readCount; r++) {
          const res = resources[Math.floor(Math.random() * resources.length)]
          const key = `${stage.stage_id}|${res.groupKey}|${res.resourceName}`
          readCounts[key] = (readCounts[key] || 0) + 1
        }
      }

      if (onProgress && dayIdx % 100 === 0) {
        onProgress(dayIdx, spanDays, `生成中: ${dayStr} (${stage.stage_name})`)
      }
    }
  }

  // 保存到存储（使用分片存储，自动按月拆分）
  saveAll(allCheckins)
  wx.setStorageSync(READ_COUNT_KEY, readCounts)

  // 设置当前阶段为最后阶段（准桥梁）
  const lastStage = stages[stages.length - 1]
  if (lastStage) {
    wx.setStorageSync(CURRENT_STAGE_KEY, {
      id: lastStage.stage_id,
      name: lastStage.stage_name
    })
  }

  // 各阶段统计
  const stageStats = {}
  for (const plan of stagePlans) {
    const { stage, days, targetMinutes } = plan
    let records = 0
    let minutes = 0
    for (const day in allCheckins) {
      for (const c of allCheckins[day]) {
        if (c.stageId === stage.stage_id) {
          minutes += c.durationMinutes
          records++
        }
      }
    }
    stageStats[stage.stage_name] = {
      days: days.filter(d => d !== null).length, // 实际打卡天数
      spanDays: days.length, // 阶段跨度天数
      records,
      minutes,
      hours: (minutes / 60).toFixed(1),
      targetHours: (targetMinutes / 60).toFixed(0)
    }
  }

  return {
    totalDays: checkedDays, // 实际打卡天数
    spanDays, // 时间跨度天数
    totalRecords,
    totalHours: (totalMinutes / 60).toFixed(1),
    totalReadCounts: Object.values(readCounts).reduce((s, v) => s + v, 0),
    stageStats
  }
}

module.exports = {
  generateStressData
}
