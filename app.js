const theme = require('./utils/theme.js')

App({
  onLaunch() {
    // 读取系统深色偏好（auto 模式时跟随系统）
    try {
      const info = wx.getSystemInfoSync()
      this._systemDark = info.theme === 'dark'
    } catch (e) {
      this._systemDark = false
    }
    this.globalData.fontLevel = theme.getFontLevel()
    this.globalData.darkMode = theme.getDarkMode()
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
  // 同时应用深色模式 class 与系统栏配色
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
    this.applyChrome()
  },

  // 导航栏 + tabBar 配色跟随深色模式
  applyChrome() {
    const isDark = theme.isDarkMode(this._systemDark)
    wx.setNavigationBarColor({
      frontColor: isDark ? '#ffffff' : '#000000',
      backgroundColor: isDark ? '#111111' : '#ededed',
      fail: () => {}
    })
    wx.setTabBarStyle({
      backgroundColor: isDark ? '#111111' : '#ffffff',
      borderStyle: isDark ? 'black' : 'white',
      color: isDark ? '#8a8f99' : '#999999',
      selectedColor: '#4a90d9',
      fail: () => {}
    })
  },

  globalData: {
    // 首页"去打卡"跳路线页时置为 true，路线页 onShow 后滚动到当前阶段并复位
    scrollToCurrentStage: false,
    fontLevel: theme.DEFAULT_LEVEL,
    darkMode: theme.DEFAULT_DARK_MODE
  }
})
