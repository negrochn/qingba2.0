---
name: ui-design-spec
description: 微信小程序 UI 设计规范，基于 WeUI 官方（weui.io / Tencent/weui v2.6.26）的设计令牌与组件原语沉淀。当需要实现微信风格的列表页、设置页、分组卡片、开关、导航栏、按钮、表单、弹窗、徽标等界面，或需要统一配色、字号、间距、圆角、深色模式适配时，使用本规范。This skill should be used when building WeChat-style (WeUI-based) grouped-list / settings / form UIs to keep colors, typography, spacing, radius, and component primitives consistent with WeUI's official design tokens. It also incorporates the official WeChat Mini Program Design Guidelines (developers.weixin.qq.com/miniprogram/design) for design principles, navigation, feedback, and hierarchy.
---

# 微信 UI 设计规范（基于 WeUI 官方）

## Overview
本规范以 **WeUI 官方（https://weui.io，Tencent/weui v2.6.26）** 为权威来源，沉淀微信原生界面的配色、字号、间距、圆角与组件原语（分组卡片、单元格、按钮、表单、开关、导航栏、弹窗、徽标、图标）。WeUI 仓库已克隆至 `D:\github\weui`，`design-tokens.md` / `components.md` 的所有色板、字号、间距、圆角与组件尺寸均**已逐项核对 `src/style` 下的 Less 源**（`base/theme/vars/*`、`base/variable/*`、`widget/*`）。目标是让任何「微信风格」页面在视觉上与 WeUI 保持一致，**不依赖任何项目既有的布局或样式**——但本项目的 `--bg/--card/--text/--brand/--divider` 等 CSS 变量已与 WeUI 对齐（见 `design-tokens.md` §9 映射），可直接当作 WeUI token 的别名使用。

## 何时使用
- 实现微信 / WeUI 风格的列表、设置、详情、表单页。
- 对齐配色、字号、间距、圆角、阴影等视觉参数。
- 做深色模式（`dm-light` / `dm-dark` / `dm-auto`）适配。
- 引入新复用组件，需确认是否符合微信原生观感。
- 需要判断某段样式是否「像微信」。

## 设计原则
1. 所有颜色、字号、间距以 `design-tokens.md` 的 token 为准；禁止硬编码同质值。
2. 优先用项目 `--*` 变量（已对齐 WeUI），确需引用原始变量名时用 `--weui-*`。
3. 字号默认固定 rpx（1px = 2rpx，见 tokens）；如需系统字号缩放再引入 `--fs` 派生。
4. 深色模式只切换变量，不新增独立样式。
5. 列表页先用容器/卡片原语（`.group` 圆角卡片 / `.group-flat` 裸白带），再填 cell 变体。

## 如何使用本规范
1. 任何 UI 改动前，先读 `references/design-tokens.md` 取权威色板、字号、间距、圆角与深色对应。
2. 需要组件结构时，读 `references/components.md` 取按钮、cells/cell、表单、开关、单选/多选、弹窗、导航栏、徽标、图标的 wxml / wxss 范式与本项目已有原语对照。
3. 改动后自检：是否仅用 token？深色模式是否正常？是否复用既有原语？

## 已沉淀的规范要点（摘要，完整见 references）
- **配色**：页面 `#ededed`(BG-0)、卡片 `#fff`(BG-2)、主文字 `rgba(0,0,0,.9)`(FG-0)、次级 `rgba(0,0,0,.55)`(FG-1)、占位 `rgba(0,0,0,.3)`(FG-2)、分隔线 `rgba(0,0,0,.1)`(FG-3)、**品牌绿 `#07c160`(BRAND)**、链接蓝 `#576b95`(LINK)、危险红 `#fa5151`(RED)、橙/黄/蓝 `#fa9d3b`/`#ffc300`/`#10aeff`、蒙层 `rgba(0,0,0,.5)`(OVERLAY)。
- **字号**：导航/主文/按钮 17px(34rpx) 行高 1.41176471；分组标题/tips/次级 14px(28rpx)；描述 12px(24rpx)。
- **间距**：页面边距 16px(32rpx)，cell 内边距 16px(32rpx)，分组标题 padding-top 16px(32rpx)（其 margin-top 已合入 padding，见下「项目实现备注」），按钮区上 48px(96rpx)。
- **圆角**：按钮 8px(16rpx)、mini 6px(12rpx)、弹窗 12px(24rpx)、iOS 分组卡片 20rpx(10pt)；cells 默认无圆角无阴影。
- **分隔线**：本项目用真实 `1rpx`（`scaleY(.5)` 在 cells 通栏线会因偏移导致位置偏差，已弃用）；cell 内线 `left:16px(32rpx)` 缩进、首行无；或本项目 `.cell-divider` 兄弟节点。分组块（如 `.res-list`）用容器 `border-bottom` 通栏分隔相邻分组（展开/折叠均生效），末组去线。
- **按钮**：`.weui-btn` 默认高 48px(96rpx)、圆角 8px；变体 `primary`(BRAND 绿)/`default`(灰底)/`warn`(RED)/`disabled`；尺寸 `medium`(40px)/`mini`(32px)、`block`/`inline`。项目 `.btn` 族高 88rpx（44pt iOS），新按钮沿用。
- **单元格**：`.weui-cell` 内边距 16px(32rpx)、主文 17px(34rpx)；`__bd` flex:1、`__ft` 右对齐 FG-1；`__desc` 12px(24rpx) FG-2。变体 `access`(箭头)/`link`(蓝)/`warn`(红)。项目 `.cell` 家族：`cell--single`(110rpx)/`cell--desc`(146rpx)/`cell-radio`/`cell-check`(iconfont 品牌绿对勾)/`cell-divider`。
- **开关**：原生 `<switch color="#07c160">`；项目自绘 `.switch`（开 `#07c160`/关 `#e9e9e9`）。
- **单选/多选**：选中标记统一品牌绿 `#07c160`（圆底绿勾 / 对勾）。
- **弹窗**：蒙层 OVERLAY；dialog 卡片 `#fff` 圆角 12px，主操作 BRAND；actionsheet 底部上滑、取消独立灰带；toast 反白居中。
- **导航/标签栏**：原生组件，颜色在 `app.json`（导航栏 `#ededed`、tabBar 选中 `#07c160`）。
- **图标**：本项目用自绘 iconfont（`.iconfont` + `.icon-*:before`），对勾 `.icon-check` 走 `var(--brand)`。
- **设计原则 / 交互规范**：四大原则（友好 / 清晰 / 便捷 / 统一）、导航（小程序菜单右上固定且深浅两套、Tab 2–5 建议≤4）、反馈（局部加载优先、同页 ≤1 加载动画、成功 toast 1.5s）、层级（模态阻断 / 弹出不打断）——详见 `references/design-guidelines.md`；量化令牌（22/17/15/14/12pt、热区 7–9mm、设计稿 375/390、弹窗 1.5s 等）见 `design-tokens.md` §7。

## 项目实现备注（与 qingba 代码对齐）
- **字号缩放已落地**：实际页面用 `calc(34rpx * var(--fs,1))` 派生，`--fs` 由根节点 `fs-*` class 切换。
- **自定义胶囊开关 `.switch`**：独立设置页（如深色模式「跟随系统」）用自绘 iOS 胶囊开关，开启 `#07c160`/关闭 `#e9e9e9`、深浅一致；内联设置行仍用原生 `<switch>`。
- **单元格间分隔线（项目实现）**：qingba **不用** `border-bottom`，而是在相邻 cell 间插入兄弟节点 `<view class="cell-divider">`（`height:1rpx; background:var(--divider); margin-left:32rpx;`）；wxml 用 `wx:if="{{i>0}}"` 在 `wx:for` 循环项之间自动插入。`.cell-divider` 与 `.cell` 同级，都放在 `.group-card` 内。
- **`.cell` 行高由 modifier 提供（项目实现）**：qingba 的 `.cell` 基类**不设** `min-height`；行高由 `cell--single`(min-height 110rpx≈55pt) / `cell--desc`(146rpx≈73pt) 提供，每个 `.cell` 必须挂其一，否则无高度。
- **间距工具类 `.mb-16`**：`app.wxss` 提供 `.mb-16 { margin-bottom:16rpx }`，按需扩展 `mb-8`/`mb-24`，用于卡片/分组间统一留白。
- **列表分组间距（项目实现）**：`.weui-cells` 容器**不设 `margin-top`**（避免与上层卡片/分组间距叠加，分组留白改用 `.mb-16` 工具类或父容器 padding 控制）。`.weui-cells__title`（分组标题）的 `margin-top`/`margin-bottom` **均已合入 `padding`**（当前 `padding: 32rpx 32rpx 16rpx`），不再使用任何 margin——目的是让深色模式下卡片背景连续铺满、避免标题上下露出页面底色。新代码如需分组标题与内容之间留白，统一用 `padding` 而非 `margin`。
- **项目 CSS 变量**：`--bg/--card/--text/--text2/--text3/--text4/--divider/--brand/--danger/--cell-active` 对应 WeUI 的 BG-0/BG-2/FG-0/FG-1/FG-2/FG-3/BRAND/RED/BG-COLOR-ACTIVE（见 `design-tokens.md` 末节映射表）。
- **`.group-title` 项目取值（与规范差异）**：全局 `.group-title`（`app.wxss`）`padding: 32rpx 32px 16rpx 32rpx`，**右内边距是 `32px`（像素）而非 `32rpx`**（疑似笔误）；新代码建议统一为 `32rpx`。
- **扁平纯色，禁止渐变 / 外发光（项目约定）**：所有色块 / 标签 / 按钮一律用扁平纯色（`var(--brand)`、固定 HEX 或低透明叠加），**禁止 `linear-gradient` 与 `box-shadow` 外发光**；深色档同理用纯色低透明（如 `rgba(7,193,96,.14)`）替代渐变。
- **`.weui-tag` 不带 margin（项目约定）**：标签间距由父级 flex `gap` 控制，避免与 `tag-group-*` 等内联背景 / 多标签混排时多出右侧空白；新增标签复用全局 `.weui-tag`，不在页面内重复定义。
- **分组容器 `border-bottom` 通栏分隔线（项目约定）**：相邻分组用分组块容器（如 `.res-list`）的 `border-bottom: 1rpx solid var(--divider)` 分隔（展开/折叠均生效），末组 `:last-child` 去线；区别于 cell 内 `left:32rpx` 缩进的行间线。

## Resources
### references/
- `design-tokens.md` — 配色（浅/深）、字号、间距、圆角、分隔线、项目变量映射（单一事实来源）。
- `components.md` — WeUI 组件原语（按钮 / cells·cell / 表单 / 开关 / 单选·多选 / 弹窗 / 导航栏 / 徽标 / 图标）及本项目已有原语对照。
- `design-guidelines.md` — 微信官方设计指南的原则层：四大设计原则、视觉规范指针、导航 / Tab、加载与结果反馈、异常与层级、落地自检清单。

### scripts / assets
（暂不需要）

---
## TODO：待补充
- （已补充）微信官方《小程序设计指南》原则层 → `design-guidelines.md`；量化令牌 → `design-tokens.md` §7。
- （已补充）care 模式（适老/关怀模式）配色档 → `design-tokens.md` §8（来源 `theme/vars/care-*.less`）。
- （已核对）`design-tokens.md` 全部颜色/字号/间距/圆角/组件尺寸已对照 `D:\github\weui\src` 源码订正（含深色 `BG-COLOR-ACTIVE` 改为 `overlay(...)`、dialog 标题字重 500、正文 FG-1 等）。
- 完整 Dialog / ActionSheet / Toast / Half-screen Dialog 的内联 wxml 模板（目前给了 token 与结构范式，精确内边距以 WeUI 源码为准）。
- 滑块（字号实时预览）、滚轮选择器、Gallery、Grid、Steps、Progress、Loading 等组件规范。
- 图标规范（功能图标尺寸 / 风格 / 与 iconfont 字号的协调）。
- 完整 Dialog / ActionSheet / Toast / Half-screen Dialog 的内联 wxml 模板（本 skill 只给了 token 与结构范式，精确内边距以 WeUI 源码为准）。
- 滑块（字号实时预览）、滚轮选择器、Gallery、Grid、Steps、Progress、Loading 等组件规范。
- care 模式（适老/关怀模式）配色档（WeUI `--weui-mode='care'`）。
- 图标规范（功能图标尺寸 / 风格 / 与 iconfont 字号的协调）。
