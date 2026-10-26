// 分享详情页：从「我的统计」进入，选择要导出的统计图类型（每日统计 / 投入趋势 / 投入分布）。
// 分享图由「我的统计」页生成（图表 canvas 与合成画布都在那里）——本页经页面栈拿到
// myStats 实例调 buildShareImages，逐张回传后按当前选中类型展示预览；
// 支持保存到相册（授权兜底）与转发给好友（wx.showShareImageMenu 拉起微信原生面板直接发图片，
// 不是小程序卡片）。

const theme = require('../../utils/theme')

const TYPE_DEFS = [
  { key: 'daily', name: '每日统计' },
  { key: 'trend', name: '投入趋势' },
  { key: 'dist', name: '投入分布' }
]

Page({
  data: {
    fontClass: '',
    darkClass: '',
    typeList: TYPE_DEFS,
    type: 'daily',
    preview: '',
    generating: false,
    error: '',
    disabledTip: ''
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })
    this._items = {}
    // 本页的分享路径是「发图片」，右上角菜单的小程序卡片转发无意义，直接隐藏
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })

    const pages = getCurrentPages()
    const stats = pages[pages.length - 2]
    if (!stats || typeof stats.buildShareImages !== 'function') {
      // 分享图片消息自带的「打开小程序」会冷启动直达本页（页面栈只有自己），
      // 没有生成环境——重定向到「我的统计」页，而不是报错
      wx.redirectTo({ url: '/pages/myStats/myStats' })
      return
    }
    this.setData({ generating: true })
    stats.buildShareImages(items => {
      this._items = items || {}
      this.setData({
        generating: false,
        typeList: TYPE_DEFS.map(d => ({
          ...d,
          disabled: !!(this._items[d.key] && this._items[d.key].disabled)
        }))
      })
      this._applyPreview()
    })
  },

  onPickType(e) {
    const key = e.currentTarget.dataset.type
    if (!key || key === this.data.type) return
    const it = this._items[key]
    if (it && it.disabled) {
      wx.showToast({ title: '该统计还没有打卡记录', icon: 'none' })
      return
    }
    this.setData({ type: key })
    this._applyPreview()
  },

  // 按当前选中类型刷新预览 / 错误 / 置灰提示
  _applyPreview() {
    const it = this._items[this.data.type] || {}
    this.setData({
      preview: it.path || '',
      error: it.error || '',
      disabledTip: it.disabled ? '该统计还没有打卡记录' : ''
    })
  },

  // 转发给好友：拉起微信原生图片分享面板，把分享图直接发给好友（发出去是图片，不是小程序卡片）
  onForward() {
    const it = this._items[this.data.type] || {}
    if (!it.path) {
      wx.showToast({ title: '分享图尚未生成', icon: 'none' })
      return
    }
    wx.showShareImageMenu({
      path: it.path,
      fail: () => {} // 用户取消或环境不支持时静默
    })
  },

  // 保存到相册：授权被拒时引导去设置页开启；用户主动取消不打扰
  onSave() {
    const it = this._items[this.data.type] || {}
    if (!it.path) {
      wx.showToast({ title: '分享图尚未生成', icon: 'none' })
      return
    }
    wx.saveImageToPhotosAlbum({
      filePath: it.path,
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
