// 一周成绩单详情页：URL 带 stageId & y & w（列表卡点入）。
// 页面渲染与海报合成共用 utils/weeklySheet.collect 的同一份数据口径
// （打卡 ✓ 不看折算 / 投入折算 effectiveMinutes / 全期首见顺序配色）。
// 进页后台合成白底分享海报（sharePoster.buildWeeklySheet），
// 就绪后底部「保存到相册 / 转发给好友」可用，交互与 shareDetail 同款。

const theme = require('../../utils/theme')
const weeklySheet = require('../../utils/weeklySheet')
const sharePoster = require('../../utils/sharePoster')
const decoBox = require('../../utils/decoBox')

Page({
  data: {
    fontClass: '',
    darkClass: '',
    ready: false,
    emptyText: '',
    weekLabel: '',
    rangeLabel: '',
    cols: [],
    rows: [],
    summary: null,
    preview: ''
  },

  onLoad(options) {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })

    const stageId = (options && options.stageId) || ''
    const y = Number(options && options.y)
    const w = Number(options && options.w)
    const sheet = weeklySheet.collect(stageId, y, w)
    if (sheet.error) {
      this.setData({ emptyText: sheet.error })
      return
    }
    this._sheet = sheet
    this.setData({
      ready: true,
      weekLabel: sheet.weekLabel,
      rangeLabel: sheet.rangeLabel,
      cols: sheet.cols,
      rows: sheet.rows,
      mine: sheet.mine,
      deco: sheet.deco,
      summary: sheet.summary
    })

    // 抽中浮层：该周抽定后首次进入才弹（seen 标记，列表渲染可能已完成抽取固化）；
    // 弹出即置已看，同一周不再弹。带遮罩挡误触，点击任意处可提前关闭；隐藏款多停 1.2s
    if (sheet.deco && sheet.deco.seen === 0) {
      decoBox.markSeen(y, w)
      // 隐藏款/时令限定款是「大惊喜」，浮层多停 1.2s
      const hold = (sheet.deco.glow || sheet.deco.sglow) ? 4200 : 3000
      this._decoPopTimer = setTimeout(() => this.setData({ decoPop: null }), hold)
      this.setData({
        decoPop: {
          fruit: sheet.deco.fruit,
          name: sheet.deco.name,
          glow: sheet.deco.glow,
          sglow: sheet.deco.sglow,
          rarityName: decoBox.RARITY_NAME[sheet.deco.rarity] || '',
          rarity: sheet.deco.rarity,
          hold
        }
      })
    }
  },

  // 点遮罩提前关闭浮层
  onDecoPopTap() {
    if (this._decoPopTimer) { clearTimeout(this._decoPopTimer); this._decoPopTimer = null }
    this.setData({ decoPop: null })
  },

  onUnload() {
    if (this._decoPopTimer) clearTimeout(this._decoPopTimer)
  },

  // 屏外画布就绪后后台合成海报；失败不阻塞浏览（按钮保持置灰）
  onReady() {
    if (!this._sheet || this._sheetBusy) return
    this._sheetBusy = true
    const query = wx.createSelectorQuery()
    query.select('#poster-canvas').fields({ node: true }).exec(res => {
      const node = res && res[0] && res[0].node
      if (!node) { this._sheetBusy = false; return }
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      sharePoster.buildWeeklySheet({
        canvas: node,
        sheet: this._sheet,
        windowWidth: info.windowWidth,
        pixelRatio: info.pixelRatio
      }, (path, err) => {
        this._sheetBusy = false
        if (!path) console.error('weekly sheet build failed:', err)
        this.setData({ preview: path || '' })
      })
    })
  },

  // 转发给好友：拉起微信原生图片分享面板（发出去是图片，不是小程序卡片）
  onForward() {
    if (!this.data.preview) {
      wx.showToast({ title: '分享图生成中，稍后再试', icon: 'none' })
      return
    }
    wx.showShareImageMenu({
      path: this.data.preview,
      fail: () => {} // 用户取消或环境不支持时静默
    })
  },

  // 保存到相册：授权被拒时引导去设置页开启；用户主动取消不打扰
  onSave() {
    if (!this.data.preview) {
      wx.showToast({ title: '分享图生成中，稍后再试', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: this.data.preview,
      success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
      fail: res => {
        const msg = (res && res.errMsg) || ''
        if (/auth|deny|denied/i.test(msg)) {
          wx.showModal({
            title: '需要相册权限',
            content: '保存分享图需要相册权限，请在设置中开启',
            confirmText: '去设置',
            success: r => { if (r.confirm) wx.openSetting() }
          })
        }
      }
    })
  }
})
