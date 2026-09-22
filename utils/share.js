// 分享统一出口：转发给好友（onShareAppMessage）/ 分享到朋友圈（onShareTimeline）
//
// 各页只声明自己的「场景 key」，标题与落地页集中在本文件维护，避免文案散落在各页。
//
// 三条约定：
// 1. 转发给好友的 path 统一落到首页 —— 好友点开就是「欢迎卡 + 选择当前阶段」，
//    不用先读一屏说明；分享者当前所在的页（如统计 / 记录）也不至于把私人数据当落地页。
// 2. 朋友圈只对两个路线介绍页开放（常规 / 大循环）—— 朋友圈打开的是单页模式（无 tabBar、页面不能跳转），
//    只有纯内容页不会出现「点了没反应」的死链，其它页不实现 onShareTimeline。
// 3. 转发路径统一追加 isShowSplashAd=false —— 新用户从分享进来时不要弹封面广告（开屏），
//    第一眼应该是欢迎卡引导。官方「封面广告播控」支持该参数；限制：仅对支持自定义路径的场景
//    生效（如单聊 / 群聊消息卡片），需安卓微信 8.0.37+ / iOS 8.0.40+ / 基础库 2.32.3+，
//    旧版本客户端仍可能展示；未开通封面广告时该参数同样无害。
const HOME_PATH = '/pages/home/home'
const NO_SPLASH_AD = 'isShowSplashAd=false'

// 追加「不展示封面广告」参数：路径已有 query 时用 & 拼接，已带该参数则不重复追加
function _withoutSplashAd(path) {
  if (!path) return path
  if (path.indexOf('isShowSplashAd') >= 0) return path
  return path + (path.indexOf('?') >= 0 ? '&' : '?') + NO_SPLASH_AD
}

// 兜底标题（场景未覆盖时使用）
const DEFAULT_TITLE = '庆爸2.0 · 3-4岁英语听力路线与打卡记录'

// 各页默认标题
const TITLES = {
  home: DEFAULT_TITLE,
  route: '庆爸听力线 · 7 个阶段的进阶路线图',
  stage: '陪孩子练英语听力 · 阶段资源清单',
  records: '陪孩子练英语听力 · 每天的打卡都在这里',
  stats: '陪孩子练英语听力 · 用数据看时间投入',
  mine: DEFAULT_TITLE,
  about: DEFAULT_TITLE,
  aboutBigloop: '庆爸2.0 · 大循环路线（虚构类）介绍'
}

// 转发给好友：可自定义标题，落地路径默认首页
function appMessage(key, options) {
  const opt = options || {}
  const res = {
    title: opt.title || TITLES[key] || DEFAULT_TITLE,
    path: _withoutSplashAd(opt.path || HOME_PATH)   // 见头部约定 3：分享进入时不弹封面广告
  }
  if (opt.imageUrl) res.imageUrl = opt.imageUrl
  return res
}

// 分享到朋友圈：接口不接受自定义 path（页面即当前页），只能改标题 / 附加 query
function timeline(key, options) {
  const opt = options || {}
  const res = { title: opt.title || TITLES[key] || DEFAULT_TITLE }
  if (opt.query) res.query = opt.query
  if (opt.imageUrl) res.imageUrl = opt.imageUrl
  return res
}

module.exports = {
  appMessage,
  timeline,
  HOME_PATH,
  DEFAULT_TITLE
}
