// 压力测试数据生成
// 从指定日期到今天，逐级分阶段生成打卡记录
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

/**
 * 生成压力测试数据
 * @param {Function} onProgress - 进度回调 (current, total, msg)
 * @returns {Object} 统计信息
 */
function generateStressData(onProgress) {
  const startDate = new Date(2021, 5, 1) // 2021-06-01
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 0)

  const totalDays = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)) + 1
  const stages = routeData.stages // 7 stages
  const daysPerStage = Math.floor(totalDays / stages.length)

  // 阶段时间线
  const stageTimeline = stages.map((stage, i) => {
    const startDay = i * daysPerStage
    const endDay = (i === stages.length - 1) ? totalDays - 1 : (i + 1) * daysPerStage - 1
    return { stage, startDay, endDay, resources: getStageResources(stage) }
  })

  const allCheckins = {}
  const readCounts = {}
  let totalRecords = 0
  let totalMinutes = 0

  for (let dayIdx = 0; dayIdx < totalDays; dayIdx++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + dayIdx)
    const dayStr = dateToStr(d)
    const timestamp = d.getTime()

    // 确定当前阶段
    let currentStageInfo = stageTimeline[0]
    for (const tl of stageTimeline) {
      if (dayIdx >= tl.startDay && dayIdx <= tl.endDay) {
        currentStageInfo = tl
        break
      }
    }

    const stage = currentStageInfo.stage
    const resources = currentStageInfo.resources

    // 随机生成 3-10 条记录
    const recordCount = 3 + Math.floor(Math.random() * 8) // 3-10
    const dayRecords = []

    for (let j = 0; j < recordCount; j++) {
      // 随机选一个资源
      const res = resources[Math.floor(Math.random() * resources.length)]

      // 时长：10-30 分钟
      const duration = 10 + Math.floor(Math.random() * 21)

      // 时间戳：当天随机时间
      const hour = 7 + Math.floor(Math.random() * 14) // 7:00-21:00
      const minute = Math.floor(Math.random() * 60)
      const ts = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute, Math.floor(Math.random() * 60)).getTime()

      const record = {
        id: genId(),
        day: dayStr,
        stageId: stage.stage_id,
        stageName: stage.stage_name,
        groupKey: res.groupKey,
        groupLabel: res.groupLabel,
        resourceName: res.resourceName,
        durationMinutes: duration,
        remark: '',
        timestamp: ts
      }
      dayRecords.push(record)
      totalRecords++
      totalMinutes += duration
    }

    allCheckins[dayStr] = dayRecords

    // 每两周产生 1-2 次已读完
    if (dayIdx > 0 && dayIdx % 14 === 0) {
      const readCount = 1 + Math.floor(Math.random() * 2) // 1-2
      for (let r = 0; r < readCount; r++) {
        const res = resources[Math.floor(Math.random() * resources.length)]
        const key = `${stage.stage_id}|${res.groupKey}|${res.resourceName}`
        readCounts[key] = (readCounts[key] || 0) + 1
      }
    }

    // 每 100 天报告进度
    if (onProgress && (dayIdx % 100 === 0 || dayIdx === totalDays - 1)) {
      onProgress(dayIdx + 1, totalDays, `生成中: ${dayStr} (${stage.stage_name})`)
    }
  }

  // 保存到存储（使用分片存储，自动按月拆分）
  saveAll(allCheckins)
  wx.setStorageSync(READ_COUNT_KEY, readCounts)

  // 设置当前阶段为准桥梁
  const bridgeStage = stages.find(s => s.stage_id === 'pre_bridge')
  if (bridgeStage) {
    wx.setStorageSync(CURRENT_STAGE_KEY, {
      id: bridgeStage.stage_id,
      name: bridgeStage.stage_name
    })
  }

  // 各阶段统计
  const stageStats = {}
  for (const tl of stageTimeline) {
    let minutes = 0
    let count = 0
    for (const day in allCheckins) {
      for (const c of allCheckins[day]) {
        if (c.stageId === tl.stage.stage_id) {
          minutes += c.durationMinutes
          count++
        }
      }
    }
    stageStats[tl.stage.stage_name] = {
      days: tl.endDay - tl.startDay + 1,
      records: count,
      minutes,
      hours: (minutes / 60).toFixed(1)
    }
  }

  return {
    totalDays,
    totalRecords,
    totalHours: (totalMinutes / 60).toFixed(1),
    totalReadCounts: Object.values(readCounts).reduce((s, v) => s + v, 0),
    stageStats
  }
}

module.exports = {
  generateStressData
}
