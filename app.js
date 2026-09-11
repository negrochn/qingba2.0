const theme = require('./utils/theme.js')
const checkin = require('./utils/checkin.js')

App({
  onLaunch() {
    this.globalData.fontLevel = theme.getFontLevel()
    this.globalData.darkMode = theme.getDarkMode()
    // 官方资源 id 化：把老的「资源名」key 一次性迁移为「资源 id」key（幂等，重复调用无副作用）
    try {
      checkin.migrateResourceKeysToId()
    } catch (e) {
      console.error('资源 key 迁移失败', e)
    }
    this.initUpdateManager()
  },

  // 微信小程序版本更新检查：新版本就绪时提示并重启应用（不会清除本地数据）
  initUpdateManager() {
    if (!wx.canIUse('getUpdateManager')) return
    const updateManager = wx.getUpdateManager()

    updateManager.onUpdateReady(() => {
      wx.showModal({
        title: '版本更新',
        content: '新版本已就绪，重启应用后即可使用，不会清除任何数据',
        showCancel: false,
        confirmText: '立即更新',
        success(res) {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })

    updateManager.onUpdateFailed(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本下载失败，请检查网络后重新打开小程序',
        showCancel: false
      })
    })
  },

  // 在页面 onLoad / onShow 中调用：getApp().applyFontLevel(this)
  // 仅下发字号 + 内容区深色模式 class（dm-light / dm-dark / dm-auto）
  // 导航栏 / tabBar / 页面背景（含下拉/上拉橡皮筋区）已交给 app.json + theme.json
  // 的微信原生 darkmode 配置，不再用 JS 覆盖
  applyFontLevel(page) {
    const level = theme.getFontLevel()
    const darkMode = theme.getDarkMode()
    this.globalData.fontLevel = level
    this.globalData.darkMode = darkMode
    if (page && typeof page.setData === 'function') {
      page.setData({
        fontClass: theme.getFontClass(),
        fontLevelIndex: theme.getFontLevelIndex(),
        darkClass: theme.getDarkClass()
      })
    }
  },

  globalData: {
    // 首页"去打卡"跳路线页时置为 true，路线页 onShow 后滚动到当前阶段并复位
    scrollToCurrentStage: false,
    fontLevel: theme.DEFAULT_LEVEL,
    darkMode: theme.DEFAULT_DARK_MODE
  }
})
