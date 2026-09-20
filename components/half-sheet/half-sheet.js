/**
 * 通用半屏弹层（bottom half-screen sheet）
 *
 * 只负责「外壳」：蒙层 + 面板 + 抓手 + 头部（标题 / 关闭）+ 可选的底部操作区容器。
 * 内容与操作区的样式一律由使用方页面（或全局原语）负责 —— slot 内容由页面编译，
 * 组件 wxss 默认不作用于它（样式隔离 isolated），所以这里不提供任何内容级样式。
 *
 * 用法：
 *   <half-sheet
 *     show="{{showSheet}}"
 *     title="常规1 目标时长"
 *     font-class="{{fontClass}}"
 *     dark-class="{{darkClass}}"
 *     footer="{{true}}"
 *     bind:close="closeSheet">
 *     <!-- 默认 slot：内容 -->
 *     <view class="form-card">...</view>
 *     <!-- footer slot：操作区（需显式声明 footer="{{true}}"） -->
 *     <view slot="footer" class="weui-btn-area_inline">
 *       <button class="weui-btn weui-btn_default" bindtap="closeSheet">取消</button>
 *       <button class="weui-btn weui-btn_primary" bindtap="submit">确定</button>
 *     </view>
 *   </half-sheet>
 *
 * ⚠️ 组件要「常驻挂载 + show 切 class」，不要用 wx:if 包住整个组件：
 *    弹层关闭后内容仍在，打卡弹窗里已填的时长 / 备注才不会丢。
 *    隐藏由内部两态完成：shown 控滑入与蒙层，hidden 用 display:none 把整块移出渲染树 ——
 *    真机上 input 由原生层绘制、不吃 visibility 与 transform，只靠后两者会留下 placeholder 残影。
 *
 * ⚠️ 操作区的按钮等宽不需要组件参与：全局 app.wxss 已有
 *    `.weui-btn-area_inline .weui-btn { flex: 1; max-width: none; margin: 0 }`。
 */
Component({
  options: {
    // 默认 slot + footer slot，必须开启多 slot
    multipleSlots: true,
    // apply-shared：让使用方（页面 / 父组件）的样式能作用到本组件内部 ——
    // 否则 sheet-class 传进来的定制类（如 resource-picker 的高度档 / 内边距归零）不生效。
    // 单向下行，组件自身的样式不会外泄；组件内部类统一 hsc- 前缀，不会与使用方撞名
    styleIsolation: 'apply-shared'
  },

  properties: {
    show: { type: Boolean, value: false },
    title: { type: String, value: '' },
    showClose: { type: Boolean, value: true },
    // 点蒙层是否关闭（默认关闭；内容里有二次确认流程的弹层可关掉）
    maskClosable: { type: Boolean, value: true },
    // 浮层挂在 .container 之外，拿不到 dm-* / fs-* 变量，必须由页面显式传入
    fontClass: { type: String, value: '' },
    darkClass: { type: String, value: '' },
    // 面板的额外类：高度档 / 圆角等由使用方定制（如 resource-picker 的 h8 / h9）
    sheetClass: { type: String, value: '' },
    // 是否渲染底部操作区容器：slot 内容无法在组件内探测，只能显式声明
    footer: { type: Boolean, value: false }
  },

  data: {
    // 显示态 / 隐藏态分成两态（原因见 wxss 的 .hsc-hidden 注释）：
    //   shown —— 滑入 + 蒙层；
    //   hidden —— display:none，把整块（含原生输入框）从渲染树里移除
    shown: false,
    hidden: true
  },

  observers: {
    show(v) {
      if (this._timer) { clearTimeout(this._timer); this._timer = null }

      if (v) {
        // 先摘掉 display:none，隔一帧再挂显示态，滑入过渡才会生效
        this.setData({ hidden: false }, () => {
          this._timer = setTimeout(() => {
            this._timer = null
            if (this.data.show) this.setData({ shown: true })
          }, 20)
        })
        return
      }

      this.setData({ shown: false })
      // 等滑出动画（0.25s）走完，再真正移出渲染树
      this._timer = setTimeout(() => {
        this._timer = null
        this.setData({ hidden: true })
      }, 260)
    }
  },

  lifetimes: {
    detached() {
      if (this._timer) { clearTimeout(this._timer); this._timer = null }
    }
  },

  methods: {
    noop() {},

    onMaskTap() {
      if (!this.data.maskClosable) return
      this.triggerEvent('close')
    },

    onClose() {
      this.triggerEvent('close')
    }
  }
})
