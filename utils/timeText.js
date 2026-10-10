// 智能时间格式（微信口径）：备份时间的展示统一收口在此
//   今天     → 今天 14:11
//   昨天     → 昨天 22:30
//   今年     → 10月8日 20:35
//   跨年     → 2025年12月3日（不带时分：久远备份的几点几分无意义，年份防歧义）
// 自然日按手机本地日历判断；ts 非法时返回 ''

function formatSmart(ts) {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  // 按自然日零点计算日历差（不受两日之间跨夏令时等因素干扰）
  const dayStart = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diffDays = Math.round((dayStart(now) - dayStart(d)) / 86400000)

  if (diffDays === 0) return `今天 ${hm}`
  if (diffDays === 1) return `昨天 ${hm}`
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

module.exports = {
  formatSmart
}
