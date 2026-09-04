# 微信 UI 设计 Token（基于截图逆向）

> 本规范仅依据微信 iOS 客户端截图（设置 / 通知 / 听一听 / 消息提示音 / 删除确认弹层 / 多选转发 / 微信首页 等）逆向整理，**不参考任何项目既有布局**。
> 单位 `rpx`（小程序响应式像素）。颜色以浅色（Light）为基准，深色（Dark）见第 5 节。

## 1. 颜色（Light 实测色板）

| 语义 | 值 | 用途 |
|------|-----|------|
| 页面背景 `bg` | `#ededed` | 分组标题带、整页底色（微信浅色实测，截图抓取） |
| 单元格 / 行白底 `card` | `#FFFFFF` | 列表项、卡片、弹层面板、tabBar、device-banner |
| 主文字 `text` | `#000000` | 导航标题、row 主文 |
| 次级文字 `text-2` | `#8E8E93` | 分组标题、右侧值、行内描述、占位文字、聊天预览、时间 |
| 弱文字 / 箭头 `chevron` | `#C7C7CC` | 揭示箭头、极弱文字、选择圈描边、静音图标 |
| 系统绿 `success` | `#34C759` | 开关开启、picker 勾选、列表选中填充（iOS systemGreen） |
| 系统红 `danger` | `#FF3B30` | 危险 / 销毁操作（iOS systemRed） |
| 品牌绿 `brand` | `#07C160` | tabBar 选中、品牌元素（WeChat 官方绿，**独立于 `success`**） |
| 未读红 `unread` | `#FA5151` | 未读徽标、tabBar 红点、消息计数（**独立于 `danger`**） |
| 开关关闭底色 `switch-off` | `#E9E9EB` | 开关关闭态 |
| 单元格间细分隔线 `divider-row` | `#C8C8CD` | 单元格间分隔线、tabBar 顶部分割 |
| 行外说明 `caption` | `#8E8E93` | caption 文本（语义独立于 `text-2`） |
| 搜索栏背景 `search-bg` | `#F2F2F7` | nav 下伪搜索框底色（iOS systemGray6） |
| 选中圈白对勾 `check-on` | `#FFFFFF` | 选中绿圈内白对勾字色（**固定不参与主题切换**） |
| 徽标白字 `badge-on` | `#FFFFFF` | 红/绿底徽标白字（**固定不参与主题切换**） |

> 截图未出现、本规范暂不定义的颜色（如品牌主色、分类标签色）不在此列，待补充截图。

### 颜色语义区分（关键约定）

四种"红绿色"语义独立，禁止混用：

| 语义色 | 值 | 适用场景 | **禁止**用于 |
|--------|-----|---------|--------------|
| `success` | `#34C759` | 开关开启、picker 勾选、列表选中填充（iOS systemGreen） | tabBar 选中、品牌元素 |
| `brand` | `#07C160` | tabBar 选中、品牌元素（WeChat 官方绿） | 开关、勾选 |
| `danger` | `#FF3B30` | 危险 / 销毁操作（iOS systemRed） | 未读徽标、链接装饰 |
| `unread` | `#FA5151` | 未读徽标、tabBar 红点、消息计数 | 危险操作、报错提示 |

四者**语义独立**，互不替代：
- `success` 是 **iOS 系统级"开启 / 选中"指示色**（与系统交互一致）。
- `brand` 是 **WeChat 品牌识别色**（与品牌一致，与系统无关）。
- `danger` 是 **"危险 / 销毁"警告色**（与系统一致，红色慎用）。
- `unread` 是 **消息计数 / 提醒色**（高频出现，需独立避免与 danger 冲突）。

### 其他 token 说明

- **`search-bg`**：仅用于 nav 下的"伪搜索框"（点击跳独立搜索页），不用于独立搜索页的真正 `<input>` 背景。
- **`check-on`**：选中绿圈内的白色对勾字色，**固定 `#FFFFFF`**（不参与主题切换，对勾始终在绿底上保持白色）。
- **`badge-on`**：徽标白字（红点 / 数字药丸 / 选中圆白对勾），**固定 `#FFFFFF`**。
- **`brand` 与 `unread` 在深色下不切换**：WeChat 品牌绿 / 未读红在浅色 / 深色下保持同一色值。这是品牌一致性 + 强对比需求，**不**跟随系统。

### 本项目代码对齐备注（qingba）

- **字号缩放 `--fs` 已落地**：本项目 `fontPicker` / `darkMode` 等页用 `calc(34rpx * var(--fs, 1))` 派生字号，根节点由 `fs-small/normal/large/xlarge` class 切换（`utils/theme.js` + `app.js.applyFontLevel`）。即本规范第 2 节"默认固定值"已演进为"默认跟随 `--fs` 派生"，新页面应保持一致。
- **CSS 变量命名对照**：项目既有的 `--bg/--card/--text/--text2/--text3/--divider/--cell-active` 分别对应本规范的 `bg/card/text`、`text-2`+`caption`（次级 / 弱文字）、`divider-row`、按下态。规范 token 名与实际变量名不同，语义一致。
- **开关 / 对勾的绿色取值（重要）**：微信真机 toggle 与对勾是 **WeChat 品牌绿 `#07C160`**，并非 iOS systemGreen `#34C759`。本项目 `darkMode` 页的 `.switch-on` 与 `.cell-check` 即采用 `#07C160`（深浅模式统一、无深色变体）；而 `fontPicker` / `stagePicker` / `importPicker` / `clearPicker` 四个原语3 单选页的 `.cell-check` 统一用 `#34C759`（深色 `#30D158`，即 `success` token）。两处绿**不一致**，新代码建议统一为 `#07C160` 以贴合微信观感；若保留 `success`，至少保证单页内一致（如 picker 页深浅均走 `success`）。
- **`--text3` 浅色取值 `#b2b2b2`**，用于分组标题 / 行内描述 / 弱文字；深色沿用 `rgba(255,255,255,0.42)`。

## 2. 字号（Typography）

按 iOS pt 折算 rpx，推荐以固定值直接定义：

| 角色 | 值 | 说明 |
|------|-----|------|
| 导航栏标题 `nav-title` | `34rpx / 600` | 居中，不参与缩放 |
| 正文 / row 主文 | `34rpx / regular` | 设置页 cell 主文 |
| 右侧值 `value` | `34rpx / regular` | 字色 `text-2` |
| 次级描述 `desc` | `28rpx / regular` | 设置页行内多行描述 |
| 聊天标题 `chat-title` | `32rpx / 500` | 字色 `text`，聊天列表主文 |
| 聊天预览 `chat-preview` | `28rpx / regular` | 字色 `text-2`，聊天列表副文 |
| 时间 `chat-time` | `24rpx / regular` | 字色 `text-2`，与标题同行右对齐 |
| 分组标题 `group-title` | `26rpx / regular` | 灰带小标题 |
| 行外说明 `caption` | `28rpx / 行高 1.5` | 低于 row 主文一档 |
| 弹层标题 `sheet-title` | `34rpx / 行高 1.4` | 字色 `text-2`，居中 |
| 弹层操作行 `sheet-row` | `34rpx / regular` | 字色 `text`；危险行用 `danger` |
| 搜索占位字 | `28rpx / regular` | 字色 `text-2` |
| 选中圈内对勾 | `24rpx / 600` | 字色 `check-on`（白） |
| tabBar 文字 `tabbar-label` | `24rpx / regular`，选中 `500` | 字色：未选 `text-2`、选中 `brand` |
| 徽标字 `badge-fs` | `22rpx / 600` | 字色 `badge-on`（白），红/绿底通用 |
| 设备状态条文字 `device-banner-text` | `28rpx / regular` | 字色 `text` |
| 静音图标 | `24rpx` | 字色 `chevron` |

> 如需跟随系统字号缩放，可将基准 `28rpx` 设为 `--fs` 变量，其余按倍数派生；本规范默认固定值。

## 3. 间距与布局

| 用途 | token | 值 |
|------|-------|-----|
| 列表 / 标题内部左内边距 | `page-pad-x` | `32rpx`（分组 section 全宽平铺，页面本身无侧边距） |
| 圆角卡片组间距 | `group-gap` | `24rpx` |
| 带 caption 的组间距 | `group-gap-lg` | `48rpx` |
| row 最小高度（点击热区） | `cell-h` | `88rpx` |
| row 左右内边距 | `cell-pad-x` | 左右 `32rpx`（对称）|
| 多选 row 左侧预留 | `cell-checkable-pad-l` | `72rpx`（36rpx 圆 + 16rpx 间距 + 20rpx 边距） |
| 分组标题带 padding | `group-title-pad` | `16rpx 32rpx` |
| caption 上下内边距 | `caption-pad-y` | `16rpx 24rpx`（上紧下松） |
| row → caption 间距 | — | `0`（紧贴，视觉一体） |
| 开关控件尺寸 | `switch-size` | `104rpx × 56rpx` |
| 单元格间分隔线缩进 | — | 左 `32rpx`、右 `0` |
| 选中圈尺寸 | `check-circle-size` | `36rpx × 36rpx`，2rpx 描边 |
| 弹层操作行高 | `sheet-row-h` | `88rpx` |
| 弹层标题上下 padding | — | 上 `32rpx`、下 `24rpx` |
| 弹层底部安全区 | — | `env(safe-area-inset-bottom)` |
| 弹层分组间隙 | `sheet-gap-h` | `8rpx`（灰底窄条分隔操作组与取消组） |
| 搜索栏高度 | `search-h` | `64rpx` |
| 搜索栏左右内边距 | — | `24rpx` |
| 搜索栏上下 margin | — | `16rpx` |
| 搜索栏与列表间距 | — | `16rpx` |
| tabBar 高度 | `tabbar-h` | `110rpx`（不含底部安全区）+ `env(safe-area-inset-bottom)` |
| tabBar 图标 | `tabbar-icon` | `40rpx × 40rpx` |
| tabBar 文字与图标间距 | — | `4rpx` |
| tabBar 顶部分割线 | — | `1rpx solid divider-row` |
| tabBar 徽标偏移 | — | 右上角 `-4rpx / -4rpx` |
| 头像尺寸 | `avatar-size` | `88rpx × 88rpx` |
| 头像圆角 | `avatar-radius` | `8rpx`（小圆角，正方形，**非正圆**） |
| 头像与内容间距 | `chat-avatar-gap` | `24rpx` |
| 聊天 row 高度 | `chat-row-h` | `~120rpx` |
| 聊天 row 上下 padding | `chat-row-pad-y` | `20rpx` |
| 聊天 row 左右 padding | `chat-row-pad-x` | `24rpx` |
| 聊天标题与预览间距 | `chat-title-gap` | `8rpx` |
| 红点徽标 | `badge-dot-size` | `16rpx × 16rpx`，`border-radius: 50%` |
| 数字徽标药丸 | `badge-pill-h` | `32rpx` 高，最小宽 `32rpx`，自适应宽 |
| 静音图标 | — | `24rpx`，字色 `chevron` |
| 设备状态条 padding | `device-banner-pad` | `24rpx 32rpx` |
| 设备状态条图标 | — | `32rpx`，字色 `text-2` |
| 表单行高 `form-row-h` | `88rpx` | 与 `cell-h` 一致 |
| 表单行左右 padding | `form-row-pad-x` | 左右 `32rpx`（与 `cell-pad-x` 一致） |
| 表单 label 与 input 间距 | `form-label-gap` | `24rpx` |
| 表单行间分隔线缩进 | — | 左 `32rpx`（与 cell divider 一致） |
| 表单分组分隔间距 `form-section-gap` | `24rpx` | 视觉分段时 divider 上加 24rpx margin（图片中公司信息 ↔ 银行信息的分组断点） |
| 分段控件项高 `seg-item-h` | `56rpx` | 单个选项框高度 |
| 分段控件项左右 padding | `seg-item-pad-x` | `32rpx` |
| 分段控件项间距 | `seg-gap` | `16rpx`（除首项外，每个项左 16rpx） |
| 分段控件圆角 `radius-seg` | `8rpx` | 小圆角矩形，非胶囊 |
| 分段控件边框 | `1rpx` | 浅色 `text-2`，深色 `chevron` |
| 必填标记色 | `brand` | `#07C160`（与 tabBar 选中、seg-control 选中同源，**非** `danger`） |
| 按钮高 `btn-h` | `88rpx` | = cell-h = 44pt iOS |
| 按钮水平 padding | `btn-pad-x` | `32rpx` |
| 按钮字号 `btn-fs` | `32rpx / 500` |  |
| 按钮间距 | `btn-gap` | `24rpx`（并排布局时） |
| 按钮圆角 `radius-btn` | `8rpx` | iOS 4pt，矩形圆角（**非胶囊**） |
| 按钮胶囊圆角 `radius-pill` | `44rpx` | = btn-h / 2，半圆 |

## 4. 圆角与阴影

| 元素 | 值 |
|------|-----|
| 分组卡片圆角 `radius-card` | `0`（微信分组 section 全宽平铺，无圆角；区别于 iOS 原生 inset group） |
| 单元格内部 | 无圆角（section 全宽平铺，cell 直接相邻，无首末圆角） |
| 弹层顶部圆角 `radius-sheet` | `24rpx`（仅顶部两角，底部贴屏） |
| 搜索栏圆角 `radius-search` | `16rpx`（小圆角，非胶囊） |
| 按钮矩形圆角 `radius-btn` | `8rpx` | iOS 4pt |
| 按钮胶囊圆角 `radius-pill` | `44rpx` | = btn-h / 2，半圆 |
| 头像圆角 `radius-avatar` | `8rpx`（小圆角，正方形） |
| 数字徽标药丸 | `16rpx`（半圆） |
| 选中圈 | `50%`（正圆） |
| 红点徽标 | `50%`（正圆） |
| 阴影 | **无**（靠白底 / 灰底对比区分，不投影） |

> **平台差异（重要）**：本规范的分组 section 采用**微信 Android 主导版**的扁平全宽风格——`group-card` 无侧边距、无圆角，段间灰色间隙由 `.group` 的 `margin-bottom`（`group-gap`）提供，分隔线从屏幕左缘缩进对齐文字。若需对齐 **iOS 微信**原生 grouped 风格，则 `group-card` 需加 `margin: 0 32rpx` + `border-radius: 20rpx`（首末 cell 贴合圆角）。两者互斥，按目标平台择一。

## 5. 主题切换（Dark 对应）

| 语义 | Dark 值 |
|------|---------|
| `bg` | `#1C1C1E` |
| `card` | `#2C2C2E` |
| `text` | `rgba(255,255,255,0.92)` |
| `text-2` / `caption` | `rgba(235,235,245,0.6)` |
| `chevron` | `rgba(235,235,245,0.3)` |
| `success` | `#30D158` |
| `danger-dark` | `#FF453A` |
| `brand` | `#07C160`（**保持品牌色，不切换**） |
| `unread` | `#FA5151`（**保持消息色，不切换**） |
| `switch-off` | `#39393D` |
| `divider-row` | `rgba(84,84,88,0.65)` |
| `mask` | `rgba(0,0,0,0.7)` |
| `tabbar-bg` | `#1C1C1E` |
| `search-bg` | `rgba(118,118,128,0.24)`（iOS systemGray6 dark） |
| `check-on` | `#FFFFFF`（固定） |
| `badge-on` | `#FFFFFF`（固定） |
| `btn-disabled-bg` | `#C7C7CC` | `#3A3A3C`（iOS systemGray3） |

- **切换机制**：根节点 class `dm-light`（强制浅）/ `dm-dark`（强制深）/ `dm-auto`（跟随系统 `@media (prefers-color-scheme: dark)`）切换 CSS 变量。
- 新增任何颜色，必须同时提供浅色与深色（含 `dm-auto`）定义。
- **`brand` / `unread` / `badge-on` / `check-on` 不参与主题切换**（品牌一致 + 强对比）。

## 6. 弹层 / 模态（Modal / Sheet）

| 角色 | Light | Dark |
|------|-------|------|
| 遮罩 `mask` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.7)` |
| 顶部圆角 `radius-sheet` | `24rpx`（仅顶部两角） | 同 |
| 操作行高 `sheet-row-h` | `88rpx` | 同 |
| 分组间隙 `sheet-gap-h` | `8rpx`（灰底窄条） | 同 |
| 面板背景 | `card`（`#FFFFFF`） | `card`（`#2C2C2E`） |
| 标题字色 | `text-2`（`#8E8E93`） | `text-2`（`rgba(235,235,245,0.6)`） |
| 危险文字 `danger` | `#FF3B30` | `#FF453A` |
| 行间分隔线 | `divider-row` | `divider-row` |
| 底部安全区 | `padding-bottom: env(safe-area-inset-bottom)` | 同 |

详见 `components.md` 的「原语 4：`.action-sheet`」。

## 7. 组件原语对照（详见 components.md）
- `.group`：圆角卡片 + 灰色分组标题带（设置 / 通知页）。
- `.group-flat`：裸白带 + 行外 caption（听一听页）。
- `.picker-page`：单选 picker 页（消息提示音页）。
- `.action-sheet`：底部确认弹层（删除确认弹层 / 多选转发）。
- `.search-bar`：nav 下的伪搜索框。
- `.cell-checkable`：列表多选行 + 选中圈（多选转发 / 消息多选）。
- `.tab-bar`：底部 tab 导航（微信首页）。
- `.chat-row`：聊天列表行 + 头像 + 预览 + 未读（微信首页）。
- `.avatar`：单图 / 3×2 拼图 / 占位。
- `.badge`：红点 / 数字药丸。
- `.device-banner`：设备状态条（多端登录提示）。
- `.btn`：按钮族（`.btn-primary` 主操作 brand 绿 / `.btn-secondary` 次操作灰底 / `.btn-danger` 危险红底 / `.btn-disabled` 禁用 systemGray3 / `.btn-pill` 胶囊变体 / `.btn-block` 全宽修饰 + `.btn-row` 内容区并排 / `.btn-bar` 整页底部带安全区）。

---
## TODO：待补充
- 截图未覆盖：居中 modal（UIAlert 风格）、空状态、加载/骨架屏、消息详情页（聊天界面 / 输入栏 / 表情 / 图片消息）等。
- caption 超过 2 行的处理约定。
- 字号系统缩放方案（是否引入 `--fs`）。
- 弹层动效（遮罩淡入 / 面板滑入 / 退出动画）。
- 选中圈 fade-in 动画时长。
- 聊天预览是否支持 2 行省略（截图是单行）。
- 强提醒 / 免打扰 / @全员 等群消息角标。