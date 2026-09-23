---
name: ui-design-spec
description: 微信小程序 UI 设计规范，基于 WeUI 官方（weui.io / Tencent/weui v2.6.26）的设计令牌与组件原语沉淀。当需要实现微信风格的列表页、设置页、分组卡片、开关、导航栏、按钮、表单、弹窗、徽标、文章 / 说明页，或需要统一配色、字号、间距、圆角、深色模式适配时，使用本规范。This skill should be used when building WeChat-style (WeUI-based) grouped-list / settings / form / article-page UIs to keep colors, typography, spacing, radius, and component primitives consistent with WeUI's official design tokens. It also incorporates the official WeChat Mini Program Design Guidelines (developers.weixin.qq.com/miniprogram/design) for design principles, navigation, feedback, and hierarchy.
---

# 微信 UI 设计规范（基于 WeUI 官方）

## Overview
本规范以 **WeUI 官方（https://weui.io，Tencent/weui v2.6.26）** 为权威来源，沉淀微信原生界面的配色、字号、间距、圆角与组件原语（分组卡片、单元格、按钮、表单、开关、导航栏、弹窗、徽标、图标）。WeUI 仓库已克隆至 `D:\github\weui`，`design-tokens.md` / `components.md` 的所有色板、字号、间距、圆角与组件尺寸均**已逐项核对 `src/style` 下的 Less 源**（`base/theme/vars/*`、`base/variable/*`、`widget/*`）。目标是让任何「微信风格」页面在视觉上与 WeUI 保持一致，**不依赖任何项目既有的布局或样式**——但本项目的 `--bg/--card/--text/--brand/--divider` 等 CSS 变量已与 WeUI 对齐（见 `design-tokens.md` §9 映射），可直接当作 WeUI token 的别名使用。

## 何时使用
- 实现微信 / WeUI 风格的列表、设置、详情、表单页。
- 对齐配色、字号、间距、圆角、阴影等视觉参数。
- 做深色模式适配（项目固定 `dm-auto`：内容区跟随系统，与 `theme.json` 渲染的导航栏 / tabBar 同源）。
- 处理字号缩放 / 适老化适配（项目 `--fs` 派生档的驱动源是微信字体设置，见下「项目实现备注」）。
- 引入新复用组件，需确认是否符合微信原生观感。
- 需要判断某段样式是否「像微信」。
- 实现统计 / 概览类看板页（大号数字 + 卡片 + 图表，见 `components.md` 原语 17）。
- 实现「文章型」页面（关于 / 说明 / 协议：文章主标题 + 章节 + 正文列表，见 `components.md` 原语 21）。
- 实现「毕业 / 里程碑」庆祝态（品牌绿徽章 + confetti 纯色散点 + 全程口径大数字，纯庆祝无操作入口，见 `components.md` 原语 24）。

## 设计原则
1. 所有颜色、字号、间距以 `design-tokens.md` 的 token 为准；禁止硬编码同质值。
2. 优先用项目 `--*` 变量（已对齐 WeUI），确需引用原始变量名时用 `--weui-*`。
3. 字号默认固定 rpx（1px = 2rpx，见 tokens）；需要跟随用户大字偏好时用 `--fs` 派生（本项目已落地，驱动源是**微信字体设置**，见下「项目实现备注」）。
4. 深色模式只切换变量，不新增独立样式；**深色规则必须写成 `.dm-auto` + `@media (prefers-color-scheme: dark)` 的成对形式**——项目已把三态收敛为 `dm-auto` 一态，只写 `.dm-light` / `.dm-dark` 的规则不会再匹配到任何节点（静默失效，不报错）。
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
- **分隔线（细线统一方案，TDesign hairline 同款）**：**一律 `1px` + `transform: scaleY(0.5)`（竖线用 `scaleX(0.5)`），并用 `transform-origin` 锚定线所在的那条边**（横线 `top` / `bottom`、竖线 `left` / `center`）。原因：`1rpx` 约合 0.5 个逻辑像素，是小数尺寸，真机 WebView 会在像素网格吸附阶段把它舍成 0、**整条线消失**（开发者工具不触发该舍入，所以只丢真机）；`1px` 是整数逻辑像素、任何 DPR 下都渲染为整数个物理像素，布局阶段稳定落格，而 `transform` 缩放属合成阶段、只会让线变淡、不会让它消失。**漏写 `transform-origin` 会因默认原点 `center` 让线向两侧各缩一半而位置漂移**——这正是本项目当年误判「`scaleY` 不可用」的真正原因（不是 `scaleY` 的问题，是没锚定原点）。**线挂在容器自身 `border` 上时不能直接加 transform**（`scaleY` 会连同容器内容一起压扁），须改由伪元素承担画线（`::after` 画底边 / `::before` 画顶边），分组块（如 `.res-list`）即此写法、末组 `:last-child` 去线。cell 内线 `left:32rpx` 缩进、首行无。`picker-view` 的选中框（`.mp-pv-indicator`）是 80rpx 高的框、不能缩放，其上下线直接给 `1px`。
- **按钮**：`.weui-btn` 默认高 48px(96rpx)、圆角 8px；变体 `primary`(BRAND 绿)/`default`(灰底)/`warn`(RED)/`disabled`；尺寸 `medium`(40px)/`mini`(32px)、`block`/`inline`。项目 `.btn` 族高 88rpx（44pt iOS），新按钮沿用。**原生能力按钮（如 `<button open-type="share">`）直接套 `.weui-btn` 系列类、无需额外样式**；`open-type` 在朋友圈单页模式下被禁用，用按钮时须按场景值 `1154` 隐藏（见 `design-guidelines.md` §六）—— **但项目内已不设页内分享按钮**（「关于」页那枚已移除，转发只走右上角菜单）。
- **单元格**：`.weui-cell` 内边距 16px(32rpx)、主文 17px(34rpx)；`__bd` flex:1、`__ft` 右对齐 FG-1；`__desc` 12px(24rpx) FG-2。变体 `access`(箭头)/`link`(蓝)/`warn`(红)。项目 `.cell` 家族：`cell--single`(110rpx)/`cell--desc`(146rpx)/`cell-radio`/`cell-check`(iconfont 品牌绿对勾)。
- **开关**：一律用原生 `<switch color="#07c160">`（早期自绘的 `.switch` 胶囊开关已随深色模式选择页删除，项目中不再存在，勿再引用）。
- **单选/多选**：选中标记统一品牌绿 `#07c160`（圆底绿勾 / 对勾）。
- **弹窗**：蒙层 OVERLAY；dialog 卡片 `#fff` 圆角 12px，主操作 BRAND；actionsheet 底部上滑、取消独立灰带；toast 反白居中。
- **导航/标签栏**：原生组件，颜色在 `app.json`（导航栏 `#ededed`、tabBar 选中 `#07c160`）。
- **图标**：本项目用内联 iconfont（`@font-face` base64 注册于 `app.wxss`，跨页面生效）`.iconfont` + `.icon-*:before`；可用字形：`icon-check` 对勾（走 `var(--brand)`）/ `icon-close` 关闭（走 `var(--text3)`，**弹层关闭按钮统一用它**，热区补足 88rpx 并用负 margin 抵消外扩；勿用裸字符 `×`）/ `icon-right` 右箭头 / `icon-lock` `icon-unlock` / `icon-info` / `icon-squarecheck` / `icon-rank` / `icon-settings` / `icon-calendar` 日历 / `icon-location` / `icon-home` `icon-homefill` / `icon-my` `icon-myfill` / `icon-circle` `icon-circlefill`。箭头 `icon-right` 统一取 `var(--text3)`（FG-2）作为「正常箭头色」。**自定义组件内使用须先在自己 wxss 里 `@import "../../styles/iconfont.wxss"`** —— `app.wxss` 的 class 选择器不会穿透进组件（只有标签名选择器会），漏引会表现为图标位置空白（见 `components/radio-list/radio-list.wxss`）。
- **数据看板卡片（原语 17）**：统计 / 概览类「非列表」页用白底圆角卡片（`--card` + 20rpx 圆角，**无阴影**）；主数据用大号数字（40/44/56/72rpx），单位与说明走 28rpx `--text2`；图表「今日」用 `var(--brand)`、「非今日」用 `var(--card2)`（主题自适应灰，勿硬编码 `rgba(0,0,0,.05)`）；角标箭头用 `.iconfont .icon-right`（`--text3`），勿用裸字符 `↗`；指标网格左右内距 32rpx 对齐页面边距。
- **阶段统计详情页（原语 18）**：单个阶段的「累计」视图，核心数据**不套卡片**（扁平大数字贴页面底），累计时长用「X 小时 Y 分钟」分段（`splitCumulative()`，数字 64rpx 远大于单位 28rpx，勿用 `h/m` 缩写）；副行显示阶段跨度「首次打卡日 → 最后打卡日，阶段名称 历时 N 天」（跨度从打卡记录派生）；汇总三项用简单 flex 两列（`width:50%` + `flex-wrap`，前两项一行、第三项换行），每项 `prefix + 大数字 + unit + icon-right`，箭头紧贴 unit（`margin-left:8rpx`）勿用裸字符 `›`。详见 `components.md` 原语 18。
- **滚轮选择器弹层（原语 19）**：选择月份 / 阶段等互斥选项用「可点胶囊 + ▾ → 半屏 `.mp-mask`/`.mp-sheet` + `<picker-view>` + 取消/确定」；浅色 `#e5e5e5` / 深色 `rgba(255,255,255,.1)` 上下细线标识选中项。三个必写项：弹层根节点带 `{{fontClass}} {{darkClass}}`、`mask-class="mp-pv-mask"`（去内置白蒙层）、`indicator-class="mp-pv-indicator"`（透明背景 + `var(--divider)` 细线，**切勿填实色底——会盖住选中行文字**）。详见 `components.md` 原语 19。
- **双列选择弹层（原语 22：左分组 / 右资源，项目 `components/resource-picker`）**：两列各一个 `scroll-view`，**必须有确定高度才能滚动**——不要用「高度 auto 让内容撑开」（`height:100%` 落在 auto 父级上会循环依赖、iOS 可能塌成 0；右列条数动态，撑开后会超出屏幕且被 `overflow:hidden` 裁掉）。高度按「能装下 N 个分组」取三档：`calc(172rpx + 24rpx + 96rpx × var(--rp-rows) + env(safe-area-inset-bottom))`，`--rp-rows` 默认 `7`、`.h8`/`.h9` 取 `8`/`9`，**JS 只切 class**（不为量窗口写内联 style，也不需要拖拽改高度）。左右两列**同白底**、分栏靠列间 `scaleX(0.5)` 竖线；分组行 `96rpx`，选中态是**文字品牌绿 + 行尾 `icon-check`**（与右列资源项同款），不要另做竖线指示条或灰底。详见 `components.md` 原语 22。
- **左滑操作（原语 20）**：列表行左滑露出「编辑 / 删除」——非破坏操作在左、破坏性在右；JS 的 `SWIPE_W` 与 wxss 的 `.swipe-bg { width }` 必须双处同步（头号易错点）；位移过半（`-SWIPE_W/2`）才吸附展开、拖动限位 `-(SWIPE_W+20)`、位移变化 <2rpx 跳过 `setData`；按钮固定彩色（编辑 `#c7c7cc` / 删除 `#ff4d4f`），深色模式不另做适配。详见 `components.md` 原语 20。
- **文章页排版（原语 21）**：说明 / 关于 / 协议类「文章型」页用整页 `.weui-article`（无卡片框，padding `96rpx 48rpx`），**数值逐条照 WeUI 官方 article**：h1 `44rpx`(22px)/500/**居中**/下距 96rpx、h2 `40rpx`(20px)/500（**比正文大一档**，这是章节层级的关键）、h3 `34rpx`/500、h4 `34rpx`/**400**（官方不加粗）、正文 `34rpx` + `--text` + 行高 1.6、段落下距 `48rpx`(24px)、注脚 `24rpx` `--text3`；分节 `__section` `margin-bottom:96rpx`（嵌套 64 / 48rpx）。列表借 Markdown 语义：无序 `::before '•'` + 悬挂缩进 40rpx，有序用 CSS `counter` 自动编号；行内强调只保留一档：**同色加粗 `700` + 深色档提亮到 `#fff`**（`600` 在 Android 会被就近映射成 medium、真机上「加粗几乎看不出」；深色正文仅 80% 白，必须靠提亮拉开台阶），不引彩色提示块。**层级靠字号差 + 留白，不靠字重、竖条、细线、卡片** —— 深色下 `--card` 与 `--bg` 只差 8 色阶、字重差又被白字光晕吃掉，靠「加边界元素」补层级的路子已试过、效果不好。**档位已 token 化**：`about.wxss` 用 `--art-*` 承载「字号 / 行高 / 字重」三件套与间距阶梯（`--art-gap-para/block/section`），元素只引 token；行高按 TDesign 做法**与字号成对写死**（不再是 1.6 倍率，仍乘 `--fs`）—— 做法借 TDesign Typography，**数值不借**（它的正文仅 14px、标题全 `600`、h4 档比正文还小，且 `strong` 用 600 会复发 Android 字重坑）。**现存 `about` 与 `about-bigloop` 两页**：后者 `@import` 前者 wxss、只补页面特有样式，token 单点维护。详见 `components.md` 原语 21。
- **半屏弹层与弹层表单（原语 23）**：外壳统一走 `components/half-sheet`（蒙层 + 面板 + 抓手 + 头部 + `footer` 槽；`apply-shared` 便于用 `sheetClass` 定制面板高度），内容走 `app.wxss` 的「弹层表单」原语（`.form-card` / `.form-row` / `.form-label(-muted)` / `.form-field` / `.form-unit` / `.form-static` / `.seg-control(-grid)` / `.seg-item` / `.seg-active`），现存 6 处弹层共用。两条易错约定：**① 卡片底色取 `--card2`、必须比面板（`--card`）低一档** —— 同色时卡片的边界、16rpx 圆角与左右 32rpx 内缩全都读不出来（圆角是死样式，内缩只像「没和标题对齐」）；**② 按压反馈色看元素自身有没有底色** —— 透明的 `.form-row` 要跟容器的底配（`--card2` 上用 `--divider`；沿用 `--cell-active` 只差 11 个色阶、按住几乎无反应），自带白底的 `.seg-item` 照用 `--cell-active`、不受影响；**③ 隐藏态必须落到 `display: none`（真机坑）** —— 外壳常驻挂载，只写 `visibility:hidden` + 面板 `translateY(100%)` 挡不住原生输入框：真机上 `input` 由原生层绘制，**不吃父级的 visibility，也不吃 transform**，弹层关掉后 placeholder 仍留在屏幕底部（表现为页面下方凭空多出「请输入」）。`display:none` 要由 js 控时序挂/摘（打开先摘、隔一帧再挂显示态；关闭等滑出动画走完再挂），否则过渡动画被吞。详见 `components.md` 原语 23。
- **毕业 / 里程碑庆祝卡（原语 24）**：路线毕业这类里程碑时刻用纯庆祝卡替代统计区——WeUI msg 全居中范式（品牌绿圆徽章 136rpx + **白勾**（须显式覆盖 `icon-check` 默认品牌绿）→ 标题 44rpx/500 → 副题 28rpx → 三联大数字 64rpx + 24rpx 单位 → tips）。**confetti 散点用固定高饱和纯色**（WeUI 官方橙/黄/蓝，10-18rpx 错落绝对定位），不随主题 → 深色模式零额外规则；**数字必须切全程口径**（928 天陪伴比 80 小时有冲击力），**纯庆祝无操作入口**，同屏页头「阶段名 + 百分比」整块隐藏。详见 `components.md` 原语 24。
- **标签 / 徽标**：`.weui-tag` 无 margin，间距由父级 flex `gap` 控制；同一行并列多个标签时，字号 / 内边距 / 圆角**在父级集中收紧一次**（如 `.record-tags .weui-tag`），勿在每个标签类里各写一份覆盖，否则会出现「个别标签大一号」的行内不一致。**彩色标签的浅 / 深两档必须写在同一个文件里**（`app.wxss`「记录标签配色」一节，浅色与 `.dm-dark` / `.dm-auto` 两套深色档相邻），页面 wxss 只留父级尺寸收紧 —— 曾因「浅色在页面、深色在全局」两边分开维护，漏补 `.tag-stage` 深色档，深色下「常规N」浅金底亮成一块（详见 `components.md` 原语 10）。
- **原生 `<picker>` 与自绘 `picker-view` 的取舍（原语 19 补充）**：原生 `<picker>` 的弹层由微信客户端渲染，**不受 WXSS 控制**——没有 `style` / `class` / 字号属性，不吃 `--fs`、不吃 `dm-*`（随系统深色），唯一接近的 `header-text` **仅安卓有效**；只有页面上被包裹的那一行能跟项目变量。要弹层也跟随，只能用自绘 `picker-view` + 半屏弹层（原语 19）。项目现状：日期 / 阶段行用原生（一次只选一屏，原生更省心、零维护），月份 / 阶段选择器用自绘（需跟随）。**同一个 App 内两套观感是平台限制，不是缺陷**。**`multiSelector` 的 `value` 是受控的**：`bindcolumnchange` 里改 `range` 时必须把**左列下标一并写回**（`multiValue: [value, 0]`），只改右列的话 picker 会按旧 `value` 把左列复位回去（表现为「分组切不动」）；`bindchange` 同样建议写回 `multiValue: [gi, ri]`，否则再次打开弹层会跳回旧位置。
- **表单页密度：分组标题有成本（原语 3 / 5）**：一个分组标题约占 78rpx，还额外带来一组上下通栏线。同类信息（如同一张表单里的几个选择项）**优先合并进同一个 `.weui-cells`**，靠行首标签区分，而不是各起一组；同一张卡片能容纳的相邻小节（如时长 + 快捷按钮 + 备注）用 `.weui-divider` 分节而不是再开一张卡。整页规划时先估「分组数 × 78rpx + 行数 × 112rpx + 卡片与按钮区」，超过一屏（约 1334rpx）再逐项收口；按钮区上边距（全局 96rpx）在卡片少时可按页覆盖收窄。**收敛案例**：`editRecord` 整页收成**一块 cells**（去「打卡信息」「学习记录」两个分组标题 + 两条 tips，标题语义交给行首标签；被删掉的引导文案由相关行的右侧值承担），`backfill` 收成「日期 / 阶段」+「学习内容」两块。**删掉分组标题后，页面顶部留白要自己补**——改由容器 `padding-top`，不要给 `.weui-cells` 加 `margin`（见「列表分组间距」条）。
- **设计原则 / 交互规范**：四大原则（友好 / 清晰 / 便捷 / 统一）、导航（小程序菜单右上固定且深浅两套、Tab 2–5 建议≤4）、反馈（局部加载优先、同页 ≤1 加载动画、成功 toast 1.5s）、层级（模态阻断 / 弹出不打断）——详见 `references/design-guidelines.md`；量化令牌（22/17/15/14/12pt、热区 7–9mm、设计稿 375/390、弹窗 1.5s 等）见 `design-tokens.md` §7。

## 项目实现备注（与 qingba 代码对齐）
- **字号缩放已落地（驱动源＝微信字体设置）**：实际页面用 `calc(34rpx * var(--fs,1))` 派生，`--fs` 由根节点 `fs-*` class 切换；**档位不再由页内手动选择，而是读微信的字体大小设置后归并**——`wx.getAppBaseInfo().fontSizeScaleFactor`（约基础库 2.26.0 起返回，标准档为 `1`，判断须用 `typeof === 'number'` 而不是真值判断），老基础库回退 `fontSizeSetting ÷ 平台基准`（Android 16 / iOS 17）。官方《小程序适老化设计指南》明确建议「根据用户的微信字体大小设置，对小程序进行适配」，但 **`rpx` 本身不跟随**（只跟屏宽），必须像这样主动读 + 映射。**微信没有提供字号变化的监听 API**，靠各页 `onShow` 重新下发（沿用 `app.applyFontLevel`），用户改完设置切回小程序即生效。上限压在 `1.3` 一档——官方同页警告字号过大会导致文字溢出 / 截断 / 横向滚动。
- **深色固定 `dm-auto`**：`dm-light` / `dm-dark` 两个手动档已移除（`.dm-auto` 及二者的规则体仍保留在 `app.wxss`，属**休眠机制，不要删**）。导航栏 / tabBar / 下拉背景由 `app.json` 的 `darkmode` + `theme.json` 渲染，**框架级、JS 碰不到**，所以内容区若还跟手动档，必然出现「导航栏浅、内容深」的割裂。
- **开关一律用原生 `<switch>`**：早期自绘的 iOS 胶囊开关 `.switch`（曾用于深色模式选择页）已随该页删除，项目内不再有 `.switch` 样式，勿再引用（见原语 6）。
- **单元格间分隔线（项目实现）**：qingba **不用** `border-bottom`，也**没有** `.cell-divider` 兄弟节点（那是早期方案，代码中早已不存在，旧文档里的相关描述已作废、勿再引用）。现行做法是纯 CSS、wxml 里不插任何节点：`.weui-cell::before` 画 cell 之间的缩进线（`left:32rpx`、`first-child` 不显示），`.weui-cells::before/::after` 画分组上下通栏线——两者都是 `height:1px` + `background:var(--divider)` + `transform: scaleY(0.5)` + `transform-origin: top|bottom`。
- **`.cell` 行高由 modifier 提供（项目实现）**：qingba 的 `.cell` 基类**不设** `min-height`；行高由 `cell--single`(min-height 110rpx≈55pt) / `cell--desc`(146rpx≈73pt) 提供，每个 `.cell` 必须挂其一，否则无高度。
- **间距工具类 `.mb-16`**：`app.wxss` 提供 `.mb-16 { margin-bottom:16rpx }`，按需扩展 `mb-8`/`mb-24`，用于卡片/分组间统一留白。
- **列表分组间距（项目实现）**：`.weui-cells` 容器**不设 `margin-top`**（避免与上层卡片/分组间距叠加，分组留白改用 `.mb-16` 工具类或父容器 padding 控制）。`.weui-cells__title`（分组标题）的 `margin-top`/`margin-bottom` **均已合入 `padding`**（当前 `padding: 32rpx 32rpx 6rpx`：上 32rpx = WeUI 标题 margin-top 16px，下 6rpx = WeUI margin-bottom 3px），不再使用任何 margin——目的是让深色模式下卡片背景连续铺满、避免标题上下露出页面底色。新代码如需分组标题与内容之间留白，统一用 `padding` 而非 `margin`。
- **项目 CSS 变量**：`--bg/--card/--card2/--text/--text2/--text3/--divider/--brand/--danger/--cell-active` 对应 WeUI 的 BG-0/BG-2/BG-3/FG-0/FG-1/FG-2/FG-3/BRAND/RED/BG-COLOR-ACTIVE（见 `design-tokens.md` 末节映射表）；早期 `--text4` 已并入 `--text3` 移除，勿再引用。
- **浮层弹层必须自带主题 class（项目约定，易漏）**：`dm-auto` 只挂在页面根节点 `.container` 上，`page` 上仅有浅色基础变量（`@media (prefers-color-scheme: dark)` 只覆盖 `background-color`，未覆盖变量）。因此任何 `position:fixed` 的蒙层/弹层若写在 `.container` 之外，其内部所有 `var(--*)` 都会回落到浅色基础值——**系统深色时弹层整体发白**（手动深色档已移除，这是现存唯一的触发路径）。所有弹层根节点统一写作 `class="xxx-mask {{fontClass}} {{darkClass}} <显示态class>"`（现有：`pages/records` / `pages/stats` 的滚轮弹层 `.mp-mask`，以及六个半屏弹层共用的 `components/half-sheet` 之 `.hsc-mask`；早期各页私有的 `.sheet-mask` / `.pm-mask` / `.hs-mask` 已随组件化清理，勿再引用）。新增浮层必须照此办理。
- **原生 `picker-view` 蒙层与选中框（项目约定）**：组件内置的上下蒙层是固定白色渐变，深色下会在卡片上留下灰白块，且不吃 CSS 变量。写法固定为 `<picker-view indicator-style="height:80rpx" indicator-class="mp-pv-indicator" mask-class="mp-pv-mask">`；`.mp-pv-mask` 用 `background-image:none!important; background-color:transparent!important` 去掉内置蒙层；`.mp-pv-indicator` **只能保持透明背景 + `var(--divider)` 上下细线**，切勿设 `background:var(--card2)` 之类不透明底色——indicator 覆盖在内容层之上，实色底会把选中行整行文字盖住（已踩坑，表现为深色下选中项「消失」），选中态靠上下两条主题色细线标识。
- **`.group-title` 项目取值（与规范差异）**：全局 `.group-title`（`app.wxss`）`padding: 32rpx 32px 16rpx 32rpx`，**右内边距是 `32px`（像素）而非 `32rpx`**（疑似笔误）；新代码建议统一为 `32rpx`。
- **扁平纯色，禁止渐变 / 外发光（项目约定）**：所有色块 / 标签 / 按钮一律用扁平纯色（`var(--brand)`、固定 HEX 或低透明叠加），**禁止 `linear-gradient` 与 `box-shadow` 外发光**；深色档同理用纯色低透明（如 `rgba(7,193,96,.14)`）替代渐变。
- **`.weui-tag` 不带 margin（项目约定）**：标签间距由父级 flex `gap` 控制，避免与 `tag-group-*` 等内联背景 / 多标签混排时多出右侧空白；新增标签复用全局 `.weui-tag`，不在页面内重复定义。
- **彩色标签的配色集中在 `app.wxss`（项目约定）**：记录标签（`.tag-stage` / `.tag-group-*` / `.record-remark` / `.record-backfill`）的**浅色档与深色档写在「记录标签配色」一节内、上下相邻**（深色档为 `.dm-dark .*` + `@media (prefers-color-scheme: dark) { .dm-auto .* }` 两套），页面 wxss 只留父级尺寸收紧。曾因浅色在页面级、深色在全局而分开维护，漏补 `.tag-stage` 深色档 —— 深色下「常规N」保持浅金底 `#fff7e6`，在 `#191919` 卡片上亮成一块。相邻语义的标签在深色档要错开一档色相（阶段金棕 `#e6a23c` vs 科普拓展琥珀 `#ffd666`）。详见 `components.md` 原语 10。
- **分组块的通栏分隔线（项目约定）**：相邻分组用分组块容器（如 `.res-list`）的通栏线分隔（展开/折叠均生效），末组 `:last-child` 去线；区别于 cell 内 `left:32rpx` 缩进的行间线。**画法必须走细线统一方案**：容器自身的 `border-bottom` 加不了 `transform`（`scaleY` 会把整组内容压扁），故改由 `.res-list::after` 伪元素画底边——`height:1px` + `background:var(--divider)` + `transform: scaleY(0.5)` + `transform-origin: bottom`。
- **「当前项」高亮用 cell 级底色，禁止容器级染色（项目约定）**：列表中某项需要底色区分时（如路线页 `.current-cell`），底色加在**单个 cell** 上，**不要**加在 `.weui-cells` / 分组容器上——容器染色会连带同组其他状态的行一起变色，导致「当前 / 已完成 / 未解锁」失去区分度。深色覆盖同样挂在 cell 级选择器上。
- **`.weui-cells` 容器保持 WeUI 默认外观（项目约定）**：不要在页面里给 `.weui-cells` 设 `background: transparent`，也不要用 `::before/::after { display:none }` 隐藏通栏线。前者会盖掉 `.weui-cells` 自身的 `background-color: var(--card)`，使该分组透出页面底色；后者让它变成无边界裸块，与同页其他分组（白底 + 上下通栏线）外观不一致。分组需要视觉区分时，改 cell（见上一条），不改容器。
- **iconfont 维护方式（项目实现）**：`app.wxss` 以 `@font-face` 内联 base64（ttf + woff 双格式，woff 的 MIME 用 `application/font-woff` 以兼容开发者工具内置旧 Chromium），全局注册字族 `iconfont`，随 WXSS 注入每个页面 webview 而跨页生效。新增图标需更新 `assets/fonts` 源文件，用 `scripts/gen_iconfont_base64.ps1` 重新生成 base64，再替换 `app.wxss` 的 data URI 并补 `.icon-*:before` 映射。
- **分享入口（项目实现）**：分享文案与落地页集中在 `utils/share.js`（`appMessage()` / `timeline()`），各页只声明场景 key——**转发落地页统一首页**（新用户点开即欢迎卡引导选起点），朋友圈只对纯内容页「关于」开放；**页内不放分享按钮** —— 转发只走右上角菜单（「关于」页那枚 `open-type="share"` 按钮已移除，与菜单功能完全重复且会抢内容注意力）。能力边界见 `design-guidelines.md` §六。

## Resources
### references/
- `design-tokens.md` — 配色（浅/深）、字号、间距、圆角、分隔线、项目变量映射（单一事实来源）。
- `components.md` — WeUI 组件原语（按钮 / cells·cell / 表单 / 开关 / 单选·多选 / 弹窗 / 导航栏 / 徽标 / 图标 / 时间线 / 看板 / 选择器弹层（含原生 `<picker>` 与自绘 `picker-view` 的取舍）/ 双列选择弹层（左分组 / 右资源）/ 左滑操作 / 文章页排版 / 半屏弹层与弹层表单（含 components/half-sheet 与 .form-* / .seg-* 一族））及本项目已有原语对照。
- `design-guidelines.md` — 微信官方设计指南的原则层：四大设计原则、视觉规范指针、导航 / Tab、加载与结果反馈、异常与层级、分享入口与单页模式能力边界（§六）、字号与深色跟随系统 / 微信（§七）、落地自检清单（§八）。

### scripts / assets
（暂不需要）

---
## TODO：待补充
- （已补充）微信官方《小程序设计指南》原则层 → `design-guidelines.md`；量化令牌 → `design-tokens.md` §7。
- （已补充）care 模式（适老/关怀模式）配色档 → `design-tokens.md` §8（来源 `theme/vars/care-*.less`）。
- （已核对）`design-tokens.md` 全部颜色/字号/间距/圆角/组件尺寸已对照 `D:\github\weui\src` 源码订正（含深色 `BG-COLOR-ACTIVE` 改为 `overlay(...)`、dialog 标题字重 500、正文 FG-1 等）。
- （已定案）**细线统一方案**：全站分隔线 / 细边框统一为 `1px` + `transform: scaleY/X(0.5)` + `transform-origin`（WeUI 与 TDesign 官方同款，见 `components.md` 原语 1/2 的官方范式）。两个历史坑已写入「分隔线」条与 `design-tokens.md` §5：① `1rpx` 是小数尺寸，真机被吸附舍成 0 → 线整条消失（只在真机复现）；② `scaleY` 漏写 `transform-origin` 会因默认原点 `center` 漂移——旧文档「`scaleY` 已弃用」的结论即源于此，已订正。**遗留**：`.seg-item` 仍用 `2rpx`（四边边框，要细线化需 TDesign 的 surround 伪元素方案）、`.mp-pv-indicator` 直用 `1px`（80rpx 高选中框不能缩放）。
- 完整 Dialog / ActionSheet / Toast / Half-screen Dialog 的内联 wxml 模板（目前给了 token 与结构范式，精确内边距以 WeUI 源码为准）。
- （已补充）滚轮选择器 `picker-view` 半屏弹层 → `components.md` 原语 19（含蒙层 / 选中框的深色覆盖写法）。
- （已补充）文章页排版（`.weui-article` 层级 / 列表语义，3.7.2 起照 WeUI 官方 article 数值）→ `components.md` 原语 21；分享入口与单页模式能力边界 → `design-guidelines.md` §六；22pt 文章标题档 + 20pt 文章章节档 → `design-tokens.md` §9。
- （已补充）双列选择弹层（左分组 / 右资源，`components/resource-picker`）→ `components.md` 原语 22：三档高度公式与「不要用内容 auto 撑开」的原因、左右同白底与列间竖线、两列统一的「品牌绿文字 + 行尾对勾」选中态。
- 滑块（字号实时预览）、Gallery、Grid、Steps、Progress、Loading 等组件规范。
- 图标规范（功能图标尺寸 / 风格 / 与 iconfont 字号的协调）。
