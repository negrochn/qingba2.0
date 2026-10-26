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

  // ---- 图表（页面 ECharts canvas 导出图原样贴入） ----
  const chartY = cardTop + 32 + headH
  const img = canvas.createImage()
  img.onload = () => {
    ctx.drawImage(img, contentX, chartY, innerW, CHART_H)

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

module.exports = { buildDailyPoster, buildTrendPoster }
