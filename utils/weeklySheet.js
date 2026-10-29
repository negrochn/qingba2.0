// 一周成绩单数据层：详情页渲染与海报合成共用同一口径。
// 输入 stageId + ISO 年/周号，输出该周矩阵行 / 投入行 / 汇总。
// 口径与 pages/reportCard 列表页一致：
//   打卡 ✓：当天有该资源的记录即算（不看折算）
//   投入：effectiveMinutes 折算（熏听按 factor 计）
//   配色：全期首次打卡顺序循环色板（与列表页 / 统计页图例同序同色）

const checkin = require('./checkin')
const decoBox = require('./decoBox')

// 色板与 pages/reportCard、pages/myStats 同源（改色需三处同步）
const PALETTE = ['#f57c84', '#71b7f3', '#54d2b9', '#fca40d', '#b5a8e8']
const COL_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const SEGS = 20 // 投入占比条段数

function pad2(n) { return String(n).padStart(2, '0') }
function dayStrOf(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }

// 由 ISO 年+周号反推该周周一（与 reportCard.js 同实现）
function isoWeekMonday(y, w) {
  const jan4 = new Date(y, 0, 4)
  const jd = (jan4.getDay() + 6) % 7
  const mon1 = new Date(jan4)
  mon1.setDate(jan4.getDate() - jd)
  const m = new Date(mon1)
  m.setDate(mon1.getDate() + (w - 1) * 7)
  return m
}

// 投入条 20 段：1 格 = 1 小时，满 1 小时亮 1 格；不足 1 小时的零头以淡格（dim）示进度
// 85 分钟 → 1 实格 + 1 淡格；60 分钟 → 1 实格；超 20 小时封顶满格
function hourSegs(minutes) {
  const full = Math.min(Math.floor(minutes / 60), SEGS)
  const partial = full < SEGS && minutes % 60 > 0
  return Array.from({ length: SEGS }, (_, i) => ({
    i,
    on: i < full || (i === full && partial) ? 1 : 0,
    dim: i === full && partial ? 1 : 0
  }))
}

/**
 * 汇总某一周成绩单数据
 * @param {string} stageId 阶段 id
 * @param {number} y ISO 年
 * @param {number} w ISO 周号
 * @returns {{ error: string } | {
 *   weekLabel, rangeLabel, cols, rows, summary, dayStrs
 * }} error 为入口/数据防御文案；成功时：
 *   cols      列头 [{ label, today }]
 *   rows      [{ name, initial, color, minutesLabel, parts, segs, cells: [{i, done}] }]
 *   mine      「我的一周」行：该周整体打卡（当天任一资源打卡即 ✓），只进打卡矩阵
 *             { name, initial, color, cells: [{i, done}] }
 *   summary   { minutesLabel, parts, daysChecked, segs }
 *   segs      投入条 20 段 {i, on, dim}：1 格 = 1 小时，dim 为不足 1 小时的零头淡格
 *   deco      盲盒装饰：首进该周抽定款式与排版（utils/decoBox.js），顶/底各 3+3
 *             { fruit, rarity, glow, top: [{style}], foot: [{style}] }
 *   dayStrs   该周 7 天 'YYYY-MM-DD'（海报画日期副行用不到，调试/扩展留）
 */
// 时长拆段：分钟数 → [{ v, u }]（页面把数值/单位分级渲染：数值大字、单位小字）
// 45 → [{ v:45, u:'分钟' }]；125 → [{ v:2, u:'小时' }, { v:5, u:'分钟' }]；120 → [{ v:2, u:'小时' }]
function durationParts(m) {
  m = Math.round(m) // 熏听折算（0.5/0.8 factor）可能出 22.5，先取整与 fmtMinutesCN 显示口径一致
  const h = Math.floor(m / 60)
  const mm = m % 60
  if (h <= 0) return [{ v: mm, u: '分钟' }]
  return mm > 0 ? [{ v: h, u: '小时' }, { v: mm, u: '分钟' }] : [{ v: h, u: '小时' }]
}

function collect(stageId, y, w) {
  if (!stageId || !y || !w) return { error: '请从成绩单列表进入' }

  // 全量记录 → 本阶段：byDay[day] = [name 保序去重]（打卡口径）；
  // mins["day|name"] = 折算分钟（投入口径）；firstSeen 定色与列表页一致
  const all = checkin.getAll() || {}
  const byDay = {}
  const mins = {}
  const firstSeen = new Map()
  Object.keys(all).sort().forEach(day => {
    ;(all[day] || []).forEach(r => {
      if (r.stageId !== stageId) return
      const n = r.resourceName
      if (!byDay[day]) byDay[day] = []
      if (!byDay[day].includes(n)) byDay[day].push(n)
      if (!firstSeen.has(n)) firstSeen.set(n, day)
      const k = `${day}|${n}`
      mins[k] = (mins[k] || 0) + checkin.effectiveMinutes(r)
    })
  })

  const mon = isoWeekMonday(y, w)
  const dayStrs = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    dayStrs.push(dayStrOf(d))
  }

  // 该周出现过的资源按本周首次打卡顺序成行（详情页不截断）
  const names = []
  dayStrs.forEach(day => (byDay[day] || []).forEach(n => {
    if (!names.includes(n)) names.push(n)
  }))
  if (!names.length) return { error: '这一周还没有打卡记录' }

  const colorOf = {}
  ;[...firstSeen.keys()].forEach((n, i) => { colorOf[n] = PALETTE[i % PALETTE.length] })
  const today = dayStrOf(new Date())

  // 每资源周投入合计（折算分钟）
  let totalMinutes = 0
  const rows = names.map(name => {
    let m = 0
    dayStrs.forEach(day => { m += mins[`${day}|${name}`] || 0 })
    totalMinutes += m
    return { name, m, initial: name[0], color: colorOf[name], minutesLabel: checkin.fmtMinutesCN(m), parts: durationParts(m) }
  })

  // 投入条：每资源按「1 小时 1 格」填段（不足 1 小时的零头为淡格）
  rows.forEach(r => {
    r.segs = hourSegs(r.m)
    delete r.m
  })

  // 打卡天数：汇总行展示字段（投入条已改为按总时长小时格，不再参与填段）
  const daysChecked = dayStrs.filter(day => (byDay[day] || []).length).length

  // 盲盒装饰：首次进入该周抽定款式与排版并按周固化（无记录的周提前 return，不消耗抽取）
  const decoRec = decoBox.drawFor(y, w)
  const decoSlots = decoBox.slotsOf(decoRec)

  return {
    weekLabel: `${y} 第 ${w} 周`,
    rangeLabel: `${dayStrs[0].slice(5).replace('-', '.')} - ${dayStrs[6].slice(5).replace('-', '.')}`,
    cols: COL_LABELS.map((label, i) => ({ label, today: dayStrs[i] === today })),
    rows: rows.map(r => ({
      name: r.name,
      initial: r.initial,
      color: r.color,
      minutesLabel: r.minutesLabel,
      parts: r.parts,
      segs: r.segs,
      cells: dayStrs.map((day, i) => ({ i, done: (byDay[day] || []).includes(r.name) ? 1 : 0 }))
    })),
    summary: {
      minutesLabel: checkin.fmtMinutesCN(totalMinutes),
      parts: durationParts(totalMinutes),
      daysChecked,
      segs: hourSegs(totalMinutes)
    },
    dayStrs,
    // 「我的一周」行：该周整体打卡情况（当天任一资源打卡即 ✓），只进打卡矩阵不进投入区；
    // 品牌绿与汇总行「周」头像同色
    mine: {
      name: '我的一周',
      initial: '周',
      color: '#07C160',
      cells: dayStrs.map((day, i) => ({ i, done: (byDay[day] || []).length ? 1 : 0 }))
    },
    // 盲盒装饰渲染数据：style 串已含坑位+抖动+角度，页面内联即用；
    // spins 海报绘制用（12 份固化旋转角，与页面同源）
    deco: {
      fruit: decoRec.fruit,
      rarity: decoRec.rarity,
      spins: decoRec.spins,
      name: decoBox.FRUIT_NAME[decoRec.fruit] || decoRec.fruit,
      rarityName: decoBox.RARITY_NAME[decoRec.rarity] || '',
      seen: decoRec.seen,
      glow: decoRec.rarity === 'hidden' ? 1 : 0,        // 隐藏款绿光
      sglow: decoRec.rarity === 'seasonal' ? 1 : 0,     // 时令限定款专属光色
      top: decoSlots.top,
      foot: decoSlots.foot
    }
  }
}

module.exports = { collect, PALETTE, COL_LABELS, SEGS, hourSegs, isoWeekMonday, dayStrOf }
