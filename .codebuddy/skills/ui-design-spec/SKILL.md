---
name: ui-design-spec
description: 微信（iOS 风格）UI 设计规范，基于微信设置 / 通知 / 听一听等截图逆向整理。当需要实现微信风格的列表页、设置页、分组卡片、开关、导航栏、行外说明等界面，或需要统一配色、字号、间距、深色模式适配时，使用本规范。This skill should be used when building WeChat-style grouped-list / settings UIs to keep colors, typography, spacing, and component primitives consistent with WeChat's native iOS design.
---

# 微信 UI 设计规范（基于截图逆向）

## Overview
本规范仅依据微信 iOS 客户端截图逆向整理，沉淀微信原生界面的配色、字号、间距与组件原语（分组卡片、开关、导航栏、行外说明等）。目标是让任何"微信风格"页面在视觉上与微信保持一致，**不依赖任何项目既有的布局或样式**。

## 何时使用
- 实现微信风格的列表 / 设置 / 详情页。
- 对齐配色、字号、间距、圆角、阴影等视觉参数。
- 做深色模式（`dm-light` / `dm-dark` / `dm-auto`）适配。
- 引入新的复用组件，需确认是否符合微信原生观感。
- 需要判断某段样式是否"像微信"。

## 设计原则
1. 所有颜色、字号、间距以本规范的 token 为准，不引用项目既有 `--bg` / `--card` 等变量。
2. 颜色使用语义化 token（bg / card / text / text-2 / chevron / success / …），禁止硬编码同质值。
3. 字号默认固定 rpx（见 tokens）；如需系统字号缩放，再引入 `--fs` 变量派生。
4. 深色模式只切换变量，不新增独立样式。
5. 做设置类页面时，先选原语（`.group` 圆角卡片 / `.group-flat` 裸白带），再填 cell 变体。

## 如何使用本规范
1. 任何 UI 改动前，先读 `references/design-tokens.md` 取当前权威色板、字号、间距、圆角与深色对应。
2. 需要组件结构时，读 `references/components.md` 取导航栏、`.group` / `.group-flat`、`.cell` 三变体、`.cell-caption`、原生 `<switch>` 的 wxml / wxss 约定。
3. 改动后自检：是否仅用 token？深色模式是否正常？是否复用既有原语？

## 已沉淀的规范要点（摘要，完整见 references）
- 配色：页面 `#EFEFF4`、白底 `#FFF`、主文字 `#000`、次级 `#8E8E93`、箭头 `#C7C7CC`、品牌绿 `#07C160`（微信真机 toggle / 对勾，非 iOS `#34C759`）、关闭 `#e9e9e9`、细分隔线 `#C8C8CD`。
- 字号：导航 34rpx/600，cell 主文 34rpx，次级/描述 28rpx，分组标题 26rpx，caption 28rpx/行高1.5。
- 间距：页面边距 32rpx，组间距 24rpx / 带 caption 48rpx，cell 最小高 88rpx，switch 104×56rpx。
- 圆角卡片 ~20rpx，**无阴影**（靠白/灰对比）。
- 两套原语：`.group`（圆角卡片+标题带）、`.group-flat`（裸白带+行外 caption）。

## 项目实现备注（与 qingba 代码对齐）

- **字号缩放已落地**：实际页面（`fontPicker` / `darkMode` 等）用 `calc(34rpx * var(--fs, 1))` 派生，`--fs` 由根节点 `fs-*` class 切换（`utils/theme.js` + `app.js.applyFontLevel`）。
- **自定义胶囊开关 `.switch`**：独立设置页（如深色模式"跟随系统"）用自绘 iOS 胶囊开关，开启 `#07C160` / 关闭 `#e9e9e9`、深浅一致；内联设置行仍用原生 `<switch>`。结构见 `references/components.md`「原语 12」。
- **绿色取值（picker 对勾）**：`darkMode` 的 `.switch-on` 与 `.cell-check` 用微信品牌绿 `#07C160`（深浅统一）；而 `fontPicker` / `stagePicker` / `importPicker` / `clearPicker` 四个原语3 单选页的 `.cell-check` 统一用 iOS 绿 `#34C759`（深色 `#30D158`，即 `success` token）。两处绿**不一致**，新代码建议统一为 `#07C160`；至少单页内保持一致。详见 `references/design-tokens.md` 末节。
- **单元格间分隔线（项目实现）**：qingba **不用** `border-bottom`，而是在相邻 cell 之间插入兄弟节点 `<view class="cell-divider">`（`height:1rpx; background:var(--divider); margin-left:32rpx;`），首行上方 / 末行下方不加。wxml 用 `wx:if="{{i>0}}"` 在 `wx:for` 循环项之间自动插入，避免手写。`.cell-divider` 与 `.cell` 同级，都放在 `.group-card` 内。
- **项目实例（原语 3 picker-page）**：`stagePicker`（当前阶段）、`fontPicker`（字体大小）、`importPicker`（导入方式：覆盖式/合并式）、`clearPicker`（清空范围：全部数据 + 各阶段）。设置页「字体大小」「当前阶段」「导入备份」「清空数据」均以 `wx.navigateTo` 跳转到对应 picker 页，选完 `navigateBack` 回调设置页方法。
- **默认勾选**：`stagePicker` 默认勾选当前已设值；`importPicker` / `clearPicker` 默认**不勾选**（`selectedKey:''`），进入即空选、需用户点选——两种均属原语3 合法形态。
- **项目 CSS 变量**：`--bg/--card/--text/--text2/--text3/--divider/--cell-active` 对应规范 token `bg/card/text`、`text-2`+`caption`、`divider-row`、按下态。

## Resources
### references/
- `design-tokens.md` — 配色、字号、间距、圆角、深色对应（单一事实来源）。
- `components.md` — 微信组件原语（导航栏 / group / group-flat / cell 三变体 / caption / switch）。

### scripts / assets
（暂不需要）

---
## TODO：待补充
- 截图未覆盖的组件：tabBar、弹层 / 模态、搜索框、空状态、加载 / 骨架屏、表单输入、列表头像等（需更多截图）。
- caption 超过 2 行的处理约定。
- 字号系统缩放方案（是否引入 `--fs`）。
- 图标规范（功能图标尺寸 / 风格）。
