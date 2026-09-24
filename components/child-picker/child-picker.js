/**
 * 切换孩子弹层（纯切换，无管理入口）
 *
 * 视觉对齐「目标时长弹窗」的卡片质感：half-sheet 外壳 + form-card 卡片 +
 * weui-divider 分节（见 app.wxss「弹层表单」）；交互保持点选即切——
 * 点行即切换 + toast「已切换到 xx」，当前项品牌绿对勾，
 * 切换成功后 triggerEvent('changed')。管理入口收敛在 设置 → 孩子管理。
 *
 * 用法：
 *   <child-picker
 *     show="{{childSheetVisible}}"
 *     font-class="{{fontClass}}"
 *     dark-class="{{darkClass}}"
 *     bind:close="closeChildSheet"
 *     bind:changed="onChildChanged" />
 */
const children = require('../../utils/children.js')
const checkin = require('../../utils/checkin.js')

// 分钟 -> 小时文本（去尾零，与首页统计卡同口径）
function fmtHours(minutes) {
  const v = Number(minutes) / 60
  if (!v) return '0'
  return v % 1 === 0 ? String(v) : v.toFixed(1)
}

Component({
  options: {
    // apply-shared：接收页面样式（.cp-av / .form-card / .weui-divider 等全局原语）
    styleIsolation: 'apply-shared'
  },

  properties: {
    show: { type: Boolean, value: false },
    fontClass: { type: String, value: '' },
    darkClass: { type: String, value: '' }
  },

  data: {
    // [{ id, name, initial, color, summaryText, active }]
    items: []
  },

  observers: {
    show(v) {
      // 每次打开重建：摘要与当前项都要反映最新状态
      if (v) this._build()
    }
  },

  methods: {
    _build() {
      const list = children.getChildren()
      const activeId = children.getActiveChildId()
      const items = list.map(c => {
        const s = checkin.getChildSummary(c.id)
        return {
          id: c.id,
          name: c.name,
          initial: String(c.name || '').trim().charAt(0) || '·',
          color: c.color,
          summaryText: s.count > 0
            ? `今日 ${s.todayCount} 次 · 累计 ${fmtHours(s.minutes)} 小时`
            : '还未开始打卡',
          active: c.id === activeId
        }
      })
      this.setData({ items })
    },

    onPick(e) {
      const id = e.currentTarget.dataset.id
      const hit = this.data.items.find(it => it.id === id)
      if (!hit) return
      if (hit.active) {
        this.triggerEvent('close')
        return
      }
      const res = children.switchChild(id)
      if (!res.ok) {
        wx.showToast({ title: res.error || '切换失败', icon: 'none' })
        return
      }
      wx.showToast({ title: `已切换到${hit.name}`, icon: 'none' })
      this.triggerEvent('changed', { id })
      this.triggerEvent('close')
    },

    onClose() {
      this.triggerEvent('close')
    }
  }
})
