// 分享统一出口：转发给好友（onShareAppMessage）/ 分享到朋友圈（onShareTimeline）
//
// 各页只声明自己的「场景 key」，标题与落地页集中在本文件维护，避免文案散落在各页。
//
// 两条约定：
// 1. 转发给好友的 path 统一落到首页 —— 好友点开就是「欢迎卡 + 选择当前阶段」，
//    不用先读一屏说明；分享者当前所在的页（如统计 / 记录）也不至于把私人数据当落地页。
// 2. 朋友圈只对「关于」页开放 —— 朋友圈打开的是单页模式（无 tabBar、页面不能跳转），
//    只有纯内容页不会出现「点了没反应」的死链，其它页不实现 onShareTimeline。
const HOME_PATH = '/pages/home/home'

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
  about: DEFAULT_TITLE
}

// 转发给好友：可自定义标题，落地路径默认首页
function appMessage(key, options) {
  const opt = options || {}
  const res = {
    title: opt.title || TITLES[key] || DEFAULT_TITLE,
    path: opt.path || HOME_PATH
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
