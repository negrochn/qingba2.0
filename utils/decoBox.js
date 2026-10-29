// 盲盒装饰：一周成绩单顶部/底部的抽中图标与排版。
// 首次进入某周成绩单时真随机抽一款（四档权重，时令限定仅成熟当月入池），连同 12 份
// 各自的角度/偏移按周持久化（storage）；同一周内款式与排版恒定，跨周不同——每周一份专属贴纸。
// 图标来源：images/deco/ 下的透明底彩色 PNG（iconfont 下载）。
// 注意：必须放打包内目录——assets/ 在 project.config.json packOptions.ignore 中被排除，放那里加载不到。

// 水果池：四档稀有度（与 images/deco 文件名一一对应，增删图标需同步此表）
// 常见 7（合计约 88%）/ 稀有 5（约 10%）/ 隐藏 2（约 2%）/ 时令限定 6（约 1.5%，仅限定月）
// 限定款窗口 = 各自最具标志性的成熟月（m: 1~12），窗口外完全不入池：
//   2月草莓（春节年货）5月芒果 6月荔枝（端午）7月西瓜（三伏）9月石榴（中秋）12月橙子（冬至脐橙）
const POOL = [
  // 常见：果盘常客（便宜大碗、全年有）
  { f: 'apple', r: 'common' }, { f: 'banana', r: 'common' }, { f: 'pear', r: 'common' },
  { f: 'grape', r: 'common' }, { f: 'pineapple', r: 'common' }, { f: 'peach', r: 'common' },
  { f: 'kiwi', r: 'common' },
  // 稀有：超市里「挑着买」的档次（全年可得但身价高一截）
  { f: 'coconut', r: 'rare' }, { f: 'dragonfruit', r: 'rare' }, { f: 'blueberry', r: 'rare' },
  { f: 'avocado', r: 'rare' }, { f: 'cantaloupe', r: 'rare' },
  // 隐藏：毕业款（身价天花板 + 符号感：车厘子自由 / 果中皇后）
  { f: 'cherry', r: 'hidden' }, { f: 'mangosteen', r: 'hidden' },
  // 时令限定：国民级时令符号，各锁最标志性的一个月
  { f: 'strawberry', r: 'seasonal', m: 2 },
  { f: 'mango', r: 'seasonal', m: 5 },
  { f: 'lychee', r: 'seasonal', m: 6 },
  { f: 'watermelon', r: 'seasonal', m: 7 },
  { f: 'pomegranate', r: 'seasonal', m: 9 },
  { f: 'orange', r: 'seasonal', m: 12 }
]
const WEIGHT = { common: 12.5, rare: 2, hidden: 1, seasonal: 1.5 }   // 单果权重%（抽取时按当月在池实际总和归一化）

// fruit → 档位反查：老周记录展示时按当前划分重定档（划分调整后老记录自动跟上，无需迁移）
const TIER_OF = {}
POOL.forEach(p => { TIER_OF[p.f] = p.r })

// 中文名与稀有度文案：抽中浮层展示用（列表卡只出图标不出名）
const FRUIT_NAME = {
  apple: '苹果', banana: '香蕉', orange: '橙子', pear: '梨', mango: '芒果',
  pineapple: '菠萝', grape: '葡萄', cherry: '樱桃', peach: '桃子', kiwi: '猕猴桃',
  coconut: '椰子', lychee: '荔枝', watermelon: '西瓜', strawberry: '草莓',
  blueberry: '蓝莓', avocado: '牛油果', cantaloupe: '哈密瓜', dragonfruit: '火龙果',
  mangosteen: '山竹', pomegranate: '石榴'
}
const RARITY_NAME = { common: '常见款', rare: '稀有款', hidden: '隐藏款', seasonal: '时令限定款' }

// 坑位骨架（rpx，固定保证对称与不越界）：top 6 个挂 hero，foot 6 个挂 card 底部装饰带
// side：贴左（l）或贴右（r）；x 为距该侧距离，y 为距顶（top）/距底（foot）距离
const SLOTS = [
  { zone: 'top', side: 'l', x: 36, y: 10 },
  { zone: 'top', side: 'l', x: 100, y: 58 },
  { zone: 'top', side: 'l', x: 30, y: 104 },
  { zone: 'top', side: 'r', x: 36, y: 10 },
  { zone: 'top', side: 'r', x: 98, y: 62 },
  { zone: 'top', side: 'r', x: 32, y: 108 },
  { zone: 'foot', side: 'l', x: 36, y: 36 },
  { zone: 'foot', side: 'l', x: 100, y: 64 },
  { zone: 'foot', side: 'l', x: 30, y: 92 },
  { zone: 'foot', side: 'r', x: 36, y: 36 },
  { zone: 'foot', side: 'r', x: 98, y: 66 },
  { zone: 'foot', side: 'r', x: 32, y: 92 }
]

const rnd = n => Math.round((Math.random() * 2 - 1) * n)   // ±n 整数
const keyOf = (y, w) => `deco:${y}-W${w}`

// 由 ISO 年+周号反推该周周一（与 weeklySheet / reportCard 同一口径），限定款按周一所在月判窗口
function isoWeekMonday(y, w) {
  const jan4 = new Date(y, 0, 4)
  const jd = (jan4.getDay() + 6) % 7
  const mon1 = new Date(jan4)
  mon1.setDate(jan4.getDate() - jd)
  const m = new Date(mon1)
  m.setDate(mon1.getDate() + (w - 1) * 7)
  return m
}

// 抽取：storage 命中直接用（不重抽）；未命中才真随机，并把排版一并固化。
// 命中时 rarity 按当前划分重定档——老记录存的是抽当时的档位，划分调整后展示口径自动跟上。
// seen：抽中浮层的「已展示」标记（0=抽了还没给用户看过）。老记录（加此字段前固化的）
// 无 seen，命中时按已看过处理——不给老周补弹提示
function drawFor(y, w) {
  const k = keyOf(y, w)
  const saved = wx.getStorageSync(k)
  if (saved && saved.fruit) {
    if (saved.seen === undefined) saved.seen = 1
    saved.rarity = TIER_OF[saved.fruit] || saved.rarity
    // 老记录/损坏记录缺排版参数：按零旋转零偏移补齐（保款式不重抽，slotsOf 不会越界）
    if (!Array.isArray(saved.spins) || saved.spins.length !== SLOTS.length) saved.spins = SLOTS.map(() => 0)
    if (!Array.isArray(saved.jitters) || saved.jitters.length !== SLOTS.length) saved.jitters = SLOTS.map(() => [0, 0])
    return saved
  }

  // 当月在池：常驻三档恒在，限定款仅成熟月入池；按实际权重总和归一化（限定月/非限定月两套口径）
  const month = isoWeekMonday(y, w).getMonth() + 1
  const pool = POOL.filter(p => !p.m || p.m === month)

  const total = pool.reduce((s, p) => s + WEIGHT[p.r], 0)
  let t = Math.random() * total
  let pick = pool[0]
  for (const p of pool) { t -= WEIGHT[p.r]; if (t <= 0) { pick = p; break } }

  const rec = {
    fruit: pick.f,
    rarity: pick.r,
    seen: 0,
    spins: SLOTS.map(() => rnd(12)),            // 每份旋转角 ±12°
    jitters: SLOTS.map(() => [rnd(8), rnd(8)])  // 每份 x/y 偏移 ±8rpx
  }
  wx.setStorageSync(k, rec)
  return rec
}

// 浮层展示后置已看：同一周只弹一次
function markSeen(y, w) {
  const k = keyOf(y, w)
  const rec = wx.getStorageSync(k)
  if (rec && rec.fruit && !rec.seen) {
    rec.seen = 1
    wx.setStorageSync(k, rec)
  }
}

// 渲染数据：坑位 + 固化的随机参数 → 页面可直接内联的 style 串
// top 挂 hero（top 定位）、foot 挂 card（bottom 定位），页面 wxml 零计算
function slotsOf(rec) {
  const item = (s, i) => {
    const jx = rec.jitters[i][0]
    const jy = rec.jitters[i][1]
    const edge = s.zone === 'top' ? 'top' : 'bottom'
    const side = s.side === 'l' ? 'left' : 'right'
    return {
      style: `${side}:${s.x + jx}rpx;${edge}:${s.y + jy}rpx;transform:rotate(${rec.spins[i]}deg)`
    }
  }
  return {
    top: SLOTS.map((s, i) => (s.zone === 'top' ? item(s, i) : null)).filter(Boolean),
    foot: SLOTS.map((s, i) => (s.zone === 'foot' ? item(s, i) : null)).filter(Boolean)
  }
}

// ===== 我的图鉴（myStats 卡6）：扫 deco:* 聚合出 20 槽位与抽中次数 =====
// 口径 = 曾抽到过（按周固化记录，count 即抽中次数）；未抽到出灰格「?」，
// 限定款未抽到带 month 供页面出月份角标（6月限定式预告）

// 首次获得周 → 「N月第W周」（详情页「入册」副标题用）；月份按周一所在月（与限定窗口同口径）
function weekLabel(y, w) {
  const d = isoWeekMonday(y, w)
  return (d.getMonth() + 1) + '月第' + (Math.floor((d.getDate() - 1) / 7) + 1) + '周'
}

// 组显示顺序（稀有度递进，隐藏款压轴）；POOL 内 hidden 在 seasonal 前，这里统一定序，
// 消费方（myStats 橱窗 / decoDex 详情页）拿到的 groups 即此顺序，无需各自再排
const RARITY_ORDER = { common: 0, rare: 1, seasonal: 2, hidden: 3 }

function collection() {
  const countOf = {}
  const firstOf = {}   // f → 首次获得年周数字 y*100+w（key 字典序跨位数会错序，必须按数字比）
  try {
    wx.getStorageInfoSync().keys.forEach(k => {
      if (k.indexOf('deco:') !== 0) return
      const rec = wx.getStorageSync(k)
      if (!rec || !rec.fruit) return
      countOf[rec.fruit] = (countOf[rec.fruit] || 0) + 1
      const ps = k.slice(5).split('-')   // 'deco:2026-W42' → ['2026', 'W42']
      const yw = (+ps[0]) * 100 + (+ps[1].slice(1))
      if (!firstOf[rec.fruit] || yw < firstOf[rec.fruit]) firstOf[rec.fruit] = yw
    })
  } catch (e) {}

  const groups = []
  const byTier = {}
  POOL.forEach(p => {
    if (!byTier[p.r]) {
      byTier[p.r] = { key: p.r, name: RARITY_NAME[p.r] || p.r, slots: [] }
      groups.push(byTier[p.r])
    }
    const count = countOf[p.f] || 0
    const fw = firstOf[p.f]
    byTier[p.r].slots.push({
      f: p.f,
      name: FRUIT_NAME[p.f] || p.f,
      month: p.m || 0,
      count,
      got: count > 0 ? 1 : 0,
      firstWeek: fw ? weekLabel(Math.floor(fw / 100), fw % 100) : ''
    })
  })
  // 注意不能写 `|| 9` 兜底：common 的序号是 0，会被 falsy 判定顶成 9 排到最后
  groups.sort((a, b) => {
    const oa = RARITY_ORDER[a.key] !== undefined ? RARITY_ORDER[a.key] : 9
    const ob = RARITY_ORDER[b.key] !== undefined ? RARITY_ORDER[b.key] : 9
    return oa - ob
  })
  groups.forEach(g => { g.got = g.slots.filter(s => s.got).length })
  const got = groups.reduce((n, g) => n + g.got, 0)
  return { got, total: POOL.length, groups }
}

// ===== 备份支持（utils/backup.js 调用）：deco:* 全量导出 / 恢复 =====

// 全量导出：key → 整条记录（含 spins/jitters 排版参数，恢复后老周装饰不变样）
function allRecords() {
  const out = {}
  try {
    wx.getStorageInfoSync().keys.forEach(k => {
      if (k.indexOf('deco:') !== 0) return
      const rec = wx.getStorageSync(k)
      if (rec && rec.fruit) out[k] = rec
    })
  } catch (e) {}
  return out
}

// 恢复：overwrite 先清本机 deco:* 再整组写入（与打卡记录覆盖口径一致）；
// merge 只补缺——抽定记录不可变，本机已有的一律不动
function restoreRecords(records, mode) {
  if (!records || typeof records !== 'object') return
  const keys = () => {
    try { return wx.getStorageInfoSync().keys } catch (e) { return [] }
  }
  if (mode === 'overwrite') {
    keys().forEach(k => {
      if (k.indexOf('deco:') === 0) {
        try { wx.removeStorageSync(k) } catch (e) {}
      }
    })
  }
  Object.keys(records).forEach(k => {
    if (k.indexOf('deco:') !== 0) return
    const rec = records[k]
    if (!rec || !rec.fruit) return
    if (mode !== 'overwrite' && wx.getStorageSync(k)) return
    try { wx.setStorageSync(k, rec) } catch (e) {}
  })
}

module.exports = { drawFor, slotsOf, markSeen, collection, allRecords, restoreRecords, FRUIT_NAME, RARITY_NAME }
