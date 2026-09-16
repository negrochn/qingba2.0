/**
 * 整页单选列表
 *
 * 数据契约：items 为 [{ key, label, desc? }]
 *   - key   必填，唯一标识，同时作为选中态比较依据
 *   - label 必填，主文本
 *   - desc  可选，副文本（显示为主文本下方一行小灰字）
 *
 * 特殊情况（如「未设置」这类额外项）通过数据表达，组件不做内置分支。
 */
Component({
  properties: {
    items: { type: Array, value: [] },
    value: { type: String, value: '' },
    emptyText: { type: String, value: '' },
  },

  methods: {
    onPick(e) {
      const { key, index } = e.currentTarget.dataset;
      this.triggerEvent('change', {
        key,
        index,
        item: this.data.items[index],
      });
    },
  },
});
