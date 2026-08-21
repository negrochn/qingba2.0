const { routeData, resourceLabels } = require('../../utils/data.js')

Page({
  data: {
    stage: null,
    resourceLabels: resourceLabels,
    resourceGroups: []
  },

  onLoad(options) {
    const index = Number(options.index)
    const stage = routeData.stages[index]
    if (!stage) return

    // 将 resources 对象按固定顺序转为数组（便于渲染，过滤空数组）
    const order = [
      'main_picture_books', 'main_graded_readers', 'main_animations',
      'sub_graded_readers', 'sub_animations',
      'fun_extensions', 'science_extensions', 'fusion_apps'
    ]
    const groups = []
    order.forEach(k => {
      const list = stage.resources[k]
      if (list && list.length) {
        groups.push({ key: k, label: resourceLabels[k] || k, items: list })
      }
    })

    wx.setNavigationBarTitle({ title: stage.stage_name })

    this.setData({
      stage: stage,
      resourceGroups: groups
    })
  }
})
