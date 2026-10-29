// 统计分享图合成（我的统计页）
//
// 背景：webview 渲染器无整页截图能力（snapshot 组件仅 skyline 渲染器支持，
// 页面里调 takeSnapshot 会报 "webview renderer is not supported"）。
// 方案：页面先把 ECharts canvas（环形图含中心文字 / 项目标签，柱状图含坐标轴）
// 用 wx.canvasToTempFilePath 导出为图片，本模块在「屏外 canvas」上合成分享图，
// 还原页面卡片外观：
//   页面底 → 卡片（圆角）→ 卡头 → 图表 → 图例（仅环形卡片）
// 卡头两种模式：
//   A. 日期块（每日统计）：日数字 + 星期英文 | 竖线 | 星期中文 + 年月（iHour 式）
//   B. 标题 + tabs 胶囊组（+ 期号行）：投入趋势 / 投入分布（还原页面 card-head）
// 深浅色跟随页面当前模式；色值与 app.wxss 的 --* 变量一一对应
// （canvas 拿不到 CSS 变量，两套手写，改色板时需同步这里）。

// 深浅色 token（对齐 app.wxss page / .dm-dark）
// 注意 bg 是「画框底」：比页面 --bg 深一档（#e0e0e0 / #090909）——分享图四周只有
// 细窄一圈底色，用页面同款浅灰会和白卡糊在一起，观感像没背景；深一档才衬出卡片轮廓
const TOKENS = {
  light: {
    bg: '#e0e0e0', card: '#ffffff', card2: '#f7f7f7', cellActive: '#ececec',
    text: '#1a1a1a', text2: '#737373', text3: '#b2b2b2'
  },
  dark: {
    bg: '#090909', card: '#191919', card2: '#202020', cellActive: '#373737',
    text: 'rgba(255,255,255,.8)', text2: 'rgba(255,255,255,.5)', text3: 'rgba(255,255,255,.3)'
  }
}

const WEEK_EN = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// ---- 小工具 ----

// 圆角矩形路径
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 文本超宽省略（返回实际应绘制的文本，需先设好 ctx.font）
function ellipsis(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1)
  return t + '…'
}

// 居中绘制单行文本
function fillCenter(ctx, text, cx, cy, font, color) {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy)
  ctx.textAlign = 'left'
}

/**
 * 合成内核：页面底 → 卡片 → 卡头 → 图表 → 图例
 * opts.canvas       屏外 canvas 2d 节点（myStats #poster-canvas，多任务串行共用）
 * opts.chartImg     ECharts canvas 导出的临时图片路径
 * opts.dark / opts.windowWidth / opts.pixelRatio
 *
 * 卡头 A（每日统计）：
 *   opts.dayBlock  'YYYY-MM-DD'
 * 卡头 B（趋势 / 分布）：
 *   opts.title     卡头标题，如「投入趋势」
 *   opts.tabs      { items: ['最近7天','按周','按月','按年'], active: 0 }（同页面 .tabs 胶囊）
 *   opts.subText   卡头第二行居中文本（分布：期号「2026 年 10 月」/「在 QingBa2.0 记录时间的 N 天」）
 *
 * opts.chartH       图表区高 rpx：环形 480（.ring-box）/ 柱状 380（.bar-box）
 * opts.legend       两列图例 [{ name, initial, color, pct, valText }]，趋势不传
 * cb(tempFilePath | null, errMsg)
 */
function compose(opts, cb) {
  const t = opts.dark ? TOKENS.dark : TOKENS.light
  const canvas = opts.canvas
  const legend = opts.legend || []
  const rows = Math.ceil(legend.length / 2)

  // 版式常量（单位 rpx；与页面 myStats.wxss 对齐，画框边距比页面略宽以衬卡片）
  const W = 750            // 画布逻辑宽（含画框底）
  const PAD_X = 48         // 画框左右留白（页面 .card margin 32，这里放宽到 48）
  const CARD_PAD = 24      // 卡内边距（.card padding）
  const HEAD_ROW_H = 48    // 标题 + tabs 行高（tabs 胶囊壳高）
  const TAB_PAD = 20       // tab 文本左右内边距（.tab padding）
  const SUB_H = 64         // 期号行高（.period-nav 48 + margin-bottom 16）
  const HEAD_H_DATE = 76   // 日期块行高
  const HEAD_GAP = 24      // 卡头与图区间距（.card-head margin-bottom）
  const LEG_TOP = 8        // 图例距图区（.legend margin-top）
  const ROW_H = 92         // 图例行高
  const AVATAR = 40        // 头像直径（.legend-avatar）

  const innerW = W - PAD_X * 2 - CARD_PAD * 2   // 卡内容宽 638
  const colW = (innerW - 32) / 2                // 图例两列，列间距 32（.legend column-gap）

  const isDate = !!opts.dayBlock
  let headH = 0
  if (isDate) headH = HEAD_H_DATE + HEAD_GAP
  else if (opts.title) headH = HEAD_ROW_H + (opts.subText ? SUB_H : 0) + HEAD_GAP

  const CHART_H = opts.chartH || 480
  const FRAME = 48         // 画框上下留白（上=下）
  const H = FRAME + 32 + headH + CHART_H + (rows ? LEG_TOP + rows * ROW_H : 0) + 32 + FRAME

  // 物理尺寸 = 逻辑 rpx × (rpx→px) × 清晰度倍数（≤3）；每次合成重设尺寸（会重置画布状态）
  const k = (opts.windowWidth / W) * Math.min(opts.pixelRatio || 2, 3)
  canvas.width = Math.round(W * k)
  canvas.height = Math.round(H * k)
  const ctx = canvas.getContext('2d')
  ctx.scale(k, k)

  // 页面底
  ctx.fillStyle = t.bg
  ctx.fillRect(0, 0, W, H)

  // 卡片
  const cardTop = FRAME
  roundRect(ctx, PAD_X, cardTop, W - PAD_X * 2, H - FRAME * 2, 20)
  ctx.fillStyle = t.card
  ctx.fill()

  const contentX = PAD_X + CARD_PAD

  // ---- 卡头 A：iHour 式日期块（日数字 + 星期英文 | 竖线 | 星期中文 + 年月） ----
  if (isDate) {
    const d = new Date(opts.dayBlock + 'T00:00:00')
    const headY = cardTop + 32 + HEAD_H_DATE / 2
    const day = String(d.getDate())

    // 日数字 + 星期英文（左块）
    ctx.textBaseline = 'alphabetic'
    ctx.font = '52px sans-serif'
    const numW = ctx.measureText(day).width
    ctx.fillStyle = t.text
    ctx.fillText(day, contentX, headY + 14)
    ctx.font = '500 20px sans-serif'
    ctx.fillStyle = t.text3
    ctx.fillText(WEEK_EN[d.getDay()], contentX + 2, headY + 42)

    // 分隔竖线
    const lx = contentX + Math.max(numW, 44) + 24
    ctx.strokeStyle = t.text3
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(lx, headY - 32)
    ctx.lineTo(lx, headY + 36)
    ctx.stroke()

    // 星期中文 + 年月（右块，两行间留一点空隙）
    const tx = lx + 24
    ctx.font = '26px sans-serif'
    ctx.fillStyle = t.text2
    ctx.fillText('星期' + '日一二三四五六'[d.getDay()], tx, headY - 6)
    ctx.font = '30px sans-serif'
    ctx.fillStyle = t.text
    ctx.fillText(`${d.getFullYear()} 年 ${d.getMonth() + 1} 月`, tx, headY + 36)
  }

  // ---- 卡头 B：标题（左）+ tabs 胶囊组（右，同 .card-head space-between） ----
  if (opts.title) {
    const headRowY = cardTop + 32
    // 标题
    ctx.textBaseline = 'middle'
    ctx.font = '600 34px sans-serif'
    ctx.fillStyle = t.text
    ctx.fillText(opts.title, contentX, headRowY + HEAD_ROW_H / 2)

    // tabs：靠右排布，壳底 cell-active、选中项白底胶囊（页面 .tabs/.tab-on）
    if (opts.tabs) {
      const { items, active } = opts.tabs
      ctx.font = '24px sans-serif'
      const itemWs = items.map(s => ctx.measureText(s).width + TAB_PAD * 2)
      const shellW = itemWs.reduce((a, b) => a + b, 0) + 8
      const shellX = contentX + innerW - shellW
      roundRect(ctx, shellX, headRowY, shellW, HEAD_ROW_H, 10)
      ctx.fillStyle = t.cellActive
      ctx.fill()
      let cx2 = shellX + 4
      items.forEach((s, i) => {
        const w = itemWs[i]
        if (i === active) {
          roundRect(ctx, cx2, headRowY + 4, w, HEAD_ROW_H - 8, 8)
          ctx.fillStyle = t.card
          ctx.fill()
        }
        fillCenter(ctx, s, cx2 + w / 2, headRowY + HEAD_ROW_H / 2,
          i === active ? '500 24px sans-serif' : '24px sans-serif',
          i === active ? t.text : t.text2)
        cx2 += w
      })
    }
  }

  // ---- 卡头 B 第二行：期号 / 记录天数（居中） ----
  if (opts.subText) {
    fillCenter(ctx, opts.subText, W / 2, cardTop + 32 + HEAD_ROW_H + SUB_H / 2, '30px sans-serif', t.text)
  }

  // ---- 图表（页面 ECharts canvas 导出图按比例 contain 贴入，禁止拉伸） ----
  // 源图比例（页面 canvas 内宽）与海报图区（innerW×CHART_H）不一致，
  // 直接指定目标宽高会把环拉成纵向椭圆（实测 ~2.3%）；改为等比缩放、图区内居中，
  // 图例位置仍按 CHART_H 计算，版式不变
  const chartY = cardTop + 32 + headH
  const img = canvas.createImage()
  img.onload = () => {
    const s = Math.min(innerW / img.width, CHART_H / img.height)
    const w2 = img.width * s
    const h2 = img.height * s
    ctx.drawImage(img, contentX + (innerW - w2) / 2, chartY + (CHART_H - h2) / 2, w2, h2)

    // ---- 图例：两列网格（与页面 .legend 同构） ----
    const legY = chartY + CHART_H + LEG_TOP
    legend.forEach((it, i) => {
      const x0 = contentX + (i % 2) * (colW + 32)
      const y0 = legY + Math.floor(i / 2) * ROW_H

      // 头像（色块 + 首字，垂直居中略偏上，同页面 flex 居中观感）
      const avY = y0 + (ROW_H - AVATAR) / 2 - 10
      ctx.beginPath()
      ctx.arc(x0 + AVATAR / 2, avY + AVATAR / 2, AVATAR / 2, 0, Math.PI * 2)
      ctx.fillStyle = it.color
      ctx.fill()
      fillCenter(ctx, it.initial, x0 + AVATAR / 2, avY + AVATAR / 2 + 1, '600 22px sans-serif', '#ffffff')

      // 名字 + 时长
      const nameX = x0 + AVATAR + 6
      ctx.font = '26px sans-serif'
      const valW = ctx.measureText(it.valText).width
      const nameMax = colW - AVATAR - 6 - valW - 8
      ctx.fillStyle = t.text
      ctx.textBaseline = 'alphabetic'
      ctx.fillText(ellipsis(ctx, it.name, nameMax), nameX, y0 + 32)
      ctx.fillStyle = t.text2
      ctx.fillText(it.valText, x0 + colW - valW, y0 + 32)

      // 进度条 + 百分比
      const barY = y0 + 46
      const barW = colW - AVATAR - 6 - 52 - 8
      roundRect(ctx, nameX, barY, barW, 12, 6)
      ctx.fillStyle = t.card2
      ctx.fill()
      if (it.pct > 0) {
        roundRect(ctx, nameX, barY, Math.max(12, barW * it.pct / 100), 12, 6)
        ctx.fillStyle = it.color
        ctx.fill()
      }
      ctx.fillStyle = t.text2
      ctx.font = '24px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(it.pct + '%', x0 + colW, barY + 12)
      ctx.textAlign = 'left'
    })

    // 导出为临时图片
    wx.canvasToTempFilePath({
      canvas,
      success: r => cb(r.tempFilePath, ''),
      fail: err => cb(null, (err && err.errMsg) || '导出失败')
    })
  }
  img.onerror = () => cb(null, '图表加载失败')
  img.src = opts.chartImg
}

// 环形卡片：每日统计（日期块卡头）/ 投入分布（标题 + tabs + 期号卡头），图高 480
function buildDailyPoster(opts, cb) {
  compose({ ...opts, chartH: 480 }, cb)
}

// 趋势卡片：标题 + tabs 卡头 + 柱状图（无图例），图高 380
function buildTrendPoster(opts, cb) {
  compose({ ...opts, chartH: 380, legend: [] }, cb)
}

// ---- 一周成绩单海报（白底 iHour 风：纯排版、大留白、无水印） ----
// 不跟随深浅色——分享图统一白底（对齐 iHour 海报观感），色值固定写死
// opts.sheet          weeklySheet.collect() 的成功结果（页面渲染与海报同源）
// opts.canvas         屏外 canvas 2d 节点（详情页 #poster-canvas）
// opts.windowWidth / opts.pixelRatio
const SHEET_C = {
  // bg 为卡片外的画布底色（深一档衬出白卡轮廓，同统计海报 TOKENS 的思路）
  bg: '#e0e0e0', text: '#1a1a1a', text2: '#737373', text3: '#b2b2b2',
  cellActive: '#ececec', divider: '#e5e5e5', brand: '#07C160', white: '#ffffff', card: '#ffffff'
}

// 入口：先加载抽中图标 PNG（页面与海报同款 12 份），加载完成后进入整体绘制；
// 图片缺失时降级为无图标版式，不阻塞出图
function buildWeeklySheet(opts, cb) {
  const s = opts.sheet
  const canvas = opts.canvas
  const img = canvas.createImage()
  img.onload = () => paintWeeklySheet(opts, cb, img)
  img.onerror = () => paintWeeklySheet(opts, cb, null)
  img.src = `/images/deco/${s.deco.fruit}.png`
}

function paintWeeklySheet(opts, cb, decoImg) {
  const s = opts.sheet
  const canvas = opts.canvas

  // 版式常量（rpx）：大留白纯排版，宽 750 与统计海报一致
  const W = 750
  const PAD = 52                       // 左右留白（卡内边距收窄，内容更占满卡片）
  const CW = W - PAD * 2               // 内容宽 646
  const NAME_W = 307                   // 矩阵资源列宽（再微收，方块间隙落在 4~5）
  const COL_W = (CW - NAME_W) / 7      // 矩阵格列宽 ≈48.4（块 44，间隙 ≈4.4）
  const TOP = 52                       // 卡顶到徽章的呼吸（页面卡头观感：上方留白收窄）
  const HEAD_H = 210                   // 徽章 + 标题 + 副行块高（badge 48 + 三段等距 24 + 周次下留 32）
  const COL_H = 44                     // 矩阵列头行高
  const ROW_H = 64                     // 矩阵资源行高
  const GAP_MID = 44                   // 矩阵与投入区间距（分隔线下呼吸 20）
  const SEC_H = 48                     // 投入区分组标题行高（标题贴上，下方留 14 呼吸到投入行）
  const INV_H = 96                     // 投入行高（头像 60 居中 + 右列 head/分段条，页面 .invest-row 同构）
  const BOT = 192                      // 底部留白：投入模块下 22 空隙 + 图标带（3+3）
  const N = s.rows.length
  const NM = N + 1                       // 矩阵行数 = 资源行 + 「我的一周」行

  const H = TOP + HEAD_H + COL_H + NM * ROW_H + GAP_MID + SEC_H + N * INV_H + INV_H + BOT

  const k = (opts.windowWidth / W) * Math.min(opts.pixelRatio || 2, 3)
  canvas.width = Math.round(W * k)
  canvas.height = Math.round(H * k)
  const ctx = canvas.getContext('2d')
  ctx.scale(k, k)

  // 画布底色 + 白色成绩卡（页面 .card 同构：内容都在圆角卡里，四周露底色；左右边距 32、上下 24）
  ctx.fillStyle = SHEET_C.bg
  ctx.fillRect(0, 0, W, H)
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.06)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 4
  roundRect(ctx, 32, 24, W - 64, H - 48, 24)
  ctx.fillStyle = SHEET_C.card
  ctx.fill()
  ctx.restore()
  ctx.textBaseline = 'middle'

  // ---- 卡头：品牌徽章 + 标题 + 副行（badge 上下 padding 12，标题副行加大后三段等距 24） ----
  ctx.font = '24px sans-serif'
  const bw = ctx.measureText('QingBa').width + 52
  const bh = 48
  const by = TOP
  roundRect(ctx, W / 2 - bw / 2, by, bw, bh, bh / 2)
  ctx.fillStyle = SHEET_C.brand
  ctx.fill()
  fillCenter(ctx, 'QingBa', W / 2, by + bh / 2 + 1, '24px sans-serif', SHEET_C.white)
  fillCenter(ctx, '一周成绩单', W / 2, TOP + 98, '700 52px sans-serif', SHEET_C.text)
  fillCenter(ctx, `${s.weekLabel}　${s.rangeLabel}`, W / 2, TOP + 163, '30px sans-serif', SHEET_C.text2)
  // 卡头与矩阵的分隔线（页面 .sheet-hero border-bottom 同语义，距内容边同 PAD）
  ctx.strokeStyle = SHEET_C.divider
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, TOP + HEAD_H)
  ctx.lineTo(W - PAD, TOP + HEAD_H)
  ctx.stroke()

  // 矩阵列头前多留呼吸（页面 .grid-cols margin-top 同语义）
  let y = TOP + HEAD_H + 16

  // ---- 打卡矩阵 ----
  ctx.font = '26px sans-serif'
  ctx.fillStyle = SHEET_C.text3
  ctx.textAlign = 'center'
  s.cols.forEach((c, j) => {
    ctx.fillText(c.label, PAD + NAME_W + j * COL_W + COL_W / 2, y + COL_H / 2)
  })
  ctx.textAlign = 'left'
  y += COL_H

  s.rows.forEach(row => {
    const mid = y + ROW_H / 2
    // 头像（色块 + 首字）
    ctx.beginPath()
    ctx.arc(PAD + 18, mid, 18, 0, Math.PI * 2)
    ctx.fillStyle = row.color
    ctx.fill()
    fillCenter(ctx, row.initial, PAD + 18, mid + 1, '600 20px sans-serif', SHEET_C.white)
    // 名称（小一档：26px）
    ctx.font = '26px sans-serif'
    ctx.fillStyle = SHEET_C.text
    ctx.fillText(ellipsis(ctx, row.name, NAME_W - 46), PAD + 46, mid)
    // 七格：打勾绿块 / 空灰块（44×44 圆角 4，页面 .mark 同款）
    row.cells.forEach((c, j) => {
      const cx = PAD + NAME_W + j * COL_W + COL_W / 2
      roundRect(ctx, cx - 22, mid - 22, 44, 44, 4)
      ctx.fillStyle = c.done ? SHEET_C.brand : SHEET_C.cellActive
      ctx.fill()
      if (c.done) fillCenter(ctx, '✓', cx, mid + 1, '600 24px sans-serif', SHEET_C.white)
    })
    y += ROW_H
  })

  // 「我的一周」行：该周整体打卡（当天任一资源打卡即 ✓），绿色头像，与资源行同构
  ctx.beginPath()
  ctx.arc(PAD + 18, y + ROW_H / 2, 18, 0, Math.PI * 2)
  ctx.fillStyle = SHEET_C.brand
  ctx.fill()
  fillCenter(ctx, '周', PAD + 18, y + ROW_H / 2 + 1, '600 20px sans-serif', SHEET_C.white)
  ctx.font = '26px sans-serif'
  ctx.fillStyle = SHEET_C.text
  ctx.fillText(ellipsis(ctx, '我的一周', NAME_W - 46), PAD + 46, y + ROW_H / 2)
  s.mine.cells.forEach((c, j) => {
    const cx = PAD + NAME_W + j * COL_W + COL_W / 2
    roundRect(ctx, cx - 22, y + ROW_H / 2 - 22, 44, 44, 4)
    ctx.fillStyle = c.done ? SHEET_C.brand : SHEET_C.cellActive
    ctx.fill()
    if (c.done) fillCenter(ctx, '✓', cx, y + ROW_H / 2 + 1, '600 24px sans-serif', SHEET_C.white)
  })
  y += ROW_H

  // 矩阵与投入区的分隔线（页面 .matrix border-bottom 同语义：矩阵底 + 24 呼吸）
  ctx.strokeStyle = SHEET_C.divider
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD, y + 24)
  ctx.lineTo(W - PAD, y + 24)
  ctx.stroke()

  y += GAP_MID

  // ---- 本周总投入（标题贴上，与首行投入行之间留呼吸）----
  ctx.font = '28px sans-serif'
  ctx.fillStyle = SHEET_C.text3
  ctx.fillText('本周总投入', PAD, y + 20)
  y += SEC_H

  // 投入行绘制：头像独立左列垂直居中（直径 60 = 页面 60rpx + gap 12），
  // 右列 .invest-body 同构：head 行（名称 + 分级时长）+ 缩进分段条
  // 分段条照页面 .segbar：26rpx 正方块圆角 2 + flex space-between（两端贴齐、间隙自动均分）
  const segSpan = (CW - 72 - 26) / 19
  const drawSegs = (x0, y0, segs, onColor) => {
    segs.forEach((sg, i) => {
      roundRect(ctx, x0 + i * segSpan, y0, 26, 26, 2)
      ctx.globalAlpha = sg.dim ? 0.35 : 1
      ctx.fillStyle = sg.on ? onColor : SHEET_C.cellActive
      ctx.fill()
      ctx.globalAlpha = 1
    })
  }
  // 右对齐分级时长（页面 .min-part/.min-unit：数值大字 text 色 + 单位小字弱化，无「完成」前缀）
  const drawMinutes = (xRight, yC, parts) => {
    ctx.font = '30px sans-serif'
    const vWs = parts.map(p => ctx.measureText(String(p.v)).width)
    ctx.font = '20px sans-serif'
    const uWs = parts.map(p => ctx.measureText(String(p.u)).width)
    let x = xRight - (vWs.reduce((a, b) => a + b, 0) + uWs.reduce((a, b) => a + b, 0))
    parts.forEach((p, i) => {
      ctx.font = '30px sans-serif'
      ctx.fillStyle = SHEET_C.text
      ctx.fillText(String(p.v), x, yC)
      x += vWs[i]
      ctx.font = '20px sans-serif'
      ctx.fillStyle = SHEET_C.text3
      ctx.fillText(String(p.u), x, yC)
      x += uWs[i]
    })
  }
  const drawInvestRow = r => {
    ctx.beginPath()
    ctx.arc(PAD + 30, y + 48, 30, 0, Math.PI * 2)
    ctx.fillStyle = r.color
    ctx.fill()
    fillCenter(ctx, r.initial, PAD + 30, y + 49, '600 26px sans-serif', SHEET_C.white)

    ctx.font = '28px sans-serif'
    ctx.fillStyle = SHEET_C.text
    ctx.fillText(ellipsis(ctx, r.name, CW - 72 - 180), PAD + 72, y + 36)

    drawMinutes(PAD + CW, y + 36, r.parts || [])
    drawSegs(PAD + 72, y + 56, r.segs, r.color)
    y += INV_H
  }
  s.rows.forEach(drawInvestRow)

  // 汇总行：与资源行完全同构（页面已无 margin-top / 分隔线，紧接普通行）
  ctx.beginPath()
  ctx.arc(PAD + 30, y + 48, 30, 0, Math.PI * 2)
  ctx.fillStyle = SHEET_C.brand
  ctx.fill()
  fillCenter(ctx, '周', PAD + 30, y + 49, '600 26px sans-serif', SHEET_C.white)
  ctx.font = '600 28px sans-serif'
  ctx.fillStyle = SHEET_C.text
  ctx.fillText('本周总投入', PAD + 72, y + 36)
  drawMinutes(PAD + CW, y + 36, s.summary.parts || [])
  drawSegs(PAD + 72, y + 56, s.summary.segs, SHEET_C.brand)
  y += INV_H + BOT

  // ---- 盲盒装饰：标题两侧与底部各 3+3，同页面款式与固化的旋转角（spins 顺序与 decoBox SLOTS 一致）----
  const D = 40                         // 图标边长（80rpx，海报上的主角尺寸）
  const drawDeco = (x, y0, rot) => {
    if (!decoImg) return
    ctx.save()
    ctx.translate(x + D / 2, y0 + D / 2)
    ctx.rotate(rot * Math.PI / 180)
    if (s.deco.glow || s.deco.sglow) {  // 隐藏款绿 / 时令限定款珊瑚粉光晕，与页面 drop-shadow 同语义
      ctx.shadowColor = s.deco.sglow ? 'rgba(245, 124, 132, 0.9)' : 'rgba(7, 193, 96, 0.9)'
      ctx.shadowBlur = 12
    }
    ctx.globalAlpha = 0.9
    ctx.drawImage(decoImg, -D / 2, -D / 2, D, D)
    ctx.restore()
  }
  // 顶部：x 为左列距左边；右列镜像。坑位落在标题行两侧空白区（距卡缘 40）
  const DECO_TOP = [[64, 56], [120, 96], [62, 134]]
  DECO_TOP.forEach(([x, ty], i) => {
    drawDeco(x, ty, s.deco.spins[i])
    drawDeco(W - x - D, ty, s.deco.spins[i + 3])
  })
  // 底部：y 相对 BOT 区顶部（x 同步：距卡缘 40）
  const DECO_FOOT = [[64, 26], [120, 62], [62, 98]]
  DECO_FOOT.forEach(([x, dy], i) => {
    drawDeco(x, H - BOT + dy, s.deco.spins[6 + i])
    drawDeco(W - x - D, H - BOT + dy, s.deco.spins[9 + i])
  })
  // 底部图标带中央：水果名 · 稀有度（与页面同文案；两段异色，整串水平居中）
  if (s.deco.name) {
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'left'
    const segTxt = ' · ' + (s.deco.rarityName || '')
    const nameW = ctx.measureText(s.deco.name).width
    const startX = W / 2 - (nameW + ctx.measureText(segTxt).width) / 2
    ctx.fillStyle = SHEET_C.text2
    ctx.fillText(s.deco.name, startX, H - BOT + 82)
    ctx.fillStyle = s.deco.rarity === 'hidden' ? '#b8860b' : (s.deco.rarity === 'seasonal' ? '#e05a64' : (s.deco.rarity === 'rare' ? '#27ae60' : SHEET_C.text2))
    ctx.fillText(segTxt, startX + nameW, H - BOT + 82)
  }

  wx.canvasToTempFilePath({
    canvas,
    success: r => cb(r.tempFilePath, ''),
    fail: err => cb(null, (err && err.errMsg) || '导出失败')
  })
}

module.exports = { buildDailyPoster, buildTrendPoster, buildWeeklySheet }
