const theme = require('./utils/theme.js')
// iconfont 字族以 base64 data URI 内联注册（见 loadIconFont）；避免 WXSS @font-face 本地路径被开发者工具拦截
const iconfontDataUri = 'data:font/woff;base64,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'

App({
  onLaunch() {
    // 读取系统深色偏好（auto 模式时跟随系统）；getSystemInfoSync 已弃用，改用 getAppBaseInfo（旧基础库回退）
    try {
      const getBaseInfo = wx.getAppBaseInfo || wx.getSystemInfoSync
      const info = getBaseInfo()
      this._systemDark = info.theme === 'dark'
    } catch (e) {
      this._systemDark = false
    }
    this.globalData.fontLevel = theme.getFontLevel()
    this.globalData.darkMode = theme.getDarkMode()
    this.initUpdateManager()
    this.loadIconFont()
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

  // 运行时加载 iconfont 字体：WXSS @font-face 的本地相对路径会被开发者工具/真机拦截，
  // 故改用 wx.loadFontFace 以 base64 data URI 注册 'iconfont' 字族（见上方 iconfontDataUri 常量）
  loadIconFont() {
    if (typeof wx.loadFontFace !== 'function') return
    wx.loadFontFace({
      family: 'iconfont',
      source: 'url("' + iconfontDataUri + '")',
      success() {},
      fail(err) { console.warn('[iconfont] loadFontFace failed:', err) }
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
      backgroundColor: isDark ? '#111111' : '#f5f5f5',
      borderStyle: isDark ? 'black' : 'white',
      color: isDark ? '#8a8f99' : '#191919',
      selectedColor: '#00c25f',
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
