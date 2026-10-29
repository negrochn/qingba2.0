// 我的成绩单：按周展示打卡成绩单卡片列表（iHour 式）——最近一周在上，
// 每张卡：周标签 + 日期范围 + 周一~周日打卡矩阵（行 = 该周打卡过的资源，
// 最多展示 3 行），点卡片进详情页看完整周报。从「我的统计」进入（URL 带 stageId）。
// 格子只看「当天是否打过」（记录存在即 ✓，不看时长折算）；资源配色沿用
// myStats 的「首次打卡顺序循环色板」。

const theme = require('../../utils/theme')
const checkin = require('../../utils/checkin')
const decoBox = require('../../utils/decoBox')

// 色板与 pages/myStats/myStats.js 的 PALETTE 同源（改色需同步两处）
const PALETTE = ['#f57c84', '#71b7f3', '#54d2b9', '#fca40d', '#b5a8e8']
const COL_LABELS = ['一', '二', '三', '四', '五', '六', '日']
const MAX_ROWS = 3 // 列表卡最多展示的资源行数，完整周报在详情页

function pad2(n) { return String(n).padStart(2, '0') }
function dayStrOf(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }

// ISO 周号（周一为一周之始；与 myStats.js 同实现）
function isoWeek(d) {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (t.getDay() + 6) % 7
  const thu = new Date(t)
  thu.setDate(thu.getDate() - dow + 3)
  const firstThu = new Date(thu.getFullYear(), 0, 4)
  const fd = (firstThu.getDay() + 6) % 7
  firstThu.setDate(firstThu.getDate() - fd + 3)
  return { y: thu.getFullYear(), w: Math.round((thu - firstThu) / 6048e5) + 1 }
}
// 由 ISO 年+周号反推该周周一
function isoWeekMonday(y, w) {
  const jan4 = new Date(y, 0, 4)
  const jd = (jan4.getDay() + 6) % 7
  const mon1 = new Date(jan4)
  mon1.setDate(jan4.getDate() - jd)
  const m = new Date(mon1)
  m.setDate(mon1.getDate() + (w - 1) * 7)
  return m
}

Page({
  data: {
    fontClass: '',
    darkClass: '',
    ready: false,
    emptyText: '',
    cheer: false,
    weeks: [] // [{ key, y, w, weekLabel, rangeLabel, cols, rows, total, more }]
  },

  onLoad(options) {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })

    const stageId = (options && options.stageId) || ''
    if (!stageId) {
      this.setData({ emptyText: '请从「我的统计」页进入' })
      return
    }
    this._stageId = stageId
    this.setData({ cheer: true }) // 之后的「无记录」空态走插画鼓励样式
    this._refresh()
  },

  // 每次回到本页重建周卡：详情页开盒后返回，本周卡盲盒图标要即时亮起
  onShow() {
    if (this._stageId) this._refresh()
  },

  // 全量记录 → 本阶段：byDay[day] = [resourceName 保序去重]；firstSeen 记录
  // 资源在全期的首次打卡顺序（定色用，与统计页图例同序）
  _refresh() {
    const stageId = this._stageId
    const all = checkin.getAll() || {}
    const byDay = {}
    const firstSeen = new Map()
    Object.keys(all).sort().forEach(day => {
      ;(all[day] || []).forEach(r => {
        if (r.stageId !== stageId) return
        if (!byDay[day]) byDay[day] = []
        if (!byDay[day].includes(r.resourceName)) byDay[day].push(r.resourceName)
        if (!firstSeen.has(r.resourceName)) firstSeen.set(r.resourceName, day)
      })
    })
    const days = Object.keys(byDay).sort()
    if (!days.length) {
      this.setData({ emptyText: '只要坚持一周就有成绩单喔' })
      return
    }

    this._byDay = byDay
    this._colorOf = {}
    ;[...firstSeen.keys()].forEach((n, i) => { this._colorOf[n] = PALETTE[i % PALETTE.length] })
    this._today = dayStrOf(new Date())

    // 有打卡的日期按 ISO 周分组，倒序排列（最近一周在最上）
    const weekMap = new Map()
    days.forEach(day => {
      const iw = isoWeek(new Date(day + 'T00:00:00'))
      const key = `${iw.y}-${iw.w}`
      if (!weekMap.has(key)) weekMap.set(key, { key, y: iw.y, w: iw.w, days: [] })
      weekMap.get(key).days.push(day)
    })
    const weeks = [...weekMap.values()]
      .sort((a, b) => (b.y * 100 + b.w) - (a.y * 100 + a.w))
      .map(wk => this._buildWeek(wk))

    this.setData({ ready: true, weeks })
  },

  // 构建一周卡片：补全周一~周日 7 天，行取该周全部资源的前 3 项
  _buildWeek(wk) {
    const mon = isoWeekMonday(wk.y, wk.w)
    const dayStrs = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon)
      d.setDate(mon.getDate() + i)
      dayStrs.push(dayStrOf(d))
    }

    // 该周出现过的资源，按本周首次打卡顺序成行
    const names = []
    dayStrs.forEach(day => (this._byDay[day] || []).forEach(n => {
      if (!names.includes(n)) names.push(n)
    }))

    // 盲盒图标：该周抽定款式（幂等，命中缓存不重抽；首次在列表即固化）
    const decoRec = decoBox.drawFor(wk.y, wk.w)

    return {
      key: wk.key,
      y: wk.y,
      w: wk.w,
      weekLabel: `${wk.y} 第 ${wk.w} 周`,
      // 周标签右侧的小图标：开过盒（进详情见过浮层，seen=1）才显示，隐藏款带微光；
      // 未开的什么都不显示——剪影也认得出水果，悬念完整留给浮层
      decoIcon: {
        fruit: decoRec.fruit,
        open: decoRec.seen === 1 ? 1 : 0,
        glow: decoRec.rarity === 'hidden' ? 1 : 0,
        sglow: decoRec.rarity === 'seasonal' ? 1 : 0,
        spin: decoRec.spins[0]
      },
      rangeLabel: `${dayStrs[0].slice(5).replace('-', '.')} - ${dayStrs[6].slice(5).replace('-', '.')}`,
      cols: COL_LABELS.map((label, i) => ({ label, today: dayStrs[i] === this._today })),
      // cells 带下标属性供 wx:key 使用（纯 0/1 数组用 *this 会因重复值告警）
      rows: names.slice(0, MAX_ROWS).map(name => ({
        name,
        initial: name[0],
        color: this._colorOf[name],
        cells: dayStrs.map((day, i) => ({ i, done: (this._byDay[day] || []).includes(name) ? 1 : 0 }))
      })),
      total: names.length,
      more: Math.max(0, names.length - MAX_ROWS)
    }
  },

  // 进入该周成绩单详情页
  goDetail(e) {
    const { y, w } = e.currentTarget.dataset
    wx.navigateTo({
      url: `/pages/reportCardDetail/reportCardDetail?stageId=${this._stageId}&y=${y}&w=${w}`
    })
  }
})
