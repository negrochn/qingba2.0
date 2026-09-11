// 分组色值集中管理
// 与 pages/records/records.wxss 的 .tag-group-* 及 app.wxss 深色适配保持一致：
// 浅色取标签「文字色」（即色块主色），深色取对应提亮后的等价色。
// 这些色值是 Ant Design 色板（非 WeUI 原生色板），详见统计详情页改造说明。

const GROUP_COLORS_LIGHT = {
  main_picture_books:   '#1a5fb0',
  main_graded_readers:  '#4a26a8',
  main_animations:      '#c4390e',
  sub_graded_readers:   '#006d75',
  sub_animations:       '#b0156e',
  fun_extensions:       '#389e0d',
  science_extensions:   '#ad6800',
  fusion_apps:          '#531dab'
}

const GROUP_COLORS_DARK = {
  main_picture_books:   '#7fb4f7',
  main_graded_readers:  '#b39df5',
  main_animations:      '#ff9c6e',
  sub_graded_readers:   '#5cd3dc',
  sub_animations:       '#ff9ecb',
  fun_extensions:       '#95de64',
  science_extensions:   '#ffd666',
  fusion_apps:          '#b37feb'
}

const DEFAULT_LIGHT = '#999999'
const DEFAULT_DARK = '#8e8e93'

// 取分组主色（用于色块 / 环形图扇区填充）
// @param {string} key groupKey（空值按 default 处理）
// @param {boolean} isDark 是否深色模式
function getGroupColor(key, isDark) {
  const map = isDark ? GROUP_COLORS_DARK : GROUP_COLORS_LIGHT
  return map[key] || (isDark ? DEFAULT_DARK : DEFAULT_LIGHT)
}

module.exports = {
  GROUP_COLORS_LIGHT,
  GROUP_COLORS_DARK,
  DEFAULT_LIGHT,
  DEFAULT_DARK,
  getGroupColor
}
