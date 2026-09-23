// 压力测试数据生成
// 按真实计划生成：各阶段按官方时长目标（parseTargetHours）累计打卡；
// 无官方目标的阶段（大循环调整支线）按「试走量」12-20小时生成，保持未完成语义
// 每日总时长15-60分钟，约12%的天数缺卡；日期从今天往回推算
const { resourceLabels, parseTargetHours } = require('./data.js')
const { READ_COUNT_KEY, saveAll, setCurrentStage, setCompletedStages, getCurrentRoute } = require('./checkin.js')

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
      for (const it of items) {
        if (it && it.id) {
          resources.push({ groupKey, groupLabel, resourceId: it.id, resourceName: it.name })
        }
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

// 阶段累计目标时长（分钟）
// - 有官方目标（time_investment）：区间内随机；单值（60H/90H）即固定；80H+ 取下限
// - 无官方目标（大循环调整支线）：按试走量 12-20h，模拟「测试调整策略数日后回主线」，
//   阶段保持 optional 未完成，打卡记录保留
const BRANCH_HOURS = { min: 12, max: 20 }

function getStageTargetMinutes(stage) {
  const range = parseTargetHours(stage.time_investment)
  if (!range) {
    const h = BRANCH_HOURS.min + Math.floor(Math.random() * (BRANCH_HOURS.max - BRANCH_HOURS.min + 1))
    return h * 60
  }
  const h = range.min + Math.floor(Math.random() * (range.max - range.min + 1))
  return h * 60
}

/**
 * 生成压力测试数据
 * - 各阶段按官方时长目标累计打卡（支线按试走量 12-20 小时）
 * - 每日打卡总时长 15-60 分钟（拆成 1-3 条记录）
 * - 约 12% 的天数缺卡
 * - 日期从今天往回推算
 * @param {Function} onProgress - 进度回调 (current, total, msg)
 * @returns {Object} 统计信息
 */
function generateStressData(onProgress) {
  const stages = getCurrentRoute().stages // 当前路线的全部阶段（含大循环的 9 个）

  // 逐阶段"模拟"：按目标累计时长生成每日计划，null 表示缺卡
  const stagePlans = stages.map(stage => {
    const targetMinutes = getStageTargetMinutes(stage)
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
          resourceId: res.resourceId,
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
          const key = `${stage.stage_id}|${res.groupKey}|${res.resourceId}`
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

  // 设置当前阶段为最后阶段，并按晋级链标记前序完成（与 stagePicker 的链式写入一致：
  // 大循环下调整支线与主线互不误标；常规路线 = 数组前序，行为不变）
  const lastIdx = stages.length - 1
  const lastStage = stages[lastIdx]
  if (lastStage) {
    setCurrentStage({
      id: lastStage.stage_id,
      name: lastStage.stage_name
    })
    const chain = {}
    ;(function walk(s) {
      if (!s || chain[s.stage_id]) return
      ;(s.prev_stage_ids || []).forEach(id => {
        walk(stages.find(x => x.stage_id === id))
      })
      chain[s.stage_id] = true
    })(lastStage)
    // 与 stagePicker 的链式写入一致：名单不含当前阶段自身，
    // 最后阶段保持 current（可打卡、可点「完成阶段」），只标前序
    delete chain[lastStage.stage_id]
    setCompletedStages(Object.keys(chain))
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
