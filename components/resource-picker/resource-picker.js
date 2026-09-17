/**
 * 资源选择器（底部半屏弹层，双列：左分组 / 右资源）
 *
 * 为什么双列而不是逐级下钻：切换分组点左边即可，不用返回上一级；
 * 常规1 只有 6 个分组，双列能一次看全。
 *
 * 用法：
 *   <resource-picker
 *     show="{{pickerShow}}" stage-id="{{selectedStageId}}" value="{{pickerValue}}"
 *     font-class="{{fontClass}}" dark-class="{{darkClass}}"
 *     bind:change="onResourceChange"
 *     bind:close="onPickerClose" />
 *
 * 输出：change → { resourceId, resourceName, groupKey, groupLabel, custom }
 *   —— 分组随资源一起带出，调用方不必再单独选分组
 */
const resources = require('../../utils/resources.js')

Component({
  properties: {
    show: { type: Boolean, value: false },
    stageId: { type: String, value: '' },
    value: { type: String, value: '' }, // 当前行已选 resourceId，用于高亮
    // 浮层在 .container 之外，拿不到 dm-* / fs-* 变量，必须由页面显式传入
    fontClass: { type: String, value: '' },
    darkClass: { type: String, value: '' }
  },

  data: {
    groups: [],          // [{ key, label }]
    activeGroupKey: '',
    items: []            // [{ id, name, groupKey, groupLabel, custom }]
  },

  lifetimes: {
    attached() {
      this._load()
    }
  },

  observers: {
    show(v) {
      if (v) this._load()
    },
    stageId() {
      this._load()
    }
  },

  methods: {
    noop() {},

    // 拉取该阶段的全部资源（官方 + 自定义），并定位默认分组
    _load() {
      const stageId = this.data.stageId
      const map = resources.getStageResources(stageId) || {}
      const groupKeys = resources.getStageGroupKeys(stageId) || []

      const groups = groupKeys.map(k => ({ key: k, label: resources.getGroupLabel(k) }))

      const all = []
      groups.forEach(g => {
        const list = map[g.key] || []
        list.forEach(it => {
          all.push({
            id: it.id,
            name: it.name,
            custom: !!it.custom,
            groupKey: g.key,
            groupLabel: g.label
          })
        })
      })
      this._all = all

      // 分组定位优先级：当前已选资源所在分组 → 上次选过的分组 → 第一个分组
      let activeGroupKey = ''
      if (this.data.value) {
        const hit = all.find(it => it.id === this.data.value)
        if (hit) activeGroupKey = hit.groupKey
      }
      if (!activeGroupKey && this._lastGroupKey && groupKeys.indexOf(this._lastGroupKey) >= 0) {
        activeGroupKey = this._lastGroupKey
      }
      if (!activeGroupKey) activeGroupKey = groupKeys[0] || ''

      this.setData({ groups, activeGroupKey })
      this._refreshItems()
    },

    // 只展示当前分组的资源
    _refreshItems() {
      this.setData({
        items: this._all.filter(it => it.groupKey === this.data.activeGroupKey)
      })
    },

    onSwitchGroup(e) {
      const key = e.currentTarget.dataset.key
      if (!key || key === this.data.activeGroupKey) return
      this._lastGroupKey = key
      this.setData({ activeGroupKey: key })
      this._refreshItems()
    },

    onPickItem(e) {
      const id = e.currentTarget.dataset.id
      const hit = (this.data.items || []).find(it => it.id === id)
      if (!hit) return
      this._lastGroupKey = hit.groupKey
      this.triggerEvent('change', {
        resourceId: hit.id,
        resourceName: hit.name,
        groupKey: hit.groupKey,
        groupLabel: hit.groupLabel,
        custom: !!hit.custom
      })
    },

    onCancel() {
      this.triggerEvent('close')
    }
  }
})
