const theme = require('./utils/theme.js')
const checkin = require('./utils/checkin.js')
const children = require('./utils/children.js')

App({
  onLaunch() {
    // 多孩初始化：保证孩子列表与当前孩子 id 恒有效（无列表时创建主孩子「宝宝」）
    try {
      children.ensureInit()
    } catch (e) {
      console.error('孩子列表初始化失败', e)
    }
    // 多孩迁移：旧单孩数据一次性落入主孩子槽位（幂等；读路径另有兜底双保险）
    try {
      checkin.migrateLegacyData()
    } catch (e) {
      console.error('多孩数据迁移失败', e)
    }
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
  // 下发两个 class：
  //   fontClass —— fs-*，跟随「微信 → 我 → 设置 → 通用 → 字体大小」
  //   darkClass —— 固定 dm-auto（内容区跟随系统深色）
  // 导航栏 / tabBar / 页面背景（含下拉/上拉橡皮筋区）已交给 app.json + theme.json
  // 的微信原生 darkmode 配置，不再用 JS 覆盖
  // 字号与主题都没有变化监听 API，所以各页 onShow 重新调用一次，
  // 覆盖"用户去微信里改完设置、切回小程序"的场景
  applyFontLevel(page) {
    if (page && typeof page.setData === 'function') {
      page.setData({
        fontClass: theme.getFontClass(),
        darkClass: theme.getDarkClass()
      })
    }
  },

  globalData: {
    // 首页"去打卡"跳路线页时置为 true，路线页 onShow 后滚动到当前阶段并复位
    scrollToCurrentStage: false
  }
})
