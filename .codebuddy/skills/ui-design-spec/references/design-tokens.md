# WeUI 设计令牌（design-tokens.md）

> **权威来源**：Tencent/weui 仓库（`D:\github\weui`，主干 `src/` 的 Less 源）。
> 变量前缀 `--weui-*`，由 `src/style/base/theme/fn.less` 的 `.setColor()` 注入；随
> `[data-weui-theme='dark']` 或系统 `prefers-color-scheme: dark` 切换深色档；care 模式由
> `[data-weui-mode='care']` 切换（详见 §8）。**深色档同名 token 取值不同**，务必引用变量名而非硬编码数值。
> 小程序端换算：**1px = 2rpx**（设计稿基准 375px = 750rpx）。
> 源码定位：颜色主表 `src/style/base/theme/vars/{light,dark,care-light,care-dark}.less`；组件尺寸 `src/style/base/variable/*.less`；组件样式 `src/style/widget/*`。

---

## 1. 颜色（浅色 light / 深色 dark）

### 1.1 基础背景与文字

| token | 浅色 (light) | 深色 (dark) | 语义 / 典型用途 |
|---|---|---|---|
| `--weui-BG-0` | `#ededed` | `#111` | 页面背景（分组列表外的灰底） |
| `--weui-BG-1` | `#f7f7f7` | `#1e1e1e` | 次级背景（输入区 / 栏内底） |
| `--weui-BG-2` | `#fff` | `#191919` | 卡片 / 单元格背景 |
| `--weui-BG-3` | `#f7f7f7` | `#202020` | 三级背景 |
| `--weui-BG-4` | `#4c4c4c` | `#404040` | 辅助中性深灰填充 |
| `--weui-BG-5` | `#fff` | `#2c2c2c` | 辅助填充 |
| `--weui-FG-0` | `rgba(0,0,0,.9)` | `rgba(255,255,255,.8)` | 主文字 |
| `--weui-FG-1` | `rgba(0,0,0,.55)` | `rgba(255,255,255,.5)` | 次级文字（值 / 说明） |
| `--weui-FG-2` | `rgba(0,0,0,.3)` | `rgba(255,255,255,.3)` | 三级 / 占位文字 |
| `--weui-FG-3` | `rgba(0,0,0,.1)` | `rgba(255,255,255,.1)` | 分隔线 / 描边 |
| `--weui-FG-4` | `rgba(0,0,0,.15)` | `rgba(255,255,255,.15)` | 禁用文字 |
| `--weui-FG-5` | `rgba(0,0,0,.05)` | `rgba(255,255,255,.1)` | 默认按钮底 / 按下态底 |
| `--weui-FG-HALF` | `rgba(0,0,0,.9)` | `rgba(255,255,255,.6)` | dialog 默认按钮文字 |
| `--weui-SECONDARY-BG` | `rgba(0,0,0,.05)` | `rgba(255,255,255,.1)` | 次级背景（同 BG-5 语义近） |
| `--weui-WHITE` | `#fff` | `rgba(255,255,255,.8)` | 纯白（深色下转半透明白） |

### 1.2 品牌与功能色

| token | 浅色 (light) | 深色 (dark) | 语义 |
|---|---|---|---|
| `--weui-BRAND` | `#07c160` | `#07c160` | **品牌绿**（主按钮 / 选中 / 成功 / 对勾） |
| `--weui-LINK` | `#576b95` | `#7d90a9` | 链接蓝 |
| `--weui-RED` | `#fa5151` | `#fa5151` | 危险红（删除 / 警告操作） |
| `--weui-ORANGE` | `#fa9d3b` | `#c87d2f` | 橙 |
| `--weui-YELLOW` | `#ffc300` | `#cc9c00` | 黄（警示） |
| `--weui-BLUE` | `#10aeff` | `#10aeff` | 蓝（进行中 / 信息） |
| `--weui-ORANGERED` / `--weui-REDORANGE` | `#ff6146` | `#ff6146` | 橙红 |
| `--weui-GREEN` | `#91d300` | `#74a800` | 绿 |
| `--weui-LIGHTGREEN` | `#95ec69` | `#3eb575` | 浅绿 |
| `--weui-INDIGO` | `#1485ee` | `#1196ff` | 靛蓝 |
| `--weui-PURPLE` | `#6467f0` | `#8183ff` | 紫 |
| `--weui-OVERLAY` | `rgba(0,0,0,.5)` | `rgba(0,0,0,.8)` | 弹窗蒙层 |
| `--weui-BG-COLOR-ACTIVE` | `#ececec` | `overlay(rgba(255,255,255,.05), #2c2c2c)` | 单元格 / 按钮按下态底色 |
| `--weui-DIALOG-LINE-COLOR` | `rgba(0,0,0,.1)` | `rgba(255,255,255,.1)` | 弹窗内部分隔线（**确为真实 token**） |

> 品牌绿阶（对勾 / 进度 / 选中态描边与浅底）：`BRAND-100 #07c160`（主）、`BRAND-80 #059a4c`（按下）、`BRAND-90 #06ae56`、`BRAND-BG-100 #2aae67`、`BRAND-BG-90 #259c5c`（浅绿底，alpha .1 使用）。

### 1.3 色阶档（*-100 / -80 / -90 / -120 / -170）

源码为每个功能色提供多档：`-100`=基础色，`-80`=浅色模式按下/加深，`-90`=深色模式按下，`-120`=浅一档，`-170`=浅色 tint（常用于浅底），`-BG-100/-110/-130/-90`=背景填充档。下表为**浅色模式**取值，深色模式同名 token 取值见 `vars/dark.less`。

| 基色 | -100 | -80 | -90 | -120 | -170 | -BG-100 |
|---|---|---|---|---|---|---|
| BRAND | `#07c160` | `#059a4c` | `#06ae56` | `#38cd7f` | `#b4ecce` | `#2aae67` |
| RED | `#fa5151` | `#c84040` | `#e14949` | `#fb7373` | `#fdcaca` | `#cf5148` |
| BLUE | `#10aeff` | `#0c8bcc` | `#0e9ce6` | `#3fbeff` | `#b7e6ff` | `#48a6e2` |
| ORANGE | `#fa9d3b` | `#c87d2f` | `#e08c34` | `#fbb062` | `#fde1c3` | `#ea7800` |
| YELLOW | `#ffc300` | `#cc9c00` | `#e6af00` | `#ffcf33` | `#ffecb2` | `#efb600` |
| LINK | `#576b95` | `#455577` | `#4e6085` | `#7888aa` | `#ccd2de` | — |
| GREEN / LIGHTGREEN / INDIGO / PURPLE | （见 `vars/light.less`） | | | | | |

> 用法：主按钮按下态 `BRAND-80`，主操作文字 `BRAND-100`；浅绿底 `BRAND-BG-90` + 文字 `BRAND-100`；危险浅底 `RED-BG-100` + 文字 `RED-100`。

### 1.4 图标 GLYPH

| token | 浅色 | 深色 |
|---|---|---|
| `--weui-GLYPH-0` | `rgba(0,0,0,.9)` | `rgba(255,255,255,.8)` |
| `--weui-GLYPH-1` | `rgba(0,0,0,.55)` | `rgba(255,255,255,.5)` |
| `--weui-GLYPH-2` | `rgba(0,0,0,.3)` | `rgba(255,255,255,.3)` |
| `--weui-GLYPH-WHITE-0/1/2/3` | `(.8)/(.5)/(.3)/#fff` | 同上 |

### 1.5 标签 TAG（文字色 + 同色 0.1 alpha 底）

| token | 浅色 | 深色 |
|---|---|---|
| `--weui-TAG-TEXT-ORANGE` | `#fa9d3b` | `rgba(250,157,59,.6)` |
| `--weui-TAG-TEXT-GREEN` | `#06ae56` | `rgba(6,174,86,.6)` |
| `--weui-TAG-TEXT-BLUE` | `#10aeff` | `rgba(16,174,255,.6)` |
| `--weui-TAG-TEXT-RED` | `rgba(250,81,81,.6)` | `rgba(250,81,81,.6)` |
| `--weui-TAG-TEXT-BLACK` | `rgba(0,0,0,.5)` | `rgba(255,255,255,.5)` |
| `--weui-TAG-BACKGROUND-*` | 对应色 `0.1` alpha 底 | 同上 |

### 1.6 材质 MATERIAL（毛玻璃导航栏 / 工具栏）

| token | 浅色 | 深色 |
|---|---|---|
| `MATERIAL-NAVIGATIONBAR` | `rgba(237,237,237,.94)` | `rgba(18,18,18,.9)` |
| `MATERIAL-TOOLBAR` | `rgba(246,246,246,.82)` | `rgba(35,35,35,.93)` |
| `MATERIAL-THICK` | `rgba(247,247,247,.8)` | `rgba(34,34,34,.9)` |
| `MATERIAL-REGULAR` | `rgba(247,247,247,.3)` | `rgba(37,37,37,.6)` |
| `MATERIAL-THIN` | `rgba(255,255,255,.2)` | `rgba(95,95,95,.4)` |
| `MATERIAL-ATTACHMENTCOLUMN` | `rgba(245,245,245,.95)` | `rgba(32,32,32,.93)` |

### 1.7 分隔线 / 状态层 / 杂项

| token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--weui-SEPARATOR-0` | `rgba(0,0,0,.1)` | `rgba(255,255,255,.05)` | 分隔线 |
| `--weui-SEPARATOR-1` | `rgba(0,0,0,.15)` | `rgba(255,255,255,.15)` | 分隔线（强） |
| `--weui-STATELAYER-HOVERED` | `rgba(0,0,0,.02)` | `rgba(0,0,0,.02)` | 悬停态层 |
| `--weui-STATELAYER-PRESSED` | `rgba(0,0,0,.1)` | `rgba(255,255,255,.1)` | 按下态层 |
| `--weui-STATELAYER-PRESSEDSTRENGTHENED` | `rgba(0,0,0,.2)` | `rgba(255,255,255,.2)` | 强按下态层 |
| `--weui-BTN-ACTIVE-MASK` | `rgba(0,0,0,.2)` | `rgba(255,255,255,.2)` | 按钮按下蒙版 |
| `--weui-BTN-DEFAULT-ACTIVE-BG` | `overlay(rgba(0,0,0,.05), #f2f2f2)` | `overlay(rgba(255,255,255,.05), rgba(255,255,255,.08))` | 默认按钮按下底 |

---

## 2. 字号（px / rpx）、字族与行高

| 用途 | px | rpx | 来源（src） |
|---|---|---|---|
| 导航标题 / cell 主文 / 按钮 / dialog 标题 / dialog 正文 | 17 | 34 | `weui-button.less` / `weui-cell.less` / `weui-dialog.less` |
| 分组标题 / tips / 次级 / cell 描述 / 按钮 mini | 14 | 28 | 同上（mini 14px） |
| cell 描述行（desc） | 12 | 24 | （本项目/WeUI 约定） |
| **Android 风 dialog 标题** | 22 | 44 | `weui-dialog.less`（对应设计指南 22pt 大标题） |
| 按钮 medium / mini 高度 | 40 / 32 px | 80 / 64 rpx | `--weui-BTN-HEIGHT-MEDIUM/SMALL` |
| 徽标 / 角标 | 12–14 | 24–28 | — |

- **字族**：`@weuiFontEN: system-ui, -apple-system, "Helvetica Neue"`；`@weuiFontCN: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei"`；默认 `@weuiFontDefault = system-ui, -apple-system, "Helvetica Neue", sans-serif`。
- **全局行高**：`reset.less` 设 `line-height: 1.6`；组件内各自覆盖（dialog 1.4、button `(48-24)/17`）。
- 设计指南列出的 22 / 17 / 15 / 14 / 12 pt 字号见 `design-guidelines.md` §7 令牌表。

---

## 3. 间距（px / rpx）

| 用途 | px | rpx | 来源 |
|---|---|---|---|
| 页面左右边距 | 16 | 32 | 约定 |
| cell 内边距（上下 + 左右，`@weuiCellGapV/H`） | 16 | 32 | `weui-cell.less` |
| cell 内缩进（`@weuiCellInnerGapH`） | 16 | 32 | `weui-cell.less` |
| 分组标题 `cells__title` margin-top（`@weuiCellsMarginTop`） | 8 | 16 | `weui-cell.less` |
| 分组下说明 `cells__tips` margin-top | 8 | 16 | 约定 |
| 按钮区 `btn-area` 外边距 | 上48 / 左右16 / 下8 | 上96 / 左右32 / 下16 | 约定 |
| 并排按钮间距（`@weuiBtnDefaultGap`） | 16 | 32 | `weui-button.less` |
| 单元格间分隔线左缩进 | 16 | 32 | 约定 |
| 带箭头 cell 的 `ft` 右内边距 | 24 | 48 | 约定 |
| 图标列与文字间距 | 8–16 | 16–32 | 约定 |
| **dialog 内距（`@weuiDialogGapWidth`）** | 24 | 48 | `weui-dialog.less` |
| **dialog 标题上内边距（hd padding-top）** | 32 | 64 | `weui-dialog.less` |
| **dialog 正文下边距（bd margin-bottom）** | 32 | 64 | `weui-dialog.less` |
| 上传组件格子（`@weuiUploaderSize`）/ 间距 | 96 / 8 | 192 / 16 | `weui-cell.less` |

---

## 4. 圆角（px / rpx）

| 元素 | px | rpx | 来源 |
|---|---|---|---|
| 按钮（默认 / primary / warn，`@weuiBtnBorderRadius`） | 8 | 16 | `weui-button.less` |
| 按钮 mini | 6 | 12 | 约定 |
| 按钮 xmini | 4 | 8 | 约定 |
| 对话框 `.weui-dialog`（`border-radius`） | 12 | 24 | `weui-dialog.less` |
| 半屏弹窗 / actionsheet 顶部 | 12 | 24 | 约定 |
| 分组卡片（iOS 风格圆角卡片，见原语 group） | 10pt ≈ 20 | 20 | 约定 |
| 开关 `.weui-switch` | 跟随原生 | 跟随原生 | — |

> WeUI 原生 `.weui-cells` **无圆角、无阴影**，分组靠 8px(16rpx) 上间距（`@weuiCellsMarginTop`）与灰底区分；若做 iOS「圆角分组卡片」观感，推荐 10pt(20rpx) 圆角（本项目 `.group` 已用 ~20rpx）。

---

## 5. 分隔线（divider）

- 颜色：`--weui-FG-3`（浅）/ `--weui-FG-3`（深）；弹窗内线用 `--weui-DIALOG-LINE-COLOR`。
- 实现：本项目用 **真实 `1rpx` 实线**（rpx 在微信渲染已含高分屏亚像素，无需 `scaleY(.5)`；`.5` 缩放会在 cells 通栏线因 `top/bottom` 偏移导致位置偏差，已移除）。cell 内分隔线 `left: 16px(32rpx)` 缩进，**首行 `cell:first-child::before` 不显示**；cells 外框上下通栏（定位 `top/bottom: -1rpx` 避开与首行 cell 线重叠）。
- 本项目 `app.wxss` 用兄弟节点 `.cell-divider`（`height:1rpx; background:var(--divider); margin-left:32rpx;`）实现同等效果（见 components.md「原语」）。

---

## 6. 组件尺寸变量（来自 `src/style/base/variable/*.less`）

| 变量 | 值 | 说明 |
|---|---|---|
| `--weui-BTN-HEIGHT` | 48px / 96rpx | 默认按钮高 |
| `--weui-BTN-HEIGHT-MEDIUM` | 40px / 80rpx | medium |
| `--weui-BTN-HEIGHT-SMALL` | 32px / 64rpx | mini / small |
| `@weuiCellHeight` | 56px / 112rpx | 单元格高（WeUI 默认，**非**本项目自定义值） |
| `@weuiSwitchHeight` | 32px / 64rpx | 开关高 |
| `@weuiUploaderSize` | 96px / 192rpx | 上传预览格 |
| `@weuiBtnBorderRadius` | 8px / 16rpx | 按钮圆角 |
| `@weuiDialogGapWidth` | 24px / 48rpx | dialog 内距 |
| `@weuiCellsMarginTop` | 8px / 16rpx | 分组间距 |

---

## 7. 微信小程序设计指南补充令牌（来源 developers.weixin.qq.com/miniprogram/design）

> 原则层见 `references/design-guidelines.md`；本节只沉淀可量化令牌。视觉细节指南未展开，以 WeUI 为本 skill 权威来源。

| 令牌 | 量化值 | px / rpx | 说明 |
|---|---|---|---|
| **字号档** | 22 / 17 / 15 / 14 / 12 pt | 44/34/30/28/24 rpx | 指南列出的常用字号（系统字体）。1pt ≈ 1px(@1x)，故 1pt = 2rpx。22pt 用于大标题（Android dialog 标题即 22px）；17/14/12 与 WeUI 一致；15pt 为过渡次级字号 |
| **点击热区** | 7–9mm（物理） | ≥ 44px / 88rpx 见方 | 手指精度低，可点项最小热区建议 ≥ 88rpx，避免误操作 |
| **设计稿基准宽** | 375px（固定）/ 390px（响应式） | 750 / 780 rpx | rpx 换算 1px = 2rpx（以 375 为基准） |
| **标签分页数** | 2–5 个，建议 ≤4 | — | 超出 5 个微信不推荐 |
| **小程序菜单** | 右上角固定、深浅 2 套 | — | 微信统一放置、不可自定义；预留右上角空间，避免交互冲突 |
| **弹出提示时长** | 1.5 秒 | — | 图标型 / 文字型 toast 自动消失；错误提示不宜用图标型 |
| **加载动画数** | 同页 ≤ 1 个 | — | 长时间载入需提供取消操作 + 进度条 |

---

## 8. care 模式（适老 / 关怀模式）配色档

由 `[data-weui-mode='care']` 切换，配色在 `src/style/base/theme/vars/care-light.less` 与 `care-dark.less`。
特点：**更高对比度、加深的功能色**，便于可读性。

| token | care-light | 对比 light |
|---|---|---|
| `--weui-FG-0` | `#000` | 原为 `rgba(0,0,0,.9)` |
| `--weui-FG-1` | `rgba(0,0,0,.6)` | 原为 `.55` |
| `--weui-FG-2` | `rgba(0,0,0,.42)` | 原为 `.3` |
| `--weui-BRAND-100` | `#018942` | 原为 `#07c160`（更深绿，提升对比） |

> 接入：根节点加 `data-weui-mode='care'`（如微信「关怀模式」）；其余 token 同名自动切换。本项目如需适老档，可参考此机制加 `care` 变量档。

---

## 9. 项目变量映射（qingba 自有 `--*`，已与 WeUI 对齐）

本项目 `app.wxss` 用根节点 `dm-light / dm-dark / dm-auto` 切换自有变量；其取值已对齐 WeUI，可直接当作 WeUI token 的别名使用：

| 项目变量 | 值 | 对应 WeUI |
|---|---|---|
| `--bg` | `#ededed` | BG-0 |
| `--card` | `#ffffff` | BG-2 |
| `--text` | `rgba(0,0,0,.9)` | FG-0 |
| `--text2` | `#737373`（FG-1 次级，.55 黑） | FG-1 |
| `--text3` | `#737373`（FG-1 次级，.55 黑） | FG-1 |
| `--text4` | `#b2b2b2` | FG-2 |
| `--divider` | `#e5e5e5` | ≈ FG-3（.1 黑≈#e6e6e6） |
| `--brand` | `#07c160` | BRAND |
| `--danger` | `#fa5151` | RED |
| `--cell-active` | `#f5f5f5` | ≈ BG-COLOR-ACTIVE（浅） |

深色档：`--bg #111`、`--card #1c1c1e`、`--text rgba(255,255,255,.92)`、`--text2 rgba(255,255,255,.55)`、`--text3 rgba(255,255,255,.55)`、`--text4 rgba(255,255,255,.3)`、`--divider rgba(255,255,255,.1)`、`--brand #07c160`、`--danger #fa5151` ——对应 BG-0 / BG-2 / FG-0 / FG-1 / FG-2 / FG-3 / BRAND / RED 深色档（RED 深浅一致）。

**约定**：新代码优先用项目 `--*` 变量（已对齐 WeUI），不要硬编码色值；如确需引用 WeUI 原始变量名，使用上表 `--weui-*` 值。
