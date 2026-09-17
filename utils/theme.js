// 字号档位工具
// 通过给根节点挂 class（.fs-*）改变 CSS 变量 --fs，实现全站字号缩放。
//
// 档位不再由用户在小程序内选择，而是自动跟随「微信 → 我 → 设置 → 通用 > 字体大小」：
// 小程序侧拿不到手机系统的字号，只有微信透传的 fontSizeSetting / fontSizeScaleFactor。
// 各页在 onShow 调用 app.applyFontLevel(this) 重新下发，以覆盖"改完字体切回小程序"的场景
// （官方没有字号变化监听 API，只能这样重读）。
//
// 旧存储 key qingba_font_level 已彻底弃用（不再读写），本地残留值无害。

// 微信字体设置的缩放倍率（「标准」档 = 1）
// wx.getAppBaseInfo 需基础库 2.20.1+；fontSizeScaleFactor 约 2.26.0+ 才有，
// 老基础库用 fontSizeSetting ÷ 平台基准字号折算（Android 16 / iOS 17）
// 注意：fontSizeScaleFactor 的"正常值"就是 1，判断时不能用 if (!x)
function getFontScale() {
  try {
    const info = wx.getAppBaseInfo ? wx.getAppBaseInfo() : wx.getSystemInfoSync()
    if (!info) return 1
    if (typeof info.fontSizeScaleFactor === 'number' && info.fontSizeScaleFactor > 0) {
      return info.fontSizeScaleFactor
    }
    const px = Number(info.fontSizeSetting)
    if (px > 0) {
      const device = wx.getDeviceInfo ? wx.getDeviceInfo() : info
      const base = device && device.platform === 'ios' ? 17 : 16
      return px / base
    }
  } catch (e) {}
  return 1
}

// 当前生效的档位 key —— 四个 key 与各页 CSS 的 .fs-* 规则一一对应：
//   small → .fs-small(0.9) / normal → .fs-normal(1) / large → .fs-large(1.15) / xlarge → .fs-xlarge(1.3)
// 微信自己的档位比这里多，故按区间归并；上限压在 1.3 一档，
// 依据官方《适老化设计指南》的警告：字号过大会导致文字溢出、截断、横向滚动
function getFontLevel() {
  const scale = getFontScale()
  if (scale < 1) return 'small'
  if (scale <= 1.05) return 'normal'
  if (scale <= 1.2) return 'large'
  return 'xlarge'
}

// 根节点的缩放 class，如 fs-large
function getFontClass() {
  return 'fs-' + getFontLevel()
}

// ===== 深色模式 =====
// 完全跟随系统 / 微信主题。导航栏、tabBar、页面背景（含下拉橡皮筋区）已由 app.json 的
// darkmode + theme.json 接管，而那一层是框架级的、JS 改不了；内容区因此也固定挂 dm-auto
// （媒体查询规则写在 app.wxss），保证两层同源。
// 小程序内不再提供手动切换 —— 否则会出现"导航栏跟系统、内容区跟手动档"的割裂。

// 根节点深色 class（固定值）
function getDarkClass() {
  return 'dm-auto'
}

// 当前是否实际处于深色：canvas / JS 侧需要真实判断时使用（CSS 侧一律走 dm-auto）
function isDarkNow() {
  try {
    const info = wx.getAppBaseInfo ? wx.getAppBaseInfo() : wx.getSystemInfoSync()
    return !!(info && info.theme === 'dark')
  } catch (e) {
    return false
  }
}

// 只导出外部实际引用到的（app.js / settings / stats / stage / mine）
module.exports = {
  getFontLevel,
  getFontClass,
  getDarkClass,
  isDarkNow
}
