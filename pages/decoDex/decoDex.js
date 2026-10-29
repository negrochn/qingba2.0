// 我的图鉴详情页：盲盒水果收集总览（iHour「我的成就」式分组列表 + 线索文案）。
// 数据源 utils/decoBox.collection()：20 槽位按档分组 + 各槽抽中次数，组序已按稀有度递进；
// 未解锁不露真身（灰 ? 占位），行尾线索贴真实规则——常驻「开盒可得」、限定「仅N月开出」（窗口外不入池）、
// 隐藏「开盒极稀有」（无门槛纯低概率）。

const theme = require('../../utils/theme')
const decoBox = require('../../utils/decoBox')

Page({
  data: {
    fontClass: '',
    darkClass: '',
    got: 0,
    total: 0,
    groups: []
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    this.setData({ darkClass: theme.getDarkClass() })
    // 抽盒发生在成绩单页，返回/进页都重算
    this._refresh()
  },

  // 行尾线索：已收集 ×N；未收集常驻「开盒可得」、限定「仅N月开出」、隐藏「开盒极稀有」
  _statusOf(s, tierKey) {
    if (s.got) return '×' + s.count
    if (s.month) return '仅' + s.month + '月开出'
    return tierKey === 'hidden' ? '开盒极稀有' : '开盒可得'
  },

  // 聚合 + 行模型：未解锁名字直接置「？？？」，真名不进渲染数据（不露真身贯彻到 setData）
  _refresh() {
    const dex = decoBox.collection()
    const groups = dex.groups
      .map(g => ({
        key: g.key,
        name: g.name,
        got: g.got,
        total: g.slots.length,
        items: g.slots.map(s => ({
          f: s.f,
          name: s.got ? s.name : '？？？',
          got: s.got,
          sub: s.got ? s.firstWeek + '入册' : '',
          status: this._statusOf(s, g.key)
        }))
      }))
    this.setData({ got: dex.got, total: dex.total, groups })
  }
})
