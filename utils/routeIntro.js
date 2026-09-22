// 路线介绍页（about / about-bigloop）共用的视图模型组装：
// 把路线 stages 终稿转换为「阶段参考 + 逐阶段素材与要点」两节所需的展示结构。
// 只取官方素材——不并自定义资源、不参与打卡，故不走 resources.getStageGroups；
// 熏听等程序占位分组（空数组）自动跳过，不在介绍页出现。
const { GROUP_ORDER, getGroupLabel } = require('./resources.js')

// 官方 resources 对象 → 有序分组视图模型：分组按 GROUP_ORDER 排，非标准 key 殿后兜底
//（同 resources.getStageGroupKeys 的排序规则）
function buildGroups(resources) {
  const res = resources || {}
  const keys = Object.keys(res).filter(k => Array.isArray(res[k]) && res[k].length)
  const ordered = GROUP_ORDER.filter(k => keys.indexOf(k) >= 0)
  keys.forEach(k => { if (ordered.indexOf(k) < 0) ordered.push(k) })
  return ordered.map(key => ({
    key,
    label: getGroupLabel(key),
    itemsText: res[key].map(it => it.name).join('、')
  }))
}

// 关键要点统一为片段结构（与 stage 页视图层同一渲染通道，segs 行内高亮）：
// 大循环条目自带 segments（数据层「**」标记已解析）；常规条目为 {text, highlighted}
// 整条高亮，折算为唯一片段；两者皆无则纯文本单段
function toKpSegs(kp) {
  if (kp.segments && kp.segments.length) return kp.segments
  return [{ t: kp.text, hi: !!kp.highlighted }]
}

// stages → 视图模型数组：阶段参考（时间/准入/晋级/可选）+ 素材分组 + 要点片段
function buildStageVms(stages) {
  return (stages || []).map(s => ({
    stage_name: s.stage_name,
    time_investment: s.time_investment,
    entry_requirement: s.entry_requirement,
    promotion_standard: s.promotion_standard,
    optional: !!s.optional,
    groups: buildGroups(s.resources),
    keyPoints: (s.key_points || []).map(kp => ({ text: kp.text, segs: toKpSegs(kp) }))
  }))
}

module.exports = { buildGroups, buildStageVms }
