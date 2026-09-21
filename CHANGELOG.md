# 更新日志

本项目所有重要变更都会记录在此文件中，格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [3.7.2] - 2026-09-21

> 修复深色模式下打卡记录列表「常规N」标签底色过亮（该标签漏补深色档）；「关于」页移除页内分享按钮、修掉深色下「加粗几乎看不出」的问题，并把整页排版改为照 WeUI 官方 article 数值。

### 修复

- **深色模式下「常规1」等阶段标签底色过亮（`app.wxss` / `pages/records`）**：记录标签的浅色档原先写在页面级 `pages/records/records.wxss`、深色档写在全局 `app.wxss`，两边分开维护 —— `.tag-group-*`（9 个分类）与 `.record-remark` 都有深色档，**唯独漏了 `.tag-stage`**，深色下它仍是 `#7a5200` / `#fff7e6` 的浅金底，落在 `#191919` 卡片上亮成一块，看起来像被高亮选中。
  - 标签配色（`.tag-stage` / `.tag-group-*` / `.record-remark` / `.record-backfill`）整体收敛到 `app.wxss`「记录标签配色」一节，**浅色档与深色档上下相邻**；`pages/records/records.wxss` 只保留页面自己的尺寸收紧（`.record-tags .weui-tag`）与一条指路注释，消除「只改一边」的温床
  - 阶段标签深色档取**金棕 `#e6a23c`** / `rgba(230,162,60,.16)`：**与「科普拓展」的浅琥珀 `#ffd666` 刻意错开一档**（两者浅色档本就近乎同色，深色档若取同值，同排出现时无法区分）
  - 其余标签的浅色 / 深色取值未改动（纯搬迁，零视觉变化）；`.record-remark` 的单行截断（`overflow` / `white-space` / `text-overflow`）随颜色一并搬移，避免同一选择器被拆在两个文件里
- **同步更新设计规范（`.codebuddy/skills/ui-design-spec`）**：`SKILL.md`「标签 / 徽标」条与「项目实现备注」、`references/components.md` 原语 10 补上「彩色标签的浅 / 深两档必须写在一起」「相邻语义的标签在深色档错开一档」两条约定

### 变更

- **「关于」页移除底部「分享给好友」按钮（`pages/about`）**：微信右上角「···」菜单里恒有「转发给朋友」，与页内按钮**功能完全重复**；且它是文章页里唯一的行动块，会把注意力从内容拉到「帮我传播」，与纯内容页的定位冲突。**分享能力不受影响** —— 被分享到朋友圈的前提是页面 js 同时声明 `onShareAppMessage` + `onShareTimeline`（二者保留），与页面上有没有按钮无关。
  - 删 `<view class="about-share">` 整块（按钮 + `__tip` 说明行）与 `.about-share` / `.about-share__tip` 两条样式
  - `about.js` 的 `singlePage` 状态与 `isSinglePage()`（`wx.getLaunchOptionsSync` 判定 `scene === 1154`）失去唯一用途，一并移除；两个分享声明原样保留
- **深色模式下「加粗」几乎看不出（`pages/about`）**：`__strong` 与正文**颜色完全相同**（都是 `--text`，深色档 = 80% 白），唯一差别是 `font-weight: 600`，三点叠加导致强调失效 ——
  - **字重 `600` → `700`**：Android 系统字体（Roboto）只有 400 / 500 / 700 三档，`600` 会被就近映射、真机可能落到 500/medium，等于没加粗；`700` 是两端都确定存在的 bold 档
  - **深色档强调色提亮到纯白 `#fff`**（`.dm-auto` + `@media (prefers-color-scheme: dark)` 成对书写）：深色正文只有 80% 白，强调与正文同色时单靠字重区分本就不够，白字在暗底还有光晕扩散，必须靠亮度台阶拉开
- **「关于」页排版改为照 WeUI 官方 article 数值（`pages/about`）**：此前 h2 被压回正文档（34rpx）、段距只有 16rpx，章节层级靠「间距 + 字重」硬撑，深色下整页糊成一片。现按官方 `weui-article.less` 逐条对齐 ——
  - **`h2` 34rpx → `40rpx`(20px)/500**（官方 h2 就是 20px，**比正文大一档**），这是章节能被一眼认出的根本；**新增一个字号档**（`design-tokens.md` 已补，仅文章页用）
  - **段落 `margin-bottom` 16rpx → `48rpx`**（官方 24px）；正文 `line-height` 1.65 → **1.6**
  - **`h1` 改居中 + 下距 96rpx**（官方 `text-align:center` / `48px`）；`h4` **700 → 400**（官方不加粗，靠间距）、`h3` 与阶段名改 **500**（官方档，且 Roboto 有真实 Medium）
  - 容器 padding `48rpx 32rpx 40rpx` → **`96rpx 48rpx`**（官方 48px 24px）；列表缩进 32 → 40rpx（官方 1.2em）、列表下距 16 → 48rpx；方式分区 40 → 64rpx（官方嵌套 section 32px）
  - 章间距仍与官方一致（96rpx）：`__section` 的下距与 `h2` 的上距相邻时会合并（margin collapsing）；若某环境不合并、出现 192rpx 双倍间距，把 `h2` 的 `margin-top` 改 `0` 即可
  - 说明：WeUI 官方 article 是**纯 CSS + 语义标签**（`h1`/`p`/`section`），小程序 wxml 没有这些标签，故只能照搬数值、沿用项目自建的 `.weui-article__*` 类名；官方小程序组件库里也没有 article 组件。**层级靠字号差 + 留白，不靠字重与边界元素** —— 中途试过「h2 品牌绿竖条 + 章间细线 + 阶段参考卡片化」，深色下收益低、观感碎，已全部回退
- **文章页排版结构改为 token 驱动（`pages/about/about.wxss`）**：把「字号 / 行高 / 字重」收成 `--art-*` 三件套（`--art-h1…h4` / `--art-body` / `--art-note` 及各自的 `-lh`、`-w`），间距收敛为 `--art-gap-para/block/section`（48 / 64 / 96rpx），各元素只引 token 名；行高由 `line-height: 1.6` 倍率改为**与字号成对写死的 rpx**（仍乘 `--fs`，实测渲染差 < 2rpx）。**数值一律未变，纯结构重构**
  - 做法借自 TDesign Typography（其小程序端没有 `typography` 组件，是 `title` / `paragraph` / `text` 三个组件共用 `.t-typography` 类名）—— **只借做法不借数值**：TDesign 默认正文仅 14px（`--td-font-body-medium` 28rpx）、标题一律 `font-weight: 600`、`h4` 档（`title-large` 36rpx）与正文几乎贴平、`h6` 档（28rpx）比正文还小，属「App 界面层级」而非「长文阅读层级」；照搬会让正文变小、段距从 48rpx 收到 32rpx，并让 `strong` 退回 `600` 而复发 Android 字重坑
- **文档同步（`.codebuddy/skills/ui-design-spec`）**：`SKILL.md`（按钮条 / 文章页排版 / 分享入口）、`references/components.md` 原语 21（官方数值出处、层级靠字号差、h4 不加粗、已否掉的边界元素路子、强调档两条硬约束、结尾动作区改为「不设页内分享按钮」）、`references/design-tokens.md`（新增 `40rpx` 文章章节档 + 文章页取值说明）、`references/design-guidelines.md` §六与落地自检清单

## [3.7.1] - 2026-09-20

> 修复半屏弹层（`half-sheet`）在真机上的隐藏态残留：弹层关闭后，输入框的 placeholder 仍留在屏幕底部（阶段页 / 目标时长页 / 我的资源页各一处）。

### 修复

- **弹层隐藏后输入框 placeholder 残留在页面上（`components/half-sheet`）**：外壳是「常驻挂载 + `show` 切 class」，隐藏态原先只有 `visibility: hidden` + 面板 `translateY(100%)`。**真机上 `input` 由原生层绘制，既不吃父级的 `visibility`，也不吃 `transform`** —— 于是弹层关闭后，面板里的普通视图全部隐藏，唯独几个输入框的 placeholder 还停在「未变换时的布局位置」（屏幕底部），看起来像页面上凭空多出几行「请输入」。
  - 隐藏态补第三态 `display: none`（`.hsc-hidden`）：把整块从渲染树里移除，原生层随之销毁
  - **挂 / 摘该态由 js 控时序**，避免把过渡动画吞掉：**打开**先摘掉 `display:none`、隔一帧（20ms）再挂显示态，滑入过渡才生效；**关闭**先播 250ms 滑出动画、走完（260ms）再挂上；`detached` 清定时器
  - 组件内不再用 `show` 直接驱动 class，改为内部状态 `shown`（滑入 + 蒙层）/ `hidden`（`display:none`）两态
  - 一处修复覆盖全部 6 处弹层：`pages/stage`（打卡 / 晋级）、`pages/targetSetting`、`pages/myResources`、`pages/home`（今日明细）、`components/resource-picker`
  - 已填数据不受影响：`display:none` 只是不渲染，页面 data 仍在 —— 打卡弹窗填了时长再关掉重开，内容照常回填
- **「我的资源」可能出现两边都不渲染的空白页（`pages/myResources`）**：列表与空态原先按 `total === 0` 判断，而列表实际由 `sections` 决定 —— 一旦「有资源、但没有任何分组被列出」，页面既不渲染列表、也不渲染空态，整页空白。
  - 模板改为按 `sections.length` 判断，`isEmpty` 同步改成同一口径（当前 `total > 0` 必然有 sections，属防御性加固）

## [3.7.0] - 2026-09-20

> 「我的资源」归属与记录 / 统计页的选择器统一改用**原生 picker**；阶段进度分母改为**可配置**（默认取建议区间上限，可逐阶段自定义）；分享进入不再先看封面广告。
> 可用 `git log v3.6.0..v3.7.0` 查看对应提交范围。

### 变更

- **「我的资源」弹窗的归属改为两行原生 picker（`pages/myResources`）**：原先是「归属」一行 → 跳整页单选页选「阶段 + 分组」再返回；现在直接在弹窗里拆成「阶段」与「分组」两行原生 `<picker>`，**切阶段会重建分组列表并把下标归零** —— 各阶段的分组集合本就不同（如「科普拓展」只在常规6 与准桥梁有），沿用旧的固定列表会选到该阶段不存在的分组。
  - 编辑资源时若目标分组不在当前列表（典型：熏听开关被关掉），补一行占位再选中，避免静默落到第一个分组、一保存就把资源挪走
  - 页面 `pages/resourcePicker`（整页单选：阶段 + 分组）随之失去唯一入口，已删除：`app.json` 注销 + 4 个文件移除
- **分享进入不再展示封面广告（`utils/share.js`）**：转发路径统一追加 `isShowSplashAd=false`（新增 `_withoutSplashAd()`：已有 query 时用 `&` 拼接、已带该参数则不重复追加），新用户从分享卡片进入时第一眼是首页欢迎卡而非开屏广告。官方限制：仅对支持自定义路径的场景生效（单聊 / 群聊消息卡片），需安卓微信 8.0.37+ / iOS 8.0.40+ / 基础库 2.32.3+，旧客户端仍可能展示；未开通封面广告时该参数无害
- **打卡记录页的月份选择器改用原生 picker（`pages/records`）**：原为自绘两列 `picker-view` 弹层（遮罩 + 标题 + 取消 / 确定 + 一整套 `.mp-*` 样式），现改为 `<picker mode="date" fields="month">`，可选范围由 `start` / `end` 锁在「今年 -3 年 1 月」~「当前月」（不可选未来）。删掉弹层 DOM、四个弹层方法、已无引用的 `noop()` 与 `.mp-*` / `.overview-arrow.up` 样式（约 2100 字符）。代价与其他原生选择器一致：系统弹层不吃 `dm-*` / `--fs`
  - 顺带修掉一个既有 bug：`applyBackfill` 的正则多写了结尾锚点（`/^(\d{4})-(\d{2})$/`），对补录页传来的 `YYYY-MM-DD` 永远匹配不上 —— 除了「补录当月」，补录后都不会自动切到补录月份
- **数据统计页的阶段选择器改用原生 picker（`pages/stats`）**：自绘半屏滚轮弹层（`.mp-*`）改为 `<picker mode="selector">`。**连带删掉一整套 canvas 规避逻辑** —— canvas 是原生组件、层级恒在普通视图之上，原实现必须「打开弹层前 `dispose` 图表 → `wx:if` 摘掉 canvas → 用 CSS 骨架（`buildRadarClips` / `estimateRingBox` / `.chart-skel` / `.skel-*`）顶替」；系统弹层天然盖在 canvas 之上，这套办法全部不再需要，图表也不会再因开一次弹层而重建。共删约 190 行（js 三个几何函数与调用、wxml 两处骨架、wxss 骨架与弹层样式）
- **阶段进度的分母改为可配置，新增「阶段目标时长」设置页（`pages/targetSetting`）**：分母原先是 `time_investment` 区间的**下限**（60-80H 取 60），现改为两层结构 ——
  - **默认档位**（`lower` / `upper`）：一个值管所有「未单独设置」的阶段，默认取**上限**（60-80H 按 80H、80-100H 按 100H），与「关于」页「每阶段时间投入需按 80H 来算」的建议对齐
  - **各阶段自定义**：某阶段单独填了小时数就压过默认档。**覆盖值是绝对值、不与档位联动** —— 调默认档不会改变已自定义的阶段；弹层里「恢复默认」清除覆盖后重新跟随默认档
  - 存储：`qingba_target_mode` + `qingba_target_custom`（`{ [stageId]: hours }`，逐项过滤非正数，脏数据静默丢弃）；读取侧 `checkin.getTargetOption(stageId)` 透传给 `getRequiredHours(stage, opt)`，`route` / `stage` / `home` 三处进度仍走同一处口径。**常规6 / 准桥梁按当前阶段自身时长评估的口径不变**（覆盖只对 `type='stage'` 生效，`accumulated` 分支不受影响）
  - ⚠️ **默认档位由下限改为上限是行为变更**：常规1/2/3 与准桥梁的进度百分比会当场下降，已攒够旧下限但未晋级的用户会从「可晋级」退回「未达标」（常规4/5/6 的 `"60H"` 无区间，两档同值，不受影响）。已标记完成的阶段不会回退（`getCompletedStages` 独立存储）；设置页随时可切回「下限」恢复旧口径
  - 入口在「设置 → 学习设置 → 阶段目标时长」，右侧显示当前档位与自定义阶段数（如「上限 · 2 项自定义」）；导出 / 导入备份带上 `target_mode` 与 `target_custom`（沿用「缺字段不覆盖」惯例）
- **进度相关的展示补上生效目标**：路线页「当前阶段」行在阶段名下方补一行「目标 80H」，阶段详情页晋级按钮上方补「已投入 12.5h / 目标 80h」—— 分母不再恒等于官方区间下限，只留官方区间原文会让用户困惑「写着 60-80H 却要攒到 80」。官方建议区间（`time_investment`）仍原样显示在路线行与阶段页标题里；「关于」页的建议文案保持原样
- **弹层表单卡片的底色与按压反馈（`app.wxss` 的「弹层表单」原语）**：`.form-card` 的底由 `--card` 改为 **`--card2`** —— 它与半屏弹层面板同色时，卡片的边界、16rpx 圆角与左右 32rpx 内缩全都读不出来（圆角是死样式，那点内缩只像「没和弹层标题对齐」）；低一档后弹层里才有了「块」的层次。**四个弹层同时生效**：目标时长 / 打卡 / 晋级测试 / 添加编辑资源
  - 连带把 `.form-row:active` 的按压色由 `--cell-active` 换成 **`--divider`**：前者是按 `--card` 底选的「一档」，落在 `--card2` 上只剩 11 个色阶（按住几乎无反应）；`--divider` 浅色 `#e5e5e5` 差 18、深色 `rgba(255,255,255,.1)` 叠在 `#202020` 上差 22，与原先落在 `--card` 上的手感相当
  - `.seg-item:active` **不动** —— 它自带 `--card` 白底，按压前后是「白 → `--cell-active`」差 19 个色阶，与容器底色无关。判据：**透明底的元素按压色跟容器底配，自带底色的元素跟自己的底配**（与 `--btn-default` 必须保持半透明同源）
  - 深色档 `--card2`(`#202020`) 比 `--card`(`#191919`) **亮**，与浅色档相反：`.seg-item` 在灰卡上浅色呈凸起、深色呈凹陷，方向不一致但两边都能看清边界，暂不处理；`.seg-active` 的选中态反而因此更清楚

- **半屏弹层抽成公共组件（`components/half-sheet`）**：打卡 / 晋级测试 / 目标时长 / 添加编辑资源 / 今日明细 / 资源选择六处弹层的外壳完全同构 —— 蒙层 + 面板 + 抓手 + 头部（标题左 / 关闭右）+ 可选操作区，此前每处各写一份，重复约 300 行。现收敛为一个组件，只封装外壳，内容与操作区分别走默认 slot 与 `footer` slot（slot 内容由页面编译，其样式本就不归组件管，故组件不提供任何内容级样式）
  - 属性 `show` / `title` / `showClose` / `maskClosable` / `fontClass` / `darkClass` / `sheetClass` / `footer`；事件 `bind:close`（点蒙层与关闭按钮都触发）
  - `styleIsolation: 'apply-shared'`：使用方需要通过 `sheetClass` 定制面板 —— `resource-picker` 的高度三档（`.h8` / `.h9`）与「左右内边距归零」正是靠它（默认 `isolated` 下这些类不生效）
  - 隐藏态由「透明 + `pointer-events: none`」改为 `visibility: hidden`（原实现只把面板透明化，它仍渲染在屏幕下方），`visibility` 参与 transition，滑出动画结束才真正隐藏
  - 迁完 `pages/stage`（打卡 + 晋级）、`pages/targetSetting`、`pages/myResources`、`pages/home`、`components/resource-picker` 共 6 个弹层；各页删掉重复的外壳样式合计约 380 行，并顺带清掉三处冗余的 `.xxx .weui-btn { flex: 1 }`（全局 `.weui-btn-area_inline .weui-btn` 早已覆盖）与四个页面里已无引用的 `noop()`
  - 组件化顺带统一了两处此前不一致的取值：标题下间距一律 24rpx（打卡弹窗原为 28rpx）、标题字重一律 600
  - `resource-picker` 的面板固定占高由 172rpx 调整为 168rpx（头部下间距统一为 24rpx 后重新推导），高度档公式与注释同步更新
- **弹层内容层的公共原语（`app.wxss` 新增「弹层表单」原语；`pages/stage` 晋级弹窗改造）**：`half-sheet` 只封装外壳，内容样式此前没有公共原语，于是 `form-*` / `seg-*` 一族在三页各存一份、而晋级弹窗自带第四套 `.pm-*`，同一个页面上两个弹层观感不一致。
  - `form-card` / `form-row` / `form-row-static` / `form-label` / `form-label-muted` / `form-right` / `form-field` / `form-unit` / `form-static` / `seg-control` / `seg-control-grid` / `seg-item` / `seg-active` 提升到 `app.wxss` 的「弹层表单」原语（三份取值本就一致，只是子集不同），`pages/stage` / `pages/myResources` / `pages/targetSetting` 删掉本地副本；`myResources` 的 `.form-value-text` 并入 `.form-static`（两者只差一个冗余的 `text-align`），以及删掉两处冗余的 `.form-card .weui-divider` 覆盖（全局 `.weui-divider` 本就是 1px + scaleY(0.5)）
  - 晋级测试弹窗改用公共原语，删掉 `.pm-form` / `.pm-quick-*` / `.pm-actions` / `.pm-btn` 约 92 行：表单区改 `.form-card` 三节（晋级要求 / 测试结果 / 快捷值）+ `.weui-divider` 分节，快捷值改 `.seg-item` 并**新增选中态**（输入内容与该阶段目标 phase 一致时高亮；为此 `stage.js` 补了一个 `promoteTargetPhaseStr`，因为 wxml 里不能调 `String()` 做比对），底部按钮改 `.weui-btn-area_inline`（高 88→96rpx、圆角 16→8px、间距换成 `gap: 32rpx`，与打卡 / 目标时长弹窗一致）
  - 阶段名并入弹层标题（`title="{{stage.stage_name}} · 晋级测试校验"`），原先独立的浅灰「阶段说明块」`.pm-stage-info` 取消、说明句改用全局 `.weui-cells__tips` —— `stage.wxss` 的 `.pm-` 前缀至此彻底清零，弹层结构与「目标时长」弹窗完全同构
- **表单行高与输入框高度统一到同一口径（`app.wxss` 弹层表单原语 + `pages/editRecord`）**：同一张卡片内的行高此前参差 —— `.form-row` 的内容区只有 56rpx（88 − 上下 padding 32），而 `.form-field` 是 64rpx，于是「有输入框的那一行」被撑到 96rpx、邻行仍是 88rpx（真机上量到的 49pt vs 45pt 就是这个差）。`editRecord` 更明显：`.weui-cell` 的 `padding: 32rpx` 配 64rpx 输入框把时长 / 备注行撑到 128rpx，比同页其他行（112rpx）高 16rpx。
  - 统一口径取 **行高 112rpx + 输入框 88rpx**：112rpx 是 WeUI 的 cell 标准行高（`@weuiCellHeight: 56px`），也是 `backfill` 早已在用的值；88rpx（44pt）是项目「可点项最小热区 ≥ 88rpx」的取值，同样是 `backfill` 的 `.bf-dur-input` 取值
  - 弹层表单：`.form-row` 的 `min-height` 88→112rpx、上下 `padding` 16→12rpx，`.form-field` 的 `height` 64→88rpx（88 + 12×2 = 112，输入框正好占满内容区）
  - `editRecord`：页面级把 `.weui-cell` 的上下 `padding` 由 32rpx 收到 12rpx、`.cell-input` 的 `height` 64→88rpx —— 时长 / 备注行由 128rpx 收到 112rpx（行更紧凑），输入框反而从 64 长到 88rpx（热区更大）
  - 代价：各弹层每行长高 24rpx，3 行的弹层（打卡 / 目标时长 / 晋级 / 添加编辑资源）各高约 72rpx
  - 至此全项目表单行高与输入框高度各只有一档：行 `.weui-cell` / `.bf-row` / `.rp-group` / `.form-row` 全是 112rpx，输入框 `.form-field` / `.cell-input` / `.bf-dur-input` 全是 88rpx

### 修复

- **设置页「我的资源」显示「N 项」、点进去却是空的（`pages/myResources`）**：计数用的是「全部自定义资源」（`customResources.countAll`），而管理页只按 `resources.getStageGroupKeys()` 的**可见分组**渲染 —— 熏听开关默认关闭时会过滤掉熏听分组，挂在它下面的资源就成了「计数可见、列表不可见」，用户会以为资源丢了（典型场景：刚挂了两条熏听素材，回设置页显示 2 项，进去一片空白）。
  - 管理页渲染集合改为「该阶段可见分组 ∪ 已挂有资源的分组」：隐藏分组照常列出，资源可正常改名 / 改归属 / 删除
  - 隐藏分组加「已隐藏」标记 + 一句说明（资源仍保留；开启「设置 → 熏听」后可在阶段页打卡）
  - 阶段页仍按开关隐藏该分组 —— 那是打卡视图口径，与管理页「必须能看到并管理全部数据」的取向不同，是有意保留的差异
- **补录页 / 编辑记录页的「日期 / 阶段（/ 资源）」之间没有行间线（`pages/backfill` / `pages/editRecord`）**：全局行间线是 `.weui-cell::before` 画线 + `.weui-cell:first-child::before { display: none }` 关掉首行，而这几个 cell 都被 `<picker>` 包了一层 —— **每个 cell 都成了自己父容器的首个子节点**，于是两行（`editRecord` 是三行，资源行一起）的线一起被关掉。原先补的 `.cell-first::before { display: none }` 因此是死代码，注释里「:first-child 判不到」的因果也写反了（不是判不到，是对每一行都判到了）。
  - 改法反过来：给非首个 picker 里的 cell 显式开线 —— `.weui-cells > picker:not(:first-child) .weui-cell::before { display: block }`（特异性 0,3,0 高于全局的 0,2,0，且页面样式加载在 `app.wxss` 之后）；两页的 `.cell-first` 死代码与 wxml 上的类名一并删除
  - 顺带把 `backfill` 第一个分组（日期 / 阶段）的容器由自绘的 `.bf-rows` 收敛为全局 `.weui-cells`（两者外观等价：同款白底 + `1px + scaleY(.5)` 通栏线）；`.bf-rows` 仍服务「学习内容」块 —— 那块的行不是 `.weui-cell`（资源名两行 + 时长输入 + 删除按钮 + 「＋添加一条」，内边距策略不同），刻意不一起收编

## [3.6.0] - 2026-09-18

> 新增「熏听」维度：设置页开关打开后，各阶段多出一个**熏听分组**（官方无素材，内容由「我的资源」自填），打卡时长按阶段系数折算为**有效时长**（牛1-2 不计入、牛3 ×0.5、牛4 及以后 ×0.8）；统计页雷达图轴数改为**按当前阶段分组数动态生成**。
> 可用 `git log v3.5.1..v3.6.0` 查看对应提交范围。

### 新增

- **「熏听」分组（`utils/data.js` / `utils/resources.js`）**：与主线绘本、主线分级同一维度，排在最后。
  - `LISTENING_GROUP_KEY = 'listening_audio'`，label「熏听」；七个阶段在 `data.js` 里统一补一个空数组作占位（「是数组」即分组存在，也是 `getStageGroupKeys` 的判定条件），**不在 `qingba_listening_route.json` 里改** —— 它属于程序占位、不属于路线内容
  - 官方没有任何熏听素材，内容由家长在「我的资源」里添加；`customResources.isGroupAvailable` 因占位空数组自动放行，资源归属选择页与阶段页 / 我的资源页的分组列表自动多出该项，无需各页改动
  - 分组色补一档蓝灰：`--dot-lis`（浅 `#607d8b` / 深 `#90a4ae`，`stage` 与 `myResources` 各三套变量）；`records` 标签浅 `#37474f` / `#eceff1`、深 `#b0bec5` + `rgba(176,190,197,.16)`（`.dm-dark` 与 `.dm-auto` 媒体查询成对书写）
- **熏听开关（`utils/checkin.js` / `pages/settings`）**：存储键 `qingba_listening_enabled`，照「小小优趣成长计划」的模板（`isListeningEnabled` / `setListeningEnabled`，**默认关闭**）。语义是**控制分组显示与录入**，不改历史统计口径。
  - 隐藏逻辑收敛在 `resources.getStageGroupKeys` 一处：关闭时过滤掉熏听分组，阶段页 / 我的资源 / 资源归属 / 资源选择弹层自动一致；已挂在该分组下的自定义资源只是看不到，**不删除**，重新开启即恢复
  - 备份导出 / 导入带上 `listening_enabled`（缺字段不覆盖）
- **时长折算（`utils/checkin.js`）**：打卡记录新增 `factor` 字段，写入时按「阶段 + 分组」固化；缺省为 1，故只在 ≠1 时落字段。系数表在 `data.js`：
  - 依据 about 页的时间计算 + 各阶段主线里的牛津树素材（实测：常规2 = L1-2、常规3 = L3、…、常规6 = L6、准桥梁 = L7）→ 常规N ↔ 牛N；常规1 无牛津树素材，落「牛1-2」档
  - `regular_1` / `regular_2` = **0**（可记录、不计入）、`regular_3` = **0.5**、`regular_4` ~ `regular_6` / `pre_bridge` = **0.8**
  - ⚠️ `0` 是合法系数，兜底一律用 `typeof r.factor === 'number'` 判断，**不可写 `r.factor || 1`**（会把 ×0 误判成 ×1）
  - 新增 `effectiveMinutes(record)`，所有读取侧统一走它

### 变更

- **统计与进度全部改按有效时长**：`getStageMinutes` / `getAccumulatedMinutes`（晋级判定）/ `getDayTotalsByStage`（阶段页徽标）/ `getResourceCheckinSummary` / `stats.buildViewModel`（排行榜 + 雷达图 + 分布柱图三块共用一处）/ `home` 的卡片与今日明细弹窗
- **编辑记录时重算系数（`checkin.updateCheckin`）**：原函数只做存储位置迁移，现按「新阶段 + 新分组」重算 `factor`（改阶段、改分组都要跟着变），非熏听则删掉该字段
- **阶段页打卡弹窗**：新增折算提示行（三档文案，随时长实时换算「X 分钟计 Y 分钟」）；本地累加的 `resTotals` 与分组今日时长改用有效时长；打卡成功的 toast 在熏听时补「（有效 X）」
- **补录页**：底部汇总在存在熏听行时显示「共 N 条 · 原始（有效 X）」；行块下补一条系数说明
- **编辑页**：时长行下补同款提示；回填时若记录的分组不在当前列表（典型：熏听开关被关掉），把该分组补成占位行 —— 否则会静默落到第一个分组，一保存就把这条记录的分组改掉
- **记录页**：熏听记录在原始时长后跟一个折算标记（`×0.5` / `×0.8` / `不计入`），与打卡弹窗单位旁的标记同一套语汇、同档字号（28rpx / `--text3`）；不再显示折算后的具体数值 —— 一行里出现两个数字反而不好扫读，具体数值由统计与进度体现
- **统计页雷达图改为动态轴**：轴集合 = 当前阶段显示的分组（含熏听开关判断）∪ 记录里出现过的分组（后者兜住官方分组调整后的历史数据，否则那部分时长「有数据没轴」）。轴数变化时 `setOption(option, true)`（notMerge），避免 ECharts 按下标合并导致旧轴残留 / 标签错位；轴数 < 3 直接不画
- **阶段页空分组提示**：熏听分组官方无素材，为空时显示「还没有熏听素材，去『设置 → 我的资源』添加」（其余空分组显示「该分组暂无资源」）

### 修复

- **×0 阶段的熏听打卡在阶段页「看不见」（`pages/stage` / `utils/checkin.js`）**：阶段页的徽标与分组今日时长此前按**有效时长**累计，而常规1/2 的熏听有效时长为 0 —— `if (min > 0)` 落空，于是「已打卡」副文与行尾徽标都不显示、分组头也停在「待学习」，与「可记录但不计入」的口径相反（家长会以为没记上）。
  - `getDayTotalsByStage` 改为同时返回 `minutes`（有效）与 `rawMinutes`（原始）
  - 阶段页改按**原始投入**判断与展示（徽标 /「今日已打卡 X 分钟」/ 分组今日时长），熏听行补一句「有效 24 分钟」，有效为 0 时显示「本阶段不计入」
  - 打卡后的本地累加同样拆成两个口径（`resTotals` 原始 / `resEffective` 有效），避免打卡瞬间数字跳变
  - 连带：首页今日明细的**时长**榜与统计页时长排行榜过滤掉有效时长为 0 的素材（次数榜保留 ——「打过一次」本身有意义），否则榜里会出现「0分钟」这种噪声
- **带 icon 的 `showToast` 标题被截断（`pages/stage`）**：打卡成功文案一度写成「已打卡 1h20m · 有效 48m」（超 7 个汉字），真机显示不全。现回到「已打卡 X」+ `success` 对勾，有效时长交由弹窗提示行与阶段页副文承载；同时把 `已达成目标：X` 压成 `已达成：X`（保留对勾）

### 文档 / 规范同步

- README：新增「熏听」一节（开关 / 系数表 / 折算口径与「阶段页按原始投入展示」的口径），设置「学习设置」补开关说明，阶段详情分组数与统计页雷达图描述同步，打卡记录补有效时长，结构树同步 `data.js` 与 `checkin.js` 职责

## [3.5.1] - 2026-09-18

> 资源选择弹层改为**按分组数自动取高**（不再固定 75vh，也不再支持拖拽），左列选中态统一为品牌绿对勾、左右同白底；编辑记录与补录两页继续做「分组标题收敛」——编辑页整页收成一块 cells，补录页收成「日期 / 阶段」+「学习内容」两块。
> 可用 `git log v3.5.0..v3.5.1` 查看对应提交范围。

### 变更

- **资源选择弹层高度按分组数自动取三档（`components/resource-picker`）**：原固定 `75vh`，7 个分组时底部空一大截、9 个分组时又可能装不下。
  - 高度改为 `calc(172rpx + 24rpx + 96rpx × var(--rp-rows) + env(safe-area-inset-bottom))`，`--rp-rows` 默认 `7`，`.h8` / `.h9` 取 `8` / `9`；**JS 只按分组数切 class**，不再量窗口、不再写内联 style
  - 每档 = 固定占高（上 padding 16 + 抓手 8+8+24 + 头部 56+28 + 下 padding 32 = `172rpx`）+ 行高 `96rpx` × N + 余量 `24rpx` + 安全区，即「**正好放下 N 个分组、左列不出滚动条**」
  - 余量 `24rpx` 用于吸收大字号档头部变高、`env()` 取整等几像素波动；分组数 > 9 时仍用 9 档，多出的分组由左列 `scroll-view` 滚动承担
  - **刻意不用「高度 auto 让内容撑开」**：左右两列都是 `scroll-view`，必须有确定高度才能滚动（`height:100%` 落在 auto 高度的父级上会形成循环依赖，iOS 上可能塌成 0）；且右列资源条数动态（自定义资源每阶段上限 50 条），撑开后会超出屏幕、被 `overflow:hidden` 裁掉，既看不到也滚不到
  - 中途曾实现「抓住抓手拖拽改高度 + 吸附三档 + 下滑关闭」，随后**整体移除**（自动档位已够用，无需用户手动调），`.rp-sheet` 的内联 style、`dragging` 态与抓手热区样式一并删除
- **资源选择弹层左列的选中与分栏表达（`components/resource-picker`）**：
  - 分组行高 `80rpx` → **`96rpx`**（原值是为「9 个分组塞进 70vh」让路，改为按内容取高后不必再压行高）
  - 选中态由「文字品牌绿 + 右侧竖线指示条」改为**「文字品牌绿 + 行尾品牌绿对勾」**，与右列资源项的选中勾同款；竖线样式（`.rp-group.active::after`）删除
  - **去掉左列灰底**（`.rp-body` 不再设 `--card2`）：左右同白底，分栏只靠列间那根 `scaleX(0.5)` 竖线表达
  - 分组名包一层 `.rp-group-name`（`flex:1` + 省略号），把选中勾推到行尾
- **编辑记录页整页收成一块 cells（`editRecord`）**：去掉「打卡信息」「学习记录」两个分组标题与两条 tips，日期 / 阶段 / 资源 / 时长 / 备注五行共用一块 `.weui-cells`。
  - 「选择阶段后可挑选分组与资源」的引导**收进资源行右侧文案**（未选阶段时显示「请先选阶段」）——该行此时是 `disabled`，删掉 tips 后若无替代，用户点了没反应会困惑；另一条「修改后会计入阶段时长与统计」信息量低，直接删
  - 时长 / 备注由自绘 `.form-card` 改为 `.weui-cell`（与上面同构），行间线交给 `.weui-cell::before`，`.weui-divider` 分节不再需要
  - **去掉快捷时长**（10/15/20/25/30 五个胶囊）与其 `quickDuration` 逻辑，本页 `.seg-*` 样式随之删除
  - **备注改为带行首标签**（与「时长」同构：标签 + 右对齐输入），placeholder 收为「选填，如：第1-2册」
  - 顶部留白改由 `.container { padding-top: 32rpx }` 承担（原由分组标题的 padding-top 提供），遵循「不给 `.weui-cells` 加 margin」的项目约定
- **补录页分组结构（`backfill`）**：去掉「补录日期」标题，日期 / 阶段与当天记录行、`＋ 添加一条` 同处一块白底分组；正文再以「学习内容」标题分出记录行块（记录行是操作区，与上方的日期 / 阶段属性分开更直观）。
  - 日期行加 `.cell-first::before { display: none }`：`picker` 会在 DOM 上多包一层，`:first-child` 判不到 `.weui-cells` 的位置，首行缩进线要显式关掉

### 修复

- **编辑记录页的资源选择「分组切不动」（`editRecord`）**：两列联动用的是原生 `<picker mode="multiSelector">`，其 `value` 是**受控**的。`bindcolumnchange` 里只写了 `multiValue[1]: 0`、没有写回 `multiValue[0]`，picker 收到新的 `range` 后会按传入的 `value` 把左列复位回原分组——表现为「滚到第 2 个分组又被弹回第一个」。
  - 改法：`bindcolumnchange` 整体写回 `multiValue: [value, 0]`（左列下标与右列重置一次完成）；`bindchange` 也同步写回 `multiValue: [gi, ri]`，否则点「确定」后再次打开弹层会跳回记录原来的分组
  - 顺带：空分组点「确定」时给「该分组暂无资源」提示，不再静默无反应

### 文档 / 规范同步

- **README 移除顶部逐版本更新说明块**：原为 v3.0.0 ~ v3.5.0 共 7 段版本说明，与 CHANGELOG 末尾「发布版本」表**完全重复**，且每次发版要同步两处（本版就漏了 v3.5.1）。现改为简介后一行「完整更新历史见 `CHANGELOG.md`」——README 只讲「现在有什么」，版本历史单一来源在 CHANGELOG。

## [3.5.0] - 2026-09-17

> 补录由「一本书进一次页面」改为**一次补「一天」的多条**：日期 + 阶段 + 当天多行，在同一屏里填完、一次提交；单条编辑拆为独立页面（`pages/editRecord`），选择器改用原生 picker，并整页纵向瘦身约 320rpx（一屏可容纳）。
> 字号与深色模式改为**完全跟随微信 / 系统**（不再提供小程序内手动档），设置页「显示」分组与两个选择页一并移除 —— 内容区与 `theme.json` 渲染的导航栏 / tabBar 从此同源。
> 另把各页弹层的关闭按钮由裸字符 `×` 换成 iconfont 的 `icon-close` 字形，热区统一补足 88rpx，并补齐首页 / 我的资源 / 阶段页半屏面板的深色蒙层。

### 新增

- **补录支持一次填写当天多条（`backfill`）**：原补录页是「一本书一次往返」——补一天读了三本就要进三次页面、选三次三级级联。现改为进入页面即处理**一整天**：日期 + 阶段 + 当天多行，填完一次提交。
  - **每行只剩两个动作**：点资源名弹出选择弹层（**分组随资源一起带出，不再单独选分组**）、输入时长（**选中资源后键盘自动落到该行时长框**，键盘「完成」跳到下一条已选资源的行），目标是「手不离键盘」
  - **行尾 `✕` 直接删**（88rpx 宽、与行等高，不弹二次确认）：这些行是还没落盘的草稿，删了重加即可，不必套用「破坏性操作」那层保护；且行内有 `input`，左滑手势会和输入框抢触摸事件
  - **「＋ 添加一条」新行直接弹选择器**，省掉一次点击
  - **底部固定栏**实时显示「共 N 条 · Xh Ym」，`0` 条时按钮置灰
  - **提交前的兜底**：半填行（只选了资源 / 只填了时长）会拦下提示，**不静默丢数据**；完全空行才静默跳过（忘了删空行也不影响）
  - **切阶段二次确认**：行里存的是旧阶段的资源快照，已有填写内容时会提示「已填写的 N 条会被清空」，否则会写出阶段与资源不匹配的记录
  - 日期与阶段改用**原生 `<picker>`**（`mode="date"` 用 `end` 锁今天 / `mode="selector"`），不再自绘滚轮弹层——补录一次只处理一天，原生选择器够用，省掉一整套弹层样式与遮罩处理；代价是系统弹层不吃 `dm-*` 与 `--fs`（外观与字号跟随系统）
- **`checkin.addCheckinsOnDay(day, records)`**：一次 `getAll()` + 一次 `saveAll()` 写完当天多条。**不能循环调 `addCheckin`** —— 它每次都是一轮全量读 + 一轮全量写，几条就是几轮 I/O，且中途失败会写进去一半（脏数据）。字段口径（含 `backfilled` / `timestamp` 规则）与 `addCheckin` 完全一致，跨月 / 分片由 `saveAll` 自动重组。
- **`pages/editRecord`（新页面）**：把原补录页的编辑态（`?id=xxx` 的单条完整表单，含备注）拆成独立页面。两页职责一分为二：`backfill` 只做补录、`editRecord` 只做编辑，补录页不再背 `isEdit` 双形态。记录页左滑「编辑」改跳新页。
- **`components/resource-picker`（新组件）**：底部半屏弹层，**左列分组 / 右列资源**（不逐级下钻，切分组点左边即可）。选中输出 `resourceId / resourceName / groupKey / groupLabel / custom`；自定义资源带「自定义」标记、已选项打品牌绿对勾、空分组显示「该分组暂无资源」。**分组定位优先级**：当前已选资源所在分组 → 上次选过的分组 → 第一个分组（记住上次选择，连补多天时不必重复点）。常驻挂载 + `show` 切 class（不是 `wx:if` 创建销毁），因此**隐藏态必须显式 `visibility: hidden` + `transform: translateY(100%)` 移出视口**——只写 `pointer-events: none` 只是不接收点击，面板仍会渲染出来挡住页面。
- **`components/date-picker`（新组件）**：自绘日期选择弹层（三列滚轮，`max` 锁今天）。`styleIsolation: "shared"` 是为了让组件作用域内的类名能命中 `picker-view` 由基础库渲染的内置蒙层与选中框；组件内用 iconfont 已按规范自行 `@import` 字形类。补录页与编辑页的日期行最终改用原生 `<picker mode="date">`，该组件始终未接入页面，已随本版清理删除。

### 变更

- **弹层关闭按钮由裸字符 `×` 换成 iconfont `icon-close` 字形（`home` / `myResources` / `stage`）**：原先四处（首页今日明细、我的资源、阶段页打卡弹窗与晋级校验弹窗）都用裸字符 `×` 加 `font-size: 53rpx` 硬撑，字形随字族回退、不同机型粗细不一。现统一改用新增的 `icon-close`（`\e646`，颜色随 `--text3`）。
  - **热区 56rpx → 88rpx**（设计指南「可点项最小热区 ≥ 88rpx」），用负 margin 抵消热区外扩，标题与关闭图标的**视觉间距不变**
  - 字号改 `calc(34rpx * var(--fs, 1))` 跟随字号档（原 `53rpx` 硬编码，切「特大」时不缩放）
- 阶段页左滑操作主文字 `32rpx` → `34rpx`，与全站正文基准一致。
- **字号改为跟随微信字体设置，深色固定跟随系统（全站）**：此前两者都是小程序内的手动档（`.fs-*` 四档 / `dm-light`·`dm-dark`·`dm-auto` 三态），与微信 / 系统状态可以不一致。
  - **字号**：`theme.js` 改读 `wx.getAppBaseInfo()` 的 `fontSizeScaleFactor`，老基础库用 `fontSizeSetting ÷ 平台基准` 折算（Android 16 / iOS 17），按区间归并到原有四档；上限压在 1.3 一档（官方《适老化设计指南》警告字号过大会导致文字溢出、截断、横向滚动）。**CSS 零改动** —— 全站 178 处 `calc(Nrpx * var(--fs, 1))` 与四个 `.fs-*` 规则原样复用
  - **深色**：`getDarkClass()` 固定返回 `dm-auto`，内容区与 `theme.json` 渲染的导航栏 / tabBar **两层同源**。顺带修掉一个一直存在的割裂：手动深色时导航栏（框架级、只跟系统）与内容区（跟手动档）本就不一致
  - 字号与主题都没有变化监听 API，靠各页 `onShow` 重新下发（沿用既有的 `app.applyFontLevel`），用户去微信改完设置切回小程序即生效
  - 连带影响：上一版「补录日期 / 阶段改用原生 `<picker>`」时记下的代价（系统弹层不吃 `dm-*` / `--fs`）**不再构成割裂** —— 全站都以系统为准了
- **资源选择弹层改为对齐项目原语 4「action-sheet」（`components/resource-picker`）**：它的头部原本学的是 WeUI half-screen-dialog（左上角关闭 + 居中标题 + 通栏细线），与项目自己的弹层风格（`stage` 打卡弹窗 / `myResources` / `home` 用的「抓手 + 标题左 + 关闭右」）不一致，同一个 App 里并存两派弹层。现统一到原语 4：
  - 头部换成抓手 + 标题左 + 关闭右，删除 `.rp-hd` / `.rp-hd-side` / `.rp-hd-main` 与通栏细线（约 50 行）
  - 标题 `30rpx` / `font-weight: 500` → **34rpx / 600**（原值取自 WeUI 的 15px 档，且正落在本项目「已废弃的 30rpx」区间，与文件内注释自相矛盾）
  - 关闭按钮补 `-16rpx` 负 margin 抵消 88rpx 热区外扩 + `border-radius: 50%`，按压反馈由 `opacity` 改为 `background: var(--cell-active)`
  - 遮罩展开色 `0.45` → `0.5`、面板上内边距 `24rpx` → `16rpx`（给抓手留位）、过渡 `0.3s` → `0.25s`，逐项对齐 `.action-sheet`
  - **唯一保留的差异**：`.rp-sheet` 固定 `75vh`（双列 `scroll-view` 必须有确定高度才能滚动），打卡弹窗则是内容自适应
- **编辑记录页的选择器改为原生 picker（`editRecord`）**：原先「阶段 / 分组 / 资源」是**三组整页单选列表**，靠逐级展开（选完阶段才出现分组、选完分组才出现资源），表单很长、要来回滚动。现改为：
  - **阶段** → `<picker mode="selector">`，与补录页同款
  - **分组 + 资源** → 合并为**一个 `<picker mode="multiSelector">` 两列联动**（左列分组、右列该分组的资源）。因此不是两行，而是**一行「资源」**，分组名作为该行的次级说明显示在标题下方
  - 两列联动的关键坑：左列滚动时必须在 `bindcolumnchange` 里**同时把右列下标重置为 0**，否则右列会停在上一分组的旧下标上而错位（已写入注释）
  - 原生 picker 只能渲染纯文本，故「自定义」标记由尾标改为拼进名字（`书名（自定义）`），页面里的 `.bf-custom` 样式随之删除
  - 回填逻辑改为**反查各级下标**（`groupKey` / `resourceId` → `multiValue`），打开滚轮即停在原值；资源被删除 / 改名 / 老记录无 `resourceId` 时仍把名称快照补进列表，保证可见可保存
  - 未选阶段时资源行 `disabled`，并给一行提示
- **编辑记录页纵向瘦身（`editRecord`）**：改用原生 picker 后整页仍有 **5 个分组标题 + 5 个独立块**（约 1393rpx），一屏（iPhone 8 = 1334rpx）放不下、要滚一截才见按钮。四处收口后约 **1076rpx**：
  - **日期 / 阶段 / 资源合并为一组**，标题改「打卡信息」——三项同属「这条记录的属性」，各自成组要多付两个分组标题与两组上下通栏线（省 156rpx）
  - **备注并入「学习记录」卡片**（原「学习时长」）：与时长 / 快捷时长同卡，用 `.weui-divider` 分节，省一个分组标题与一份卡片间距（省 98rpx）；备注不再占左侧标签位，改满宽输入 + placeholder 说明「备注，选填，如：第1-2册」，长备注能看全
  - **两条 tips 改为 `wx:if` / `wx:else` 互斥**：原「选择阶段后可挑选分组与资源」是条件显示、「修改后会计入阶段时长与统计」是常驻，同一位置会先后出现两条
  - **按钮区上边距 96rpx → 32rpx**（页面级覆盖全局 `.weui-btn-area`）：该值原为多张卡片堆叠留的呼吸位，本页上方只剩一张卡片（省 64rpx）
  - 刻意保留：每个 cell 的 112rpx 最小行高（WeUI 标准，动它会破坏与全站列表的一致性）、快捷时长独占一行（5 按钮 + 输入框同行会过窄）

### 清理

- 移除 `pages/fontPicker` 与 `pages/darkMode` 两个手动选择页（`app.json` 注销 + 8 个文件删除），设置页「显示」分组整体移除。
- `theme.js` 精简：删掉手动档相关 API（`getDarkMode` / `setDarkMode` / `getDarkModeText` / `isDarkMode` / `getFontLevelIndex` / `getFontLevelText` / `LEVELS` 等）与已废弃的 `qingba_font_level` 存储读写，只导出仍在用的 4 个方法（`getFontLevel` / `getFontClass` / `getDarkClass` / `isDarkNow`）。
- `app.js` 去掉无人读取的 `globalData.fontLevel` / `darkMode` 与 `fontLevelIndex` 下发；`settings.js` 去掉与 `applyFontLevel` 完全重复的 `loadFontLevel` / `loadDarkMode`。
- 删除 `components/date-picker/`（4 个文件）：自绘日期选择弹层。补录页与编辑页的日期行改用原生 `<picker mode="date">` 后它已无任何页面引用，且同属上面被统一掉的「WeUI 派」头部。

### 修复

- **打卡弹窗的「取消」按钮看不到底色与边框（`stage` / `myResources`）**：上一版为修「晋级下一阶段」按钮与页面融成一片，把 `.weui-btn_default` 的底色由 `--cell-active` 改成了 `--card` —— 但**弹窗本身就在 `--card` 面上**，按钮底色与弹窗同色，而 `.weui-btn::after` 的 WeUI 边框早已按项目约定去掉，于是按钮只剩文字、毫无轮廓。
  - **根因是「用不透明实色做默认按钮底」这件事本身**：同一枚 default 按钮既要落在页面 `--bg` 上（`stage` 的晋级按钮），又要落在 `--card` 上（两处弹窗的「取消」），不透明色只能适配其中一种底 —— 取哪个都会在另一种底上隐形。上一版只是把撞色的位置从「页面」搬到了「弹窗」
  - **改法（对齐 WeUI 官方）**：WeUI 的 default 按钮底是 `--weui-FG-5` = `rgba(0,0,0,.05)` / `rgba(255,255,255,.1)`，是**半透明叠加**，落在任何底色上都有对比。新增项目令牌 `--btn-default`（= FG-5），`.weui-btn_default` 与 `stage` 晋级弹窗的 `.pm-btn-cancel` 一并改用它
  - 顺带统一了两个弹窗的「取消」：原先一个是 `--cell-active`（不透明 `#ececec`）、一个是 `--card`，同一页两枚同功能按钮却是两种色
  - 复核三处落点均有明显对比：弹窗取消（`--card` 面，浅 `#f2f2f2` / 深 ≈`#2c2c2c`）、晋级按钮（页面 `--bg` 面，浅 `#e1e1e1` / 深 ≈`#2a2a2a`）
- **补录页：数字键盘盖住资源选择弹层（`backfill`）**：时长输入框是 `focus="{{focusRowKey === item.rid}}"` 受控的，而 `_openPicker()` 里没有任何一处收键盘 —— 软键盘由**原生层**渲染、**永远盖在弹层之上**，于是「填完时长 → 点『＋ 添加一条』」时弹层刚推出就被数字键盘压住、数字键优先显示。
  - **前两版修法真机上均无效**（记录在此以免重蹈）：①「清 `focusRowKey` + `wx.hideKeyboard()`」；② 再补 `bindfocus` 让变量说实话、收键盘挪到弹层渲染之后（+120ms 补收）、并把 `focus` 绑定写成 `pickerShow ? false : …` 从状态上禁止聚焦。这条路不可控的变量太多：官方文档对 `focus` 只写「获取焦点」、**没说置 `false` 会失焦**；`wx.hideKeyboard` 的生效条件未写明；iOS 另有「input 失焦后键盘不自动收起」的已知问题；官方 input 文档还有一条 Tip「**在 input 聚焦期间，避免使用 css 动画**」，而弹层自带的 transform 过渡正是把键盘重新拉起来的元凶
  - **补 `bindfocus`**：`focusRowKey` 原先只在 `_focusRow()`（选完资源后的程序化聚焦）里维护，用户**直接点**某行时长框时它并不更新 —— 于是「清 `focusRowKey`」很可能清的是个不相干的值、根本不产生 `true→false` 的属性变化，框架也就无从失焦。现在聚焦事件也一并记录，`focusRowKey` 保证指向真正聚焦的那一行
  - **最终改成结构性方案**：弹层打开期间用 `wx:if` 把 `<input>` 整个移出 DOM、换成纯文本（`wx:else`）。**键盘必须有「聚焦的输入框」作宿主** —— 输入框不在了，它既不可能继续挂着、也不会被弹层入场动画重新拉起，与 `focus` 绑定语义 / `hideKeyboard` 生效情况 / 渲染顺序统统无关
  - 替代文本复用 `.bf-dur-input` 的宽 / 高 / 右对齐 / 字号，只补 `line-height: 88rpx`（`.bf-dur-static`）并沿用 placeholder 色，切换时行宽行高不跳动
  - **前两版的做法保留为辅助措施**（已不承担主要职责，留着无害）：`bindfocus` 维护 `focusRowKey`、`_hideKeyboard()`（带低版本存在性判断）、弹层渲染后 +120ms 补收一次、`onUnload` 清延迟定时器。其中「清 `focusRowKey`」在**关弹层**时仍必要 —— 输入框会重新创建，若该变量还指向某行，它会带着 `focus=true` 出生、反而把键盘弹回来
  - 同一入口覆盖了另一个路径：直接点资源名打开弹层时同样先收键盘
- **「晋级下一阶段」按钮与页面背景融成一片（`stage`）**：该按钮的进度填色用 `linear-gradient(…, transparent …)` 让**按钮底色透出来**，而底色取自 `--cell-active`（浅色 `#ececec`）—— 它与页面背景 `--bg`（`#ededed`）**只差 1 个色阶**（RGB 差 1/255），加上 `.weui-btn::after` 的 WeUI 细线边框早已按项目约定去掉，浅色下按钮边界完全消失。此为既有配色问题（深色下 `#373737` vs `#111` 对比正常，故只在浅色暴露），也只在「进度未满、落在 `weui-btn_default`」时可见。现把 `.weui-btn_default` 底色改为 `var(--card)`（浅 `#fff` / 深 `#191919`），与 WeUI 的 default 按钮取 BG-2 一致，进度填充也更清楚。
- **深色下两处样式因 `dm-dark` 不再挂载而失效（`app.wxss` / `stats`）**：深色改为固定跟随系统后根节点只挂 `dm-auto`，凡是**只写 `.dm-dark`、没有 `.dm-auto` 配对**的规则都会永久失配。全项目逐条核对 13 处，其中两处漏了配对：
  - `app.wxss` 的 `.dm-dark .weui-btn_disabled` → 深色下禁用按钮会露出浅灰 `#C7C7CC`；已改为 `.dm-auto` + 媒体查询
  - `stats.wxss` 的 `.dm-dark .chart-skel` → 深色下图表骨架网格仍是浅色的 `rgba(0,0,0,.06)`，在深色遮罩下看不见；同样改为 `.dm-auto` + 媒体查询
  - 其余 11 处（`tag-group` / 各处深色蒙层 / 分类色变量块 / `current-cell` / `tag-stage`）均已成对，无需改动

- **首页 / 我的资源 / 阶段页半屏面板缺深色蒙层**：三处的 `.hs-mask` / `.sheet-mask` / `.pm-mask` 原本只有浅色的 `rgba(0,0,0,.5)`，深色下没有加深到 `.8`（与 `app.wxss` 的 `.dm-dark .weui-mask` 不一致），弹层打开时蒙层偏浅。这三处的蒙层根节点**同时挂 `dm-*` 与自身的显示修饰类**（不在祖先链上），故选择器必须写成**同元素复合**（`.hs-mask.dm-dark.hs-mask-show`），并另写一份 `@media` 下的 `.dm-auto` 版本。

### 文档 / 规范同步

- README：顶部版本块补 v3.5.0；「打卡记录」章节同步编辑页的选择器与布局变化。
- `ui-design-spec` skill 同步本版两处机制变化与一批已过时描述：
  - **字号**：`--fs` 的驱动源由「页内手动四档」改为**微信字体设置**（`SKILL.md` 的何时使用 / 设计原则 / 项目实现备注，`design-tokens.md` §9 字号档与 §8 care 接入说明一并更新 —— 不再自建适老档，直接跟随微信）。
  - **深色**：三态收敛为 `dm-auto` 一态；新增约定「**深色规则必须 `.dm-auto` + `@media (prefers-color-scheme: dark)` 成对书写**」——只写 `.dm-light` / `.dm-dark` 的规则在手动档移除后会永久失配（本版即据此逐条核对 13 处、修掉 2 处）。
  - `components.md`：原语 19 补「**原生 `<picker>` vs 自绘 `picker-view`** 的取舍与代价」（原生弹层不吃 `--fs` / `dm-*`，要跟随只能用自绘）；原语 3 / 5 补「分组标题有成本、同类信息优先合并为一组」的表单页密度约定；原语 8 补弹层关闭按钮统一 `icon-close` + 88rpx 热区；清理已失效的 `.switch` 自绘胶囊开关与 `fontPicker` 引用。
- README「设置」章节：移除「显示」（字体大小四档 / 深色模式三态）两栏，改为「跟随微信设置」的说明并附原因；项目结构树同步 `settings` 页注释与 `theme.js` 描述。

## [3.4.1] - 2026-09-16

> 新增分享能力：各页定制转发标题、落地页统一首页，「关于」页可分享给好友与朋友圈；「关于」页排版按 WeUI 规范重构（22pt 主标题、正文 17pt）；修复记录页标签不一致。

### 变更

- **关于页排版重构（`about`）**：原页面开篇是一串 14pt / 12pt 灰字，缺少视觉落点。现把「3-4岁 · 常规路径」升为**文章主标题**（`__h1`，22pt / `--text`）——它本就是全文概括（文章讲的正是 3-4 岁为何走常规路径），且与导航栏标题「关于庆爸2.0」（页面身份）不重复、可并存：
  - **层级模型参考 TDesign Typography**：`h1` 文章标题 / `h2` 章节 / `h3`·`h4` 小节 / `p` 正文 / `note` 注脚 / `strong` 行内强调，数值全部按微信官方档位重定（22 / 17 / 14 / 12 pt；15pt 档留给 cell 描述等次级内容，本文正文不占用）。小程序端并无 `t-typography`（排版能力拆在 `t-title` / `t-paragraph` / `t-text`，且基于**固定 px**，接入会失去 `--fs` 字号缩放），故**只借层级、不引组件**
  - **不引入其彩色语义**：TDesign 的 `mark` 硬编码黄 `#fcdf47`、`theme` 的 primary 为蓝 `#0052d9`，与项目「扁平纯色、禁彩色字」约定冲突；行内强调只保留「主色加粗」一档
  - **借 Markdown 的结构语义**（视觉仍保持微信文章的无框无底色）：
    - 手写 `·` 的伪列表改为**真正的无序列表**——`::before` 出 `•` 符号 + `padding-left: 32rpx` 悬挂缩进（原来是「段落前面挂个 `·` 字符」）
    - 方式一「注意事项」的 `1.`~`5.` 手写序号改为**有序列表**，编号用 **CSS `counter`** 自动生成，增删条目不必再手改序号
    - 「重点提示段」整段用行内 `__strong` 加粗，段落本身仍是普通 `__p`——`__strong` 已足够表达重点，不为单段引入带竖线的提示块或段落级样式
    - 方式二 / 方式三的「注意事项 1 / 2」合并为单个**注意事项 + 有序列表**，与方式一对齐；三个方式分区现在结构一致：`h3` 方式名 → 参考方式 → `h4` 注意事项 + 列表 → `h4` 其他子话题 + 段落
    - 顺带删除方式二末尾与「注意事项 1」**完全重复**的一段（只差「如果 / 若」一字），并去掉各级 `h4` 标题末尾多余的冒号
    - 「阶段参考」的 7 个阶段由「一行内用 `｜` 挤 2–3 项」改为**每项独立成行的无序列表**（悬挂缩进 + `•`），小屏与大字号档位下不再挤成一团；阶段内的列表复用 `.about-list`，仅收窄外边距
  - 层级样式定义在 `about.wxss`（**未提升为全局原语**——目前仅此一处文章页，等出现第二处再抽取），类名沿用 WeUI 的 `.weui-article__*` 体系；页面特有结构（阶段参考块、使用说明分组、列表 / 提示块）一并保留在同文件
  - **对照 WeUI v2.6.26 源码校正两处偏差**（基准：`weui-wxss/dist/style/weui.wxss` 的 `.weui-article` 规则）：
    - **补齐 `__section` 分节下边距**：页面用了 WeUI 的 `weui-article__section` 类名却一直没有对应样式（等于挂空壳）。现补上官方值 `margin-bottom: 96rpx`，嵌套逐级收窄为 `64rpx` / `48rpx`（对应 WeUI 的 48 / 32 / 24px）
    - **正文回到 17pt 档 + 主文色**：WeUI 的 article 正文基准是 **17px** 且取 `FG-0`，本文原先用 15pt + `--text2`（次级色）——15pt 在微信档位里的定位是「过渡次级字号」，用在文章正文偏小偏灰。现正文（容器 / `__p` / 列表项）统一 `34rpx` + `var(--text)`；`__h4` 随之提到 34rpx（否则四级标题会小于正文）

- **新增分享能力（`utils/share.js` + 各页 `onShareAppMessage`）**：此前全项目没有任何转发配置，右上角转发只能生成默认卡片（标题 = 小程序名、落地页 = 当前页），把「统计 / 记录」这类私人数据页当落地页也不合适。
  - **落地页统一为首页**：好友点开即可从欢迎卡（未设置阶段时引导选起点）开始，不必先读一屏说明；文案与路径集中在 `utils/share.js`，各页只声明场景 key
  - **标题按场景定制**：首页带当前累计时长（「陪孩子练英语听力，已累计 12.5 小时」）、阶段页带当前阶段名，其余页为通用文案
  - **朋友圈只对「关于」页开放**（`onShareTimeline`）：官方要求页面同时声明「发送给朋友」+「分享到朋友圈」才可被分享，且朋友圈打开的是**单页模式**——无 tabBar、页面不能跳转、`button open-type` / `wx.showShareMenu` 等能力被禁用，只有纯内容页不会出现点了没反应的死链
  - 「关于」页底部新增「分享给好友」按钮（`open-type="share"`，复用全局 `.weui-btn` 原语）；单页模式下按场景值 `1154` 隐藏该按钮，避免点了只弹「请前往小程序使用完整服务」

- **文档 / 规范同步**：`README` 补「分享」小节与 `utils/share.js` 结构说明；本 skill（`.codebuddy/skills/ui-design-spec`）新增 `components.md` **原语 21「文章页排版」**、`design-guidelines.md` **§六「分享入口与落地页（能力边界）」**（原自检清单顺延为 §七并补 2 项分享自检），`design-tokens.md` 项目字号档补 **22pt(44rpx) 文章标题档**并订正关于页正文档位（15pt → 17pt），SKILL.md 摘要 / 何时使用 / 项目实现备注同步更新。

### 修复

- **打卡记录页标签不一致（`records`）**：同一行 `gap: 8rpx` 内的四个标签（阶段 / 分类 / 补录 / 备注）此前有两处不统一：
  - **字号**：`.record-backfill`（补录）与 `.record-remark`（备注）各自覆盖了 `font-size: 28rpx`（14pt），而 `.tag-stage` / `.tag-group-*` 走 `.weui-tag` 基类的 `24rpx`（12pt）——只有这两个大一号，基线不齐；且 `.record-backfill` 的注释本意是「中性灰，**弱于**分类彩色标签」，字号反而更大，与意图相反
  - **内边距 / 圆角**：`.tag-group-*` 只设了颜色，用基类的 `4rpx 16rpx` / `8rpx`；其余三个覆盖成更紧的 `2rpx 10rpx` / `6rpx`——分类标签块明显更大、胶囊形状不一
  - 现统一：字号全部继承基类 `24rpx`；内边距 / 圆角改为在 `.record-tags .weui-tag` 上**集中收紧一次**（`2rpx 10rpx` / `6rpx`），删除四个标签里的重复覆盖——这行本就要并列 4 个标签 + 时长，紧凑些更不易换行

## [3.4.0] - 2026-09-15

> 自 `v3.3.0` 以来的全部改动：首页「今日时长」「今日打卡」两张指标卡可点开**今日明细弹窗**（底部半屏，两卡共用同一面板、分别按时长与次数聚合）；统计页时长 / 读完排行榜的占比分母由「该榜最大值」改为**统计维度的累计值**，中文时长文案提取为 `checkin.fmtMinutesCN` 全站共用。
> 另做了一轮全项目代码审查，修复**分片存储回滚丢数据**、补录与打卡**重复提交**等一批数据安全与稳定性问题，并清理零调用的死代码。
> 另修复**深色模式下月份 / 阶段选择器弹层**的样式异常：弹层主题变量作用域丢失导致发白，以及原生 `picker-view` 的内置蒙层与选中框不跟随主题。
> 另新增**打卡记录编辑**：记录列表左滑由「单个删除」扩为「编辑 + 删除」，编辑复用补录页表单（可改日期 / 阶段 / 分组 / 资源 / 时长 / 备注）。
> 另修复真机上细线整条消失的问题：全站分隔线 / 边框统一改用 TDesign hairline 方案（`1px` + `scaleY(0.5)` + `transform-origin`），并订正文档里「`1rpx` 可用、`scaleY` 已弃用」的错误结论。
> 可用 `git log v3.3.0..v3.4.0` 查看对应提交范围。

### 新增

- **首页今日明细弹窗（`home`）**：「今日时长」「今日打卡」两张指标卡由纯展示变为可点击（右上角 `icon-right` 箭头此前只是装饰），点击从底部升起半屏面板。此前 `v3.0.0` 曾移除首页的今日打卡明细列表（含左滑删除手势），本次以**只读弹窗**形式回归——明细有价值，但首页不适合再放一块常驻列表和一套手势。
  - **两卡共用一个面板，入口决定度量**：卡片带 `data-mode="minutes" | "count"`，标题「今日时长 / 今日打卡」，汇总行分别为「2.5h · 5 本」与「12 次 · 5 本」
  - **聚合口径与卡片数字严格一致**：`getAll()[todayStr]` → 过滤当前阶段 → 按 `groupKey|resourceId` 聚合（老记录回退「分组 + 名称」，与已读次数 key 同源）→ 时长模式按时长降序、次数模式按次数降序
  - **两种度量互不串味**：时长模式右侧为 `1小时20分钟`、不出现「次」，次数模式右侧为 `3次`、不出现时长——两张卡各表一种度量，同框混读会让人算不过来
  - **行样式对齐统计页排行榜**：整行底衬进度 + 56rpx 首字方块 + 名称 + 右侧数值，底色与排版参数同源，两处视觉一致
  - **交互沿用阶段页打卡弹窗的原语**：遮罩点击关闭、内容区 `catchtouchmove` 防穿透、`0.25s` 上滑；列表为 `scroll-view`（`max-height 56vh`），**滚动区不挂 `touchmove`**（否则列表滚不动）；含空态「今天还没有打卡记录」
  - 弹窗处于打开态时 `onShow` 会重建，避免切回页面看到旧内容
- **打卡记录支持编辑（`records` / `backfill` / `checkin`）**：记录列表左滑由「单个删除」扩为「编辑 + 删除」两个操作，编辑复用补录页表单（`?id=xxx` 进入编辑态），日期 / 阶段 / 分组 / 资源 / 时长 / 备注六项全可改。
  - **`checkin.updateCheckin(id, patch)` + `getCheckinById(id)`**：原地更新而非「删了重录」，**保留记录 id**。语义约定：日期未变则保留原 `timestamp`（只改时长/备注不该改动展示时间）；日期改变则改到今天用 `Date.now()`、改到历史用该日 12:00；`backfilled` 按新日期重算（等于今天则清除该标记）
  - **跨日 / 跨月无需特殊处理**：改日期只是「从旧 day 摘除、写入新 day」，`saveAll()` 按 `_dayToMonth(day)` 重组分片，记录自动落到正确的月份分片
  - **明确不迁移读完次数**：`qingba_read_counts` 是用户主动标记的独立计数，与打卡记录并非 1:1，无法从记录可靠反推。把某条记录的资源改成另一个资源时，原资源的读完次数保持不变——**这是有意为之，勿当作 bug 修**（已写进 `updateCheckin` 注释）
  - **左滑操作区 150rpx → 300rpx**（编辑 / 删除各 150）：JS 常量改名为 `SWIPE_W`，与 `.swipe-bg { width }` 双处同步
  - **编辑态回填兼容两类历史数据**：资源已被删除 / 改名（记录里存的是当时的名称快照）、老记录本就没有 `resourceId`——两者都把名称快照补进资源列表并选中；`canSubmit` 的资源判定放宽为「id 或名称有其一」
  - 顺带修复：`backfill.submit()` 的提交锁**从未置位**（只有 `if (this._submitting) return` 与失败时的复位，缺 `this._submitting = true`，而 `stage.js` / `myResources.js` 的同类锁都有），600ms 跳转窗口内连点仍会写入重复记录

### 变更

- **排行榜占比分母改为统计维度的累计值（`stats`）**：时长 / 读完排行榜原先以「该榜最大值」（第一名的量）为分母，读者看到的长度是**相对第一名**的比例而非占比，且与页面其他模块口径不一。现改为该阶段**累计总时长**与**累计读完次数**：
  - 各行宽度相加正好 100%，可直接判断「头部集中还是均摊」
  - 与柱状图 / 环形图天然同口径——占位数据 `resTotal` 与 `totalMinutes` 本就在同一循环累加、同一 `period` 过滤，将来恢复周 / 月 / 年切片时无需额外同步
- **中文时长文案提取为公共函数（`checkin.fmtMinutesCN`）**：原为 `stats.js` 内部函数，现上移到 `utils/checkin.js` 并导出，统计页与首页共用一套「X小时Y分钟」文案，避免两处各写一份而分叉；首页今日时长弹窗的绘本时长随之由 `1h20m` 改为 `1小时20分钟`，与时长排行榜完全一致

### 修复

全项目代码审查（utils 层 + 16 个页面逐文件核对）发现的缺陷，按严重度修复：

- **分片存储的失败回滚会真正丢数据（`checkin.saveAll`）**：原实现注释称"先写新分片、全部成功后再删旧的，任何一步失败都回滚，保证旧数据不丢"，但新分片用的是**与旧分片同名的 key**（`qingba_checkins_YYYY-MM`），写入即就地覆盖，回滚时又把这些 key 逐个删除——一旦中途某个分片抛异常（最现实的是存储配额写满），那几个月的旧数据会彻底消失。现改为**两阶段写**：
  - 先把全部月份写成 `qingba_checkins_tmp_*` 临时分片（旧分片全程不被触碰），全部成功后再逐个「改名」为正式 key
  - `_listChunkKeys()` 排除临时前缀，避免 `getAll()` 合并到写入中间态；`_removeChunkKeys()` 仍会把残留的临时分片一并清掉
  - 任何阶段失败都只影响临时 key，已有分片内容始终完整
- **补录连点会写入多条重复记录（`backfill`）**：`submit()` 成功后要等 600ms 才 `navigateBack`，该窗口内再次点击会重复执行 `checkin.addCheckin()`。现加提交锁（校验全部通过后上锁，保存失败时释放）
- **打卡弹窗双击写入两条记录（`stage.submitCheckin`）**：两次点击事件会在 `setData` 渲染前先后进入处理器，现加提交锁，成功与失败两条路径都正确释放
- **统计页 echarts / canvas 实例从不销毁（`stats`）**：`_ensureCharts()` 持有 canvas 与图表实例，此前只在开弹层 / 切空态时 `_disposeCharts()`，离开页面从不释放（项目此前没有任何页面使用 `onUnload`）。现新增 `onUnload` 销毁，反复进出不再累积
- **"跟随系统"深色下图表配色不跟随（`stats`）**：canvas 走不了 CSS 媒体查询，图表颜色原先用 `/dark/.test(darkClass)` 判断，`dm-auto` 时恒为 false，系统深色下仍是浅色网格。`theme.js` 新增 `isDarkNow()`（自行读取系统主题，兼容 `getAppBaseInfo` 不可用的旧基础库），统计页两处图表配色改用它
- **`app._systemDark` 是从未赋值的幽灵字段（`stage._syncDark`）**：全项目只有这一处读它、没有任何地方赋值，导致 `dm-auto` + 系统深色时 `isDark` 恒为 false。改用 `theme.isDarkNow()`
- **按阶段清空不清默认备注（`checkin.clearCheckinsByStage`）**：旧实现清了记录、已读次数与已完成标记，却漏了 `qingba_default_remarks` 中该阶段的 key，重新添加同名资源时旧备注会"复活"。现同步清除
- **`migrateResourceKeysToId` 幂等标记过早置位（`checkin`）**：原在函数入口就置 `_idsMigrated = true`，若中途异常，本会话内不再重试，迁移永久半途而废。改为真正跑完才置位，异常时保持可重试
- **脏数据会让多个统计函数抛异常（`checkin`）**：`getByMonth` / `totalCountAll` / `getStageMinutes` / `getAccumulatedMinutes` 直接 `all[day].length` 或展开 `...all[day]`，且都不在 try 内（前三个完全没有兜底），一旦某天的值不是数组（异常导入 / 旧数据），`route` / `stage` / `records` / `settings` 的 `onShow` 会直接白屏。现统一加 `Array.isArray` 校验
- **`_estimateBytes` 回退分支漏算 4 字节字符（`checkin`）**：无 `TextEncoder` 时把代理对（emoji）按 3 字节计，低估体积会让分片上限判断偏乐观；补高位代理判断按 4 字节计
- **打卡后资源行徽标可能不刷新（`stage`）**：`setData({ ['resTotals.' + groupKey + '|' + 资源名]: n })` 用资源名拼 dataPath，名称含 `.` `[` `]`（如「RAZ D.2」）时会被解析成多级路径。改为整体下发 `resTotals` 对象
- **清空 / 加载类健壮性与一致性**：`records.onTouchStart` 先克隆再改（原先就地改写 `this.data` 里的对象）并补越界保护；`records` / `stats` 的 `catchtap=""` 改为 `catchtap="noop"` 并补上 `noop()`；`stage` 移除 `isLastStage` / `alreadyDone` / `requiredType` 三处从未在 wxml 使用的无效 `setData`；`settings` 去掉 `onLoad` 与 `onShow` 重复执行的一批 loader（含 `getAll` 全量读）；`myResources.submitSheet` 加防抖；`about` / `home` / `route` / `records` 补上 `data` 里的 `darkClass` 声明；`stats` 两处 `wx.getSystemInfoSync()` 改为 `wx.getWindowInfo()`（消除弃用告警）
- **深色模式下月份 / 阶段选择器弹层样式异常（`records` / `stats`）**：两处 `picker-view` 弹层各有一个独立缺陷，叠加后表现为「弹层发白 + 蒙层灰块 + 选中项消失」：
  - **弹层主题变量作用域丢失（根因）**：弹层 DOM 写在 `.container` 之外，而 `dm-light` / `dm-dark` / `dm-auto` 只挂在 `.container` 上、`page` 上仅有浅色基础变量（`@media (prefers-color-scheme: dark)` 只覆盖 `background-color`，不覆盖变量）。因此「手动深色 + 系统浅色」时弹层整体回落到浅色——白卡片、`--cell-active` 浅灰「取消」按钮、`#1a1a1a` 文字。现给弹层补 `{{fontClass}} {{darkClass}}`，与 `stage` / `home` / `myResources` 既有的 4 个弹层写法对齐（此前恰好只有这两个选择器漏了）
  - **原生 `picker-view` 蒙层不吃 CSS 变量**：内置的上下蒙层是固定白色渐变，深色下在卡片上留下灰白块。现以 `mask-class="mp-pv-mask"` 覆盖为透明
  - **选中框改用主题色细线**：`indicator-class="mp-pv-indicator"` 设透明背景 + `var(--divider)` 上下细线。indicator 是覆盖在内容层之上的元素，实色底会整行盖住选中项文字——首版误以 `--card2` 做底色导致选中项「消失」，已修正
  - 附带修正：弹层现在能正确继承 `--fs`，切换字号档位时选择器文字同步缩放
- **真机上细线整条消失（全站分隔线与边框）**：`1rpx` 在小屏约合 0.5 个逻辑像素，是小数尺寸，真机 WebView 在像素网格吸附阶段会把它舍成 0 → 线整条不可见（`--divider` 这类低对比度色更甚）。该 bug 迷惑性极强：**开发者工具里一切正常，只在真机丢**（模拟器 DPR 与坐标对齐方式不同、不触发该舍入），靠模拟器完全排查不出来。现全站细线统一改为 **TDesign hairline 同款方案**：
  - **`1px` + `transform: scaleY(0.5)`**（竖线 `scaleX(0.5)`）：布局阶段用整数 `1px` 稳定落格，缩放在合成阶段完成、只会让线变淡不会让它消失；`transform-origin` 必须锚定线所在的那条边（`top` / `bottom` / `left` / `center`），否则默认原点 `center` 会让线向两侧各缩一半而位置漂移
  - **容器的 `border` 线改由伪元素承担**（`.res-list` / `.rg-body` / `.swipe-wrap` / `.pm-form-item` / `.route-req`）：容器自身加 `transform` 会把内容一起压扁，故 `::after` 画底边、`::before` 画顶边
  - **两处例外**：`.seg-item`（按钮四边边框，改用 `2rpx` 规避；若要彻底细线化需 TDesign 的 surround 方案——伪元素放大 200% 再 `scale(0.5)`）、`.mp-pv-indicator`（80rpx 高的选中框，缩放会把选中区压扁，上下线直接给 `1px`）
  - **顺带修复一条从未显示过的线**：`.weui-cells::before/::after` 原先定位在 `top/bottom: -1rpx`，而 `.weui-cells` 自身是 `overflow: hidden`——线被定位到容器外直接裁掉，**从来就没显示过**。现改为 `0`，列表分组的上下通栏线恢复
- **订正过时的分隔线文档（`SKILL.md` / `design-tokens.md` / `components.md`）**：原文档写「本项目用真实 `1rpx`；`scaleY(.5)` 会因偏移导致位置偏差，已弃用」——方向恰好相反：偏移不是 `scaleY` 的问题，而是**漏写 `transform-origin`**（TDesign 的 hairline 正是靠它解决）。同时清理了文档中 `.cell-divider` 兄弟节点的描述：该方案在代码中已不存在（现由 `.weui-cell::before` 伪元素提供），且其 `height:1rpx` + `background` 写法正属于会被真机舍掉的类型

### 清理

- 删除零调用导出：`checkin.todayTotalByResource`、`checkin.fmtHoursDecimal`、`resources.getStageIndex` / `findIdByName` / `getAllResources`、`theme.getLevels` / `getDarkModeIndex` / `indexOfDark`
- 删除 `utils/groupColors.js`：首页今日弹窗改用排行榜样式后失去最后一个引用（分组色目前只存在于 `app.wxss` 与 `pages/records/records.wxss`）
- 保留 `checkin.getResourceCheckinSummary` 并加注释：它是全站唯一「资源 id 优先」的汇总实现，当前无调用方，留作后续统一时长聚合口径时的参考实现
- `fontPicker.pick` 的无用局部变量、`theme.getFontLevelText` 过时的注释（注释写"标准 · 默认字号"但实现只返回档位名）

## [3.3.0] - 2026-09-14

> 自 `v3.2.0` 发布以来的全部改动：首页新增 **Day N**（当前阶段从首次打卡到今天的天数，单调不归零），2×2「打卡天数」改为「连续打卡」；未设置当前阶段时首页以**欢迎卡**替代全 0 的统计模块，路线页不再满屏显示锁、顶部「当前阶段」改为引导去选择起点。
> 可用 `git log v3.2.0..v3.3.0` 查看对应提交范围。

### 新增

- **首页 Day N（`home`）**：欢迎语改为 `Good morning, Day 45` —— 取当前阶段首次打卡日到今天的天数：
  - **口径**：按 `stageId` 过滤后取最小的 `day` 键（`YYYY-MM-DD` 字典序即时间序），与 `todayStr` 做差 + 1（首次当天为 Day 1）；**按当前阶段计**，升阶段自动重新计数
  - **今天未打卡也计数**：Day N 表达的是时间跨度而非打卡状态，避免再制造一个会归零的数字（对比 `streak`，断一天即从 87 归 0）
  - 当前阶段无记录时不显示，沿用 `, start today`
  - 样式上仅 `Day 45` 用品牌绿 `--brand`（其余欢迎语保持 `--text`）——顶栏是刻意弱化的信息区，靠**颜色**而非字号突出，不破坏「顶栏轻 → Hero 重」的节奏
- **首页欢迎卡（`home`，未设置阶段时）**：未设置当前阶段时 Hero 卡与 2×2 指标整体隐藏（全 0 的统计对新用户只有负面暗示），改为 WeUI msg 范式引导卡——无图标、单主操作：
  - 标题「欢迎使用庆爸2.0」，副文「记录每天的英语听力投入，陪孩子从{{firstStageName}}一路走到{{lastStageName}}」，底部 tips「所有阶段均已开放，时间投入到位即可进入下一阶段」
  - **首末阶段名从 `routeData.stages` 派生**（`stages[0].stage_name` / `stages[len - 1].stage_name`），不写死常量；路线数据增删改后文案自动跟随。tips 里的晋级条件取自路线数据的核心标准（时间投入是最核心、甚至可当作唯一的晋级标准），而非「完成前一阶段」——后者在本小程序里没有明确定义
  - 主按钮 `.weui-btn.weui-btn_primary.weui-btn_block`（保持品牌绿强行动点）跳 `stagePicker`，选完 `navigateBack` 回首页，`onShow` 自动切回统计视图
- **路线页顶部「当前阶段」未设置时的引导（`route`）**：该分组不再随 `currentCard` 为空而整体隐藏，改为原地显示引导行——主文「未设置」（`--text2`，占位非真值）、副文「选择一个阶段作为起点」、右侧品牌绿「去选择」，点击跳 `stagePicker`；选完返回时 `onShow` 重新 `loadCurrentStage`，引导行自动变成「常规3  45% ›」
  - 结构上把 `weui-cells__title` + `weui-cells` 提到 `wx:if` 之外，`block` 只包 cell 本体 —— 两态共用同一分组容器，避免出现「有阶段时顶部多一组、没阶段时整组消失」的位置跳动

### 变更

- **首页 2×2「打卡天数」改为「连续打卡」（`streak` 下放）**：连续天数由顶部欢迎语移入 2×2 指标格，原「打卡天数」（当前阶段有记录的天数）被替换
  - 起因是 Day N 与 `streak` 两个天数在欢迎语里同框会让人算不过来；下放后语义分层——**Day N 在顶部讲跨度**（情感价值、永不归零），**连续打卡在格子里讲状态**（唯一能"逼"用户今天去打卡的数字）
  - 被替换的「打卡天数」是四格里信息价值最低的一个（records / stats 均有明细），而「连续打卡」此前只在欢迎语里以小字存在
- **路线页阶段状态新增 `unset`（尚未选择起点）**：原 `currentIndex = -1`（未设置阶段）时全部阶段落进 `else → 'locked'`，新用户进路线页看到的是**满屏锁**。现为四态：`unset` / `done` / `current` / `locked`（前序未完成）：
  - `unset` 节点**不渲染图标**，沿用 `.route-node` 默认的中性描边空圈（不新增规则），与 `locked` 的去描边灰底锁在视觉上明确区分
  - wxml 由末尾 `wx:else`（对勾）改为显式 `wx:elif="{{item._state === 'done'}}"`，否则 `unset` 会误落进对勾分支
- **阶段选择页「未设置」仅在已设置阶段时显示（`stagePicker`）**：`wx:if="{{selectedId}}"` —— 新用户从欢迎卡 / 路线页引导进来时该选项无意义；已设置阶段时仍可用它清除（回到未设置态，欢迎卡与路线页引导随之出现）

### 清理与配置

- **移除 `checkin.hasOnboarded()` / `setOnboarded()` 及存储键 `qingba_has_onboarded`**：首次启动引导早在 `v3.0.0`（设置页「当前阶段」移出开发者工具）后即被取代，两个函数零调用却一直导出。连带清理 `clearAll()` 中的键清理项、`HAS_ONBOARDED_KEY` 常量与相关注释；`setCompletedStages()` 保留（选择阶段时仍用于标记前序阶段）

## [3.2.0] - 2026-09-14

> 自 `v3.1.0` 发布以来的全部改动：打卡记录页新增「补录」——可补记历史日期的打卡（选日期 + 阶段 / 分组 / 资源三级级联 + 时长 / 备注）。补录记录写入指定日期的时间戳并打 `backfilled` 标记，照常计入阶段时长、统计与晋级判定。
> 阶段页资源行新增「读完」左滑操作——读完 / 撤销 −1 直接在行内完成，不再走打卡弹窗里的二级入口；分组头的「已读 N」因语义不明确（读整套是循环推进的，合计数字看不出任何一轮的进度）一并移除。
> 可用 `git log v3.1.0..v3.2.0` 查看对应提交范围。

### 新增

- **打卡补录页（`pages/backfill`）**：打卡记录页头部新增「补录」入口 → 整页选择 + 表单：
  - **日期**：`picker`(`mode="date"`)，`end` 绑定今天，**不可选未来**；右侧值显示「YYYY-MM-DD（今天）」或「YYYY-MM-DD」
  - **阶段 / 分组 / 资源**：**同页三级级联、渐进展开**（选中阶段才出现「选择分组」，选中分组才出现「选择资源」；改上级自动清空并收起下级）；阶段默认取当前阶段（无效时回退第一个阶段），资源清单含官方 + 自定义（带「自定义」标记）
  - **时长**：数字输入 + 10 / 15 / 20 / 25 / 30 快捷分段控件（默认 20），校验口径与阶段页打卡弹窗一致（>0、<=999、四舍五入后 >=1 分钟）
  - **备注**：选填，最多 50 字
  - **复用原语**：整页单选（原语 3）、`.form-card` 表单（原语 13/15）、`.seg-control` 分段控件（原语 14）、`.weui-btn` 按钮族（原语 16）；顶部 `.weui-cells__tips` 说明「补录数据会计入阶段时长与统计」
  - 提交成功后 `navigateBack` 回调记录页，自动切到补录月份并刷新
- **`checkin.normalizeDay(day)`**：校验并归一化 `YYYY-MM-DD`（正则 + 真实日期回验，`2026-02-30` 这类判非法），合法返回原串、非法返回 `''`
- **`checkin.dayToTimestamp(day)`**：把日期串转为该日 **12:00** 的时间戳（显式用年月日构造，规避 iOS 对 `"YYYY-MM-DD"` 字符串解析不一致）
- `app.json` 注册 `pages/backfill/backfill`
- **阶段页资源行左滑「读完 +1 / 撤销 −1」**：读完由打卡弹窗里的二级入口升级为行内一等操作（手势原语与打卡记录页 / 我的资源同源）：
  - 左滑露出两个等宽按钮：**读完**（品牌绿，主）与**撤销**（`--swipe-undo`，次）；操作区宽 `SWIPE_W = 300rpx`，与 `.swipe-bg` 样式常量对齐；吸附阈值取一半（滑过一半展开、否则回弹）
  - **手风琴**：滑开一行自动收起其他行；行路径用 `resourceGroups[i].items[j]`（渲染时注入 `_path`）做 `setData` 精确定位，`_dx` 存位移（rpx）、`_anim` 控回弹动画；拖动过程中按 2rpx 节流，跳过高频 `setData`
  - **撤销在已读 0 次时置灰但保留占位**（`.swipe-act-off`，`opacity .45`）——保证操作区宽度恒定、吸附位置不跳
  - 行内左侧方块兼作计数徽标：已读 ≥1 显示次数，0 回落为资源名首字
  - 记完 `wx.vibrateShort({ type: 'light' })` 轻震动确认（不支持的基础库 / 机型静默忽略）
  - **收口时机**：点完即收起（一册记一次、同一册要隔一整轮才会再记，不存在连着点同一行，收起不打断任何流程）；点行体 / 折叠分组 / 从其他页返回（`onShow`）时同样收起。滑动结束紧跟的那次 `tap` 用 `_moved` 抑制，避免滑完误开打卡弹窗
  - 行副文提示改为「点击打卡 · 左滑标记读完」
- **`checkin.decrementReadCount(stageId, groupKey, resourceId)`**：已读次数 −1（撤销一次「读完」）。减到 0 时直接删除该 key，避免残留 0 值影响排行 / 汇总；返回撤销后的次数（不小于 0）

### 变更

- **`checkin.addCheckin()` 支持指定日期**：`opts` 新增 `day` 与 `backfilled`。`day` 缺省为今天；传入历史日期即为补录 —— 记录 `timestamp` 取该日 12:00（不再用 `Date.now()`，保证列表按补录日期排序与展示），并写入 `backfilled: true`；`backfilled` 在「传入日期非今天」时也会自动置真，调用方无需重复声明
- **打卡记录页（records）**：
  - 头部 `.section-head` 由 `flex-start` 改为 `space-between`（左：月份选择器，右：新增「补录」按钮）。「补录」定位为**次级操作**：`var(--cell-active)` 底 + `var(--text2)` 字 + `8rpx` 圆角，弱化配色避免抢眼，按下 `opacity: .6`
  - 记录行标签区新增「补录」标记（`.record-backfill`，中性灰，弱于阶段 / 分组彩色标签，仅 `backfilled` 记录显示）；`records.js` 列表映射补充 `backfilled: !!r.backfilled`
  - 空态提示补充「，或点上方「补录」补记」
  - 新增 `goBackfill()` 与 `applyBackfill(opt)`：后者为补录页返回回调，校验补录年份在本页可选年份（`yearRange`）内则把 `curYm` 切到该月并 `_refresh()`，让新记录立即可见
- **阶段页打卡弹窗移除「已读完」入口**：删除表单卡片 2 里的「已读完 · N 次」行，`onReadFinish`（含 `wx.showModal` 二次确认）一并移除——左滑本身已是明确的误触保护，不再需要弹窗确认；弹窗只剩备注一项，`currentReadCount` 字段与相关样式（`.form-read-count`、`.form-row .icon-right`）同步清理
- **阶段页分组头不再显示「已读 N」**：只保留今日时长徽标（`·` 分隔符与 `.rg-progress-sep` / `.rg-progress-read` 样式一并删除）。该数字是同组各册已读次数之和，而「读整套 N 遍」是循环推进的，合计看不出任何一轮的进度；册级次数仍由行内徽标承载
- **`checkin.getDayTotalsByStage()` 返回值收窄为 `{ minutes }`**：不再附带 `readCounts`（唯一消费方即上一条被移除的分组头合计）。省掉每次调用时一次全量 `getStorageSync` 与整表 key 遍历，而该函数在阶段页每次 `onShow` 都会执行
- **阶段页资源行分割线改挂左滑容器**：由 `.r-row` 移到 `.swipe-wrap`，行左移时分割线不跟着位移；`.r-row` 作为前景层 `.swipe-fg` **必须保持不透明**才能盖住下层操作区——而已打卡行的浅绿底与按下态用的 `--brand-softer` / `--brand-soft` 是**半透明令牌**（仅 6% / 10% alpha），故改用 `background-image` 叠加染色、不做 `background` 简写赋值，否则简写会把 `.r-row` 的不透明底色一并重置成透明，操作区穿透可见

## [3.1.0] - 2026-09-12

> 自 `v3.0.0` 发布以来的全部改动：「我的资源」——家长可以把自己买的书 / 动画加进来，归入现有 8 个分组之一，和官方资源一起参与打卡、时长统计、阶段进度与晋级判定。入口只在设置页，阶段页保持纯打卡视图。
> 「数据统计」两级合并为单页（顶部阶段选择器切换阶段），并修复弹层被图表穿透的问题。
> 可用 `git log v3.0.0..v3.1.0` 查看对应提交范围。

### 新增

- **「我的资源」（myResources）**：设置页「学习设置」组新增入口（右侧显示「N 项」）。页面按「阶段 → 分组」列出全部自定义资源（分组样式与阶段详情页一致，支持展开 / 折叠）；新增 / 改名 / 改归属走半屏弹窗（沿用 stage 页 `action-sheet` + `form-card` 令牌），**删除改为列表左滑 + 二次确认**（与打卡记录页同一套手势与原语），弹窗只保留「取消 / 保存」；删除仅移出清单，历史打卡记录与统计保留（靠记录里的 `resourceName` 快照）
- **资源归属选择页（resourcePicker）**：整页单选（原语 3），先选阶段、再选该阶段下可选分组；已达每阶段上限（`MAX_PER_STAGE = 50`）的阶段置灰提示
- **`utils/customResources.js`**：自定义资源存储（`qingba_custom_resources`，按「阶段 → 分组」保存）与 CRUD。名称 trim 后 1~20 字、禁止包含 `|`、同组禁同名；改名 / 改归属时**先迁移历史数据再落盘**，迁移失败整体不动
- **`utils/resources.js`**：统一资源视图，合并官方（`data.js`）+ 自定义资源，提供阶段分组渲染数据、id / 名称互查（资源已删除时回退到记录中的名称快照）

### 变更

- **官方资源 id 化**：`utils/data.js` 与 `qingba_listening_route.json` 中全部 **133 条**资源由字符串数组改为 `{ id, name }`，id 规则 `o_{阶段码}_{组码}_{两位序号}`（阶段码 `r1`~`r6` / `pb`；组码 `mpb / mgr / ma / sgr / sa / fe / se / fa`）。此后官方资源改名、调序都不影响历史数据（⚠️ 已写入的 id 不可再改）
- **打卡数据 key 改 id**：`qingba_read_counts` / `qingba_default_remarks` 的 key 由 `阶段|分组|资源名` 改为 `阶段|分组|资源id`；打卡记录新增 `resourceId` 字段（仍保留 `resourceName` 快照，用于统计与分享）
- **老数据自动迁移**：新增 `checkin.migrateResourceKeysToId()`，在 `app.js` 的 `onLaunch` 与导入备份后各执行一次（内部 `_idsMigrated` 幂等，导入需 `force` 参数重新迁移）；识别不了的 key 原样保留、不丢数据。打卡记录不做批量迁移，采用「id 优先 + 名称回退」匹配，并在改归属迁移时顺带补写 `resourceId`（自愈）
- **统计口径分离（两套 key，代码内已注释说明）**：**时长**继续按 `分组|资源名` 聚合（来自记录快照）；**已读次数**按 `分组|资源id` 聚合
- **阶段详情（stage）**：资源列表改由 `resources.getStageGroups()` 合并渲染，官方在前、自定义在后（自定义资源带「自定义」标记）；打卡 / 已读次数 / 默认备注读写全部改用 `resourceId`
- **设置页**：导出备份新增 `custom_resources` 字段；导入备份支持合并（按「阶段 + 分组 + 名称」去重）/ 覆盖；清空数据连带清除自定义资源，清空范围确认文案同步更新
- **压力测试（stress-test）**：生成记录时带上 `resourceId`，已读次数直接写 id key，避免污染 name key
- **「数据统计」两级合并为单页**：原「统计总览（`pages/stats`，7 个阶段的列表）→ 阶段统计详情（`pages/statsDetail`）」合并为一页 —— 进入即显示某阶段的累计统计，顶部左侧新增**阶段选择器**（半屏滚轮弹层，复用打卡记录页月份选择器原语），默认选中当前阶段（未设置时取第一个有数据的阶段）；删除 `pages/statsDetail/*` 并从 `app.json` 移除注册，返回一次即回「我的」
- **图表生命周期适配阶段切换**：切换阶段时若目标阶段无数据（canvas 被 `wx:if` 移除），销毁 ECharts 实例；切回有数据的阶段时按需重建，避免实例指向已失效的 canvas 节点
- **阶段详情（stage）深色档箭头颜色修正**：移除 `--row-arrow` 变量及其深色覆盖（原深色下被改成品牌绿），行尾箭头统一 `var(--text3)`（FG-2），与分组折叠箭头、WeUI 列表箭头一致
- **「关于小程序」版本号不再兜底**：移除 `FALLBACK_VERSION`，正式版显示「版本 X.X.X」，开发版 / 体验版无可读版本号时只显示「开发版 / 体验版」（原会显示「2.0.0(开发版)」，容易与真实版本混淆）
- **资源计数单位统一为「项」**：设置页「我的资源」入口由「N 个」改为「N 项」，与「我的资源」页 / 阶段详情页的分组计数（`N 项`）一致
- **避免数组解构以规避增强编译问题**：`pages/stats`、`pages/records` 中的 `const [y, m] = ...` 改为下标取值 —— 增强编译会为数组解构生成 `@swc/runtime/_array_with_holes` 依赖，部分开发者工具版本（macOS + 基础库 3.17.1）解析不到该模块会报 `module ... is not defined`

### 修复

- **统计页弹层不再被图表穿透**：`canvas` 是原生组件，层级恒在普通视图之上，半屏弹层（`mp-sheet`）盖不住它 —— 弹层打开时改用 `wx:if` 摘掉 canvas（同时销毁 ECharts 实例，关闭 / 确定后按需重建），遮罩与弹层正常生效
- **摘掉 canvas 后用等高「图表骨架」顶替**（避免遮罩下出现空洞与内容塌陷）：柱状图骨架的柱高直接取真实占比（复用 `data.chart[i].percent`，零 JS 改动），网格线与柱位按 ECharts 的 `grid` / `barMaxWidth: 24` / `borderRadius: [4,4,0,0]` 换算；雷达图骨架的 5 圈网格与数据面由新增的 `buildRadarClips()` 按画布尺寸与真实值算出 `clip-path` 百分比多边形（`center ['50%','54%']`、`radius '62%'`、`splitNumber 5` 与图表 option 逐项对齐，网格须由大到小绘制否则大圈会盖掉小圈）。配色对齐图表内的硬编码色值（`--grid` / `--bar`，深浅色各一套），骨架不依赖 canvas 实例（画布尺寸量不到时按布局常量估算）

## [3.0.0] - 2026-09-11

> 自 `v2.3.1` 发布以来的全部改动：界面全面对齐 WeUI 令牌与 `ui-design-spec` 设计规范，新增「数据统计」模块（阶段统计详情接入 ECharts 图表），统一配色 / 字号 / 间距与深色模式适配。本次变更未改动数据存储与打卡核心逻辑。
> 可用 `git log 2.3.1..v3.0.0` 查看对应提交范围。

### 新增

- **UI 设计规范沉淀**：新增 `ui-design-spec` skill，统一分组（原语1）、整页单选（原语3 picker-page）、开关（原语12）、数据看板（原语17）、阶段统计详情（原语18）等组件原语与 token，作为后续界面开发的一致基准
- **「数据统计」模块（stats / statsDetail）**：新增统计总览与阶段统计详情页，入口在「我的」页；设计对齐 WeUI 扁平 + iconfont 体系，已沉淀为 skill 原语 18
- **阶段统计详情页接入 ECharts 图表（statsDetail）** —— 页面级集成、无需自定义组件：
  - 「打卡时长分布」由纯 CSS 柱形改为**竖向柱状图**，支持触摸查看各周期时长
  - 「分组时长对比」改为**雷达图**，固定展示 8 个分组轴（按 `resourceLabels` 顺序，无数据的分组也显示、值取 0）
  - 新增**时长排行榜 / 读完排行榜**：按阶段素材的累计时长 / 读完次数降序，行内为「首字图 + 名称 + 数值」，以淡绿占比条（分母为该榜最大值）表达相对占比
  - 摘要脚注时长文案改为中文「X 小时 Y 分钟」；无任何打卡记录时显示**整页空态**统一提示（替代各模块各自的空提示）
- **ECharts 按需构建**：`utils/echarts.js` 由全量 **994KB 精简至 473KB**（仅保留柱状图 / 雷达图，及 grid / radar / tooltip 组件与 Canvas 渲染器）；新增 `utils/wx-canvas.js`（ECharts 微信 canvas 适配）
- **iconfont 新增 `icon-calendar` 字形**（`\e74a`，用于统计详情「打卡时长分布」卡头图标），同步更新 `app.wxss` 内联 ttf / woff 字体；`app.json` 注册 `statsDetail` 页面
- **独立选择页**：新增 `importPicker`（导入方式）、`clearPicker`（清空范围），与既有 `stagePicker` / `fontPicker` / `darkMode` 风格一致

### 变更

- **首页（home）对齐 WeUI 令牌**：移除 Hero 卡 `box-shadow` 外发光（WeUI 卡片扁平无阴影，靠 `--card` / `--bg` 对比分层）；指标卡右上角箭头由裸字符 `↗` 改为 iconfont `.icon-right`（色 `var(--text3)` FG-2）；Hero 标题 30rpx→28rpx、阶段进度百分比与单周增量 24rpx→28rpx（统一到次级档）；2×2 指标网格左右内距 24rpx→32rpx 对齐页面边距；柱状图「非今日」填充由硬编码 `rgba(0,0,0,.05)` 改为 `var(--card2)`（主题自适应，修复深色档不可见）——已沉淀为 skill 原语 17「数据看板卡片」
- **首页柱状图柱色统一**：`home` 的 7 日柱状图柱色**统一为低透明品牌绿 `rgba(7,193,96,.14)`**（今日 / 非今日一致，随主题自适应），移除原「今日品牌绿高亮」规则（`.home-bar-fill.is-today`）
- **首页欢迎语标点统一（home）**：`Good morning · 3-day streak` → `Good morning, 3-day streak`，与无打卡分支 `, start today` 标点一致（保留 `3-day` 连字符单数写法，符合英文复合定语规范）
- **首页移除「今日打卡」明细模块**：删除首页今日打卡列表（含左滑删除手势）、对应 `home.wxss` 样式段（`.record-*` / `.swipe-*` / `.tag-group-*`）与 `home.js` 相关逻辑（数据聚合、`touchstart` / `touchmove` / `touchend` 手势、`deleteRecord` 删除方法）。顶部「今日状态条」（今日时长 · 打卡次数）保留；打卡记录页（records）为独立副本不受影响
- **统计总览页（stats）重构为 WeUI 列表**：原图表 / 明细重构为阶段分组列表（`.weui-cell_access` + 右侧 `icon-right`），点击任一阶段 `navigateTo` 进入对应「阶段统计详情」页
- **新增「阶段统计详情」页（statsDetail）**：单个阶段的**累计**统计视图（长期常规阶段周/月/年切片意义有限，移除分段与周期切换，仅保留「累计」）——顶部累计时长以「X 小时 Y 分钟」大数字扁平展示（无卡片）；副行显示阶段跨度「首次打卡日 至 最后打卡日，阶段名称 历时 N 天」；汇总三项（打卡次数 / 打卡天数 / 读完次数）采用简单 flex 两列布局（前两项一行、第三项换行），每项右侧 `icon-right` chevron
- **设置页全面采用微信原生分组列表风格**（分组标题带 + 白卡列表），所有选择类入口统一跳转整页单选页（原语3）
- **导入备份**：由原生下拉 picker 改为整页单选（原语3）选择导入方式（覆盖式 / 合并式），右侧值改为「支持 txt/json/word」，默认不勾选
- **清空数据**：由原生下拉 picker 改为整页单选（原语3）选择清空范围（全部数据 / 常规1-6 / 准桥梁），移除右侧值文案与条数信息，默认不勾选
- **设置入口文案与样式统一**：「生成测试数据」更名为「压力测试」（右侧说明改用通用 `.cell-value` 样式）；「版本号」更名为「关于小程序」（右侧值显示「版本 X.X.X」）
- **设置页「当前阶段」移出开发者工具**：原与「压力测试」同属「开发者工具」分组且仅开发版可见（`showDevTools: env === 'develop'`），导致正式版 / 体验版用户在首次启动引导之后无法再修改阶段。现移入原「学习计划」分组并置于首位，该分组同步更名为「学习设置」——涵盖「阶段状态」与「规则开关」两类配置。切换阶段仍按覆盖式重算前序完成标记（`setCompletedStages`），阶段往回调不会残留已完成状态
- **小小优趣成长计划默认开启**：`utils/checkin.js` 的 `isYouquPlanEnabled()` 改为「从未设置过即默认开启」（显式关闭后按存储的布尔值判断），设置页开关默认显示为开；导入备份缺该字段时不修改当前设置
- **我的页卡（mine）布局对齐设置页**：采用与设置页同一套微信风格分组列表原语（全宽平铺无圆角 `.group-card` + `.cell`），并修复此前深色模式不跟随（仅挂 `fontClass` 未挂 `darkClass`）；cell 为「左侧图标 + 标题 + 右 chevron」结构，已去掉 group-title 与头像资料卡
- **我的页（mine）入口图标由 emoji 改为 iconfont**：「关于 / 打卡记录 / 数据统计 / 设置」的 📚 📅 📊 ⚙️ 改为 `icon-info` / `icon-squarecheck` / `icon-rank` / `icon-settings`，新增 `.weui-cell__hd .iconfont`（40rpx、`var(--text2)`、`margin-right:8rpx`），与右侧 `.icon-right` 箭头视觉权重一致
- **打卡弹窗（stage）按 skill 重构**：从私有 `.ci-*` 类切换为原语 4 `.sheet-mask`/`.action-sheet`、原语 13/15 `.form-card`/`.form-row`/`.form-field`、原语 14 `.seg-control`/`.seg-item`（10/15/20/30 快捷时长，选中态走品牌绿）；底部按钮优化为 **skill 原语 16 标准 `.btn` 族**（`.btn-row` 居中并排 + `.btn-secondary` 取消 + `.btn-primary` 打卡）；取消按钮字色灰改黑、主按钮去渐变改实心 `var(--brand)`；移除 `.dm-dark`/`.dm-auto` 中已废弃的 `.ci-*` 选择器
- **阶段详情（stage）字体基准提升到 34rpx**：原全局 28rpx 基准下所有 `calc(Nrpx * var(--fs, 1))` 按 34/28≈1.214 整体放大（主文 28→34、小字 20→24 / 22→27 / 24→29、26→32、30→36、32→39、大号 34→41 / 40→49 / 44→53 / 48→58），并在 `.sheet-mask` 设 34rpx 根基准使继承文本同步
- **阶段详情（stage）「完成阶段」按钮重构为 WeUI 风格进度填充长按钮**：移除原「晋级卡片」（分组标题 + 微信原生 `progress` 进度条 + 已投入/目标时长 + 自定义按钮），改为单个 `weui-btn weui-btn_block` 按钮——底色普通按钮灰（`weui-btn_default`），已达成部分用品牌绿从左向右填充，达成 100% 转 `weui-btn_primary` 品牌绿 + 白字；复用全局按钮令牌，删除本页全部 `.promote-*` 重复样式。按钮文案动态化：最后阶段（准桥梁）显示「完成阶段」，其余常规阶段显示「晋级下一阶段」
- **阶段详情（stage）关键要点模块改造为 WeUI cell 列表**：`.weui-panel` + `.kp-list` 点状卡片改为 `.weui-cells` + `.weui-cell`；去掉小圆点、序号与「重要」标签，只展示文字；重点条目文字用 `--text`、其余用 `--text2` 区分层级；字号 26→28rpx；清理 `.kp-list` / `.kp-item` / `.kp-dot` / `.kp-body` / `.kp-tag` 等约 100 行废弃样式
- **阶段详情（stage）分组标题统一为全局 `.group-title`**：原本地 `st-group-head` / `st-group-title` / `st-group-sub` 三件套（标题左、积累信息右分栏）改为复用全局 `.group-title`（`app.wxss`），并把阶段名与积累信息（`res-hl-*` 高亮）拼在同一行内，移除本页重复样式
- **阶段详情（stage）样式死代码清理与深色变量化**：`stage.wxss` 由 766 行精简到 495 行——删除已无 wxml 引用的 `.lock-*` / `.pm-picker` / `.res-hl-*` / `.rg-collapsed-*` / `.rg-tag` / `.r-read-*` 等规则，移除 `.dm-dark` / `.dm-auto` 下 20+ 条硬编码深色覆盖（改由 `--brand-softer` 等变量自动适配），多行规则压缩为单行
- **阶段详情（stage）分组分隔线重构（`.res-list`）**：原分隔线挂在「折叠态组头」`.rg-head-folded`（仅折叠态生效，展开态分组间缺线），改为挂在分组容器 `.res-list` 底部 `border-bottom: 1rpx solid var(--divider)`（通栏 1px，展开 / 折叠均生效），末组去线；移除冗余 `.rg-head-folded` 样式与 `r-arrow-gray` 类
- **路线页（route）WeUI 重设计**：原卡片式时间线（`.timeline` + `.stage-card`）改为 WeUI 分组列表——外层 `.weui-cells`、每行 `.weui-cell weui-cell_access`；行首节点由 48rpx 缩为 36rpx，并用 1rpx 竖线串联（末行无线），节点三态为纯色：当前 = 品牌绿实心 + 序号、已完成 = 浅绿底 + 绿色对勾、未解锁 = 灰底 + 序号；右侧状态改为扁平 chip（`.route-chip`）。保留「进入 / 晋级」两行条件
- **路线页（route）时间线节点移到右侧并改为三态图标**：原行首 `weui-cell__hd` 的序号节点移到右侧 `weui-cell__ft`（`.route-node-wrap` 节点 + 1rpx 连接线），中区只保留阶段名 + 概要 +「进入 / 晋级」条件；节点改为 iconfont 三态图标——当前 `.icon-right`（`var(--text3)` 正常箭头色，读作「点击进入」）、已完成 `.icon-check`（`var(--brand)`）、未解锁 `.icon-lock`（`var(--text3)`，未解锁态去描边）；移除原右侧状态 chip
- **路线页「当前阶段」高亮改为整行底色（`.current-cell`）**：此前高亮加在 `weui-cells` 容器 `.current-panel` 上，会把已完成 / 未解锁行一并染绿，导致三态失去区分度；现将底色下放到「当前」那一行（`.current-cell` 浅绿 `rgba(7,193,96,.12)`、按下 `.18`，深色 `.20` / `.28`），容器仅保留圆角卡外观（去通栏绿底）。当前节点同步去掉描边与底色，由整行绿底承担区分
- **路线页（route）容器回归 WeUI 默认外观**：移除 `.current-panel`（原 `background: transparent` + `.weui-cells::before/::after { display:none }`）——透明底会覆盖 `.weui-cells` 自身的 `background-color: var(--card)`，使顶部「当前阶段」组实际透出页面灰底；隐藏通栏线又让它与下方「学习路线」组外观不一致。现容器恢复 `.weui-cells` 默认
- **路线页时间线连接线跨行连续（后还原）**：曾用 `.route-node-line::after` 补齐 68rpx 断口，后经评估**还原为简单实现**（移除 `::after` 补丁与 `position: relative` / `z-index:1`，恢复 `flex:1` 内容盒连接线、末行不渲染），`ui-design-spec` 原语 12 同步还原。其余改动（副信息只挂 `.route-meta`、`.route-name` 不设字重、容器保持默认外观）保留
- **顶部「当前阶段」模块改为「分组标题 + cell」**：`weui-cells__title` 展示「当前阶段」，其下单条 cell 显示阶段名，右侧 `.weui-cell__ft_value` 展示该阶段进度百分比；进度与阶段详情页完全同口径（按 `required.type` 取 `getStageMinutes` / `getAccumulatedMinutes`，`Math.floor` 向下取整、上限 100%）。已移除原「已投入 / 目标时长」文案与「当前」chip
- **关于页（about）改用 WeUI 文章原语**：原私有类（`.para` / `.sub-title` / `.stage-block` / `.warn-block` / `.method-block` / `.hl` / `.disclaimer` / `.bullet` / `.banner-*` / `.chapter-*`）改为 `.weui-article` + `.weui-article__h2` / `__p` 与 `.about-*` 命名，同步移除 `.dm-dark` / `.dm-auto` 下 7 条深色硬编码覆盖
- **打卡记录页（records）头部对齐**：`.section-head` 补左右内距 `padding: 0 32rpx`，日期 / 月份选择器由居中 `center` 改为左对齐 `flex-start`
- **CSS 变量 token 重命名与新增**：全局 `--text2` → `--text3`、`--text3` → `--text4`（取值不变）；新增 `--text2` token（浅 `#6b6b6b` / 深叠白 `.78`），按 `--text → --text2 → --text3 → --text4` 梯度排序
- **文字色变量对齐 WeUI FG 并收敛为三档**：`--text` / `--text2` / `--text3` 严格对应 FG-0 / FG-1 / FG-2；深色档取值由 `.92 / .55` 改为官方 `.8 / .5`。原 `--text3`（FG-1）合并入 `--text2`，原 `--text4`（FG-2）整体提升为 `--text3`，`--text4` 移除；全站 69 处引用按「先 3→2、后 4→3」顺序替换
- **全站字号统一到 WeUI 规范档**：36 处 `26rpx`（13px，非规范档）统一为 `28rpx`；打卡弹窗按比例放大的遗留值收敛（`.pm-stage-name` / `.pm-btn` 36→34rpx、`.pm-form-unit` / `.pm-quick-btn` 32→28rpx、`.pm-stage-tip` 29→28rpx、`.pm-num-input` 41→34rpx）；`.home-bar-label` 与 `stats` 的 `.overview-arrow` 由 20rpx 提到 24rpx。现主力档位为 34 / 28 / 24rpx，`26 / 29 / 32 / 36 / 41rpx` 已清零
- **WeUI 风格系统性重构：纯色化、去渐变 / 外发光、矩形圆角**：路线页（stage）与打卡记录页（records）全面去除 `linear-gradient` 与 `box-shadow` 外发光，统一改用扁平纯色，深色档同步收敛为纯色低透明叠加；圆角对齐 WeUI（弹层 / 月份按钮 `16rpx`、月份 chip `8rpx`、`.weui-panel` 卡片 `20rpx`）；记录头像由 `96rpx` 渐变改为 `80rpx` 纯色 `#5a9af0`
- **深色模式切换到微信原生 darkmode 配置**：`app.json` 开启 `darkmode: true` + `themeLocation: "theme.json"`，`window` / `tabBar` 颜色键全部改 `@key` 占位符（含 `backgroundColorTop` / `backgroundColorBottom`），新增 `theme.json` 提供 light / dark 两套配色；导航栏、页面背景、tabBar 由微信框架按系统主题直接渲染。`app.js` 移除 `applyChrome()` 与系统深色探测，自定义深色开关仅控制内容区 `darkClass`
- **全局分隔线去除 `scaleY(.5)` 缩放**：`.weui-cells::before/::after`、`.weui-cell::before`、dialog 内线均改真实 `1rpx`，`.weui-cells` 通栏线定位由 `0` 调为 `-1rpx` 避免与首行 cell 线重叠
- **列表分组间距收紧**：`.weui-cells` 移除 `margin-top`；`.weui-cells__title` 的 `margin-top` / `margin-bottom` 全部合入 `padding`，不再使用 margin，确保深色模式卡片背景连续铺满
- **`.weui-cells__title` 下间距回归官方**：`padding` 由 `32rpx 32rpx 16rpx` 改为 `32rpx 32rpx 6rpx`（官方 `margin-bottom: 3px`）
- **`.cell` 列表项家族统一并合入全局 `app.wxss`（原语 1）**：`settings` / `mine` / `stagePicker` / `importPicker` / `fontPicker` / `clearPicker` / `darkMode` 七页的 `.cell` 及其子类统一为一份定义迁到全局，各页删除重复块（含 settings 的死代码 `.cell-picker`）；`.cell-check` 统一为 `#34C759`（深 `#30D158`）
- **`.cell-desc` / `.cell-info` 样式统一**：四处对齐为同一份定义（`.cell-desc` 字号 28rpx 的两处下调至 26rpx 起 + `line-height:1.4` + `margin-top:4rpx`；`.cell-info` 补 `flex:1` / `min-width:0` / `margin-right:16rpx` / `display:flex` / `flex-direction:column`）
- **`.group` 分组 section 家族统一并合入全局 `app.wxss`（原语 1）**：`settings` / `mine` / `darkMode` / `stagePicker` / `importPicker` / `fontPicker` / `clearPicker` 七页的 `.group-title` / `.group-card` 对齐为同一份定义迁到全局（全宽平铺 `margin:0` + `border-radius:0` + `overflow:hidden`），各页删除重复块；`stats` / `home` 因采用圆角卡片保留本地 `.group-card` 覆盖
- **`.container` 容器样式收敛到公共 `app.wxss`**：各页 `.container` 的 `padding` / `box-sizing` / `min-height:100vh` / `safe-area-inset-bottom` 统一为一份迁到全局
- **cell 右侧箭头改用 iconfont 图标**：列表项右侧 chevron 由文本 `›` 改为 `icon-right`（`\e6a3`），箭头与右侧值对齐并随字号变量 `--fs` 缩放
- **`.weui-tag` 去除 margin**：标签间距改由父级 flex `gap` 控制；records 页 `tag-stage` / `record-remark` 补 `weui-tag` 类统一走全局标签原语
- **间距工具类与 tabBar 配色微调**：`app.wxss` 新增公共 `.mb-16` 间距工具类；tabBar 背景色由纯白 `#ffffff` 调整为 `#f5f5f5`、未选中文字色由 `#999999` 调深为 `#191919`（后随 theme.json 再调整为微信标准灰 `#7A7E83` / 背景 `#F7F7F7` / 上边框 `black`）
- **iconfont 字体扩充与维护**：`app.wxss` 内联 base64 字体更新，新增 `icon-right`、`icon-lock`、`icon-unlock`、`icon-info`、`icon-squarecheck`、`icon-rank`、`icon-settings`、`icon-location`、`icon-home`/`icon-homefill`、`icon-my`/`icon-myfill`、`icon-circle`/`icon-circlefill`、`icon-calendar` 等字形；改用 `@font-face` 内联 base64（不再在 `App.onLaunch` 用 `wx.loadFontFace`）
- **按钮 / 间距微调与口径修正**：`.weui-btn-area` 上内边距对齐 `@weuiBtnAreaGap`（96rpx）、并排按钮 `gap` 32rpx；`.weui-cell__hd` 右间距 24rpx→16rpx；`.weui-btn_block` 改为 `.weui-btn.weui-btn_block` 修正特异性；完成进度百分比由 `Math.round` 改为 `Math.floor`；`getRequiredHours` 修正（常规6 / 准桥梁按当前阶段自身时长评估，不再误匹配跨阶段累计投入规则）；阶段晋级口径函数 `parseTargetHours` / `getRequiredHours` 收敛到 `utils/data.js` 供 `stage.js` / `route.js` 共用

### 修复

- **iconfont 字体跨页面渲染修复**：原在 `App.onLaunch` 用 `wx.loadFontFace` 注册字族，仅作用于 App 所在 webview，不下发给各页面，导致「我的 / 设置」等页图标不渲染；改为在全局 `app.wxss` 顶部用 `@font-face` 内联 base64 data URI 注册字族，跨页面生效；同步清理 `app.js` 中已无用的 `iconfontDataUri` 常量与 `loadIconFont` 方法
- **iconfont 开发者工具模拟器渲染修复（data URI MIME 兼容）**：开发者工具内置旧版 Chromium 不识别 `font/woff` MIME，会把图标回退为 `□`；改用兼容性最广的 `application/font-woff` 后，开发者工具与真机均能正常加载
- **`wx.getSystemInfoSync` 弃用告警修复**：`app.js` 读取系统深色偏好由 `wx.getSystemInfoSync` 改为 `wx.getAppBaseInfo`（旧基础库回退）
- **系统深色模式下页面留白**（导航栏下方亮条 + 下拉 / 上拉橡皮筋区露白）：改用微信原生 darkmode + `theme.json` 双重保障，整窗背景随系统深色变深
- **系统深色下进度条底色不变**：改用实际深色状态判断（结合手动 dm-dark 与跟随系统 dm-auto），深色下轨道底色统一为深灰
- **阶段详情页锁定提示条深色对比度不足**：补充 `.dm-dark` / `.dm-auto` 覆盖，文字改为浅金 `#e0a56a`（对比度提升至约 7:1）
- **「完成阶段」按钮未达成态点击无反馈**：改为弹出「还需 Xh 达成目标」（或「暂不可完成」）提示
- **打卡成功后刷新阶段进度**：补 `_refreshPromoteInfo()`，使按钮填充 / 已投入时长 / 可完成态在打卡后即时更新
- **`.gitignore` 中文注释乱码**：GBK 误编码残留导致 GitHub 上显示乱码；已以 UTF-8 无 BOM 重新保存，忽略规则内容不变

### 文档

- **`ui-design-spec` skill 基于微信官方设计指南与 Tencent/weui 源码校准**：
  - 新增 `design-guidelines.md`：沉淀微信官方《小程序设计指南》原则层（四大设计原则、视觉规范指针、导航 / Tab、加载与结果反馈、异常与层级、落地自检清单）；量化令牌并入 `design-tokens.md` §7（22/17/15/14/12pt 字号档、点击热区 7–9mm、设计稿 375/390、Tab 2–5、弹窗 1.5s）
  - `design-tokens.md` 以克隆仓库 `D:\github\weui`（Tencent/weui 主干 `src/`）逐项核对：补全真实 token（BG-4/5、GLYPH、各色阶档、TAG、MATERIAL、SEPARATOR、STATELAYER 等）；修正深色 `BG-COLOR-ACTIVE`；新增 §8 care 模式（适老）配色档
  - `components.md` 订正 dialog 部分（标题字重 500、正文 FG-1、底部留白 32px、主操作默认 LINK 蓝、补齐 hd/ft 结构）
  - 新增原语 16「`.btn` 按钮族」、原语 12「时间线列表 Timeline」、原语 17「数据看板卡片 Dashboard」、原语 18「阶段统计详情页」
  - `SKILL.md` / `design-tokens.md` 同步多轮约定：`--text2/3/4` 与 FG 映射、`--card2`（≈BG-3）、分隔线改真实 1rpx、项目字号档（34/28/24 有效，`26rpx` 及 `29/32/36/41rpx` 废弃）、「扁平纯色、禁止渐变 / 外发光」「`.weui-tag` 无 margin」「分组容器 `border-bottom` 通栏分隔线」「`.weui-cells` 容器保持 WeUI 默认外观」「当前项高亮用 cell 级底色」「iconfont 维护方式」等
- **README 同步更新**：补充深色模式、字体大小设置、数据统计模块（含 ECharts 图表与排行榜）、`utils/theme.js` 与 `utils/echarts.js` 说明，设置页「小小优趣成长计划」标注默认开启

### 清理与配置

- **`app.json` 开启 `lazyCodeLoading: "requiredComponents"`**：组件按需注入、优化启动；项目无自定义组件，无注入时序风险（此前一度移除，本次为优化启动重新启用）
- **ECharts 引入方式优化**：由全量包（994KB）改为**按需构建**（473KB，仅柱状图 / 雷达图），显著降低主包体积，使「主包 < 1.5M」检查通过

## [2.3.1] - 2026-09-03

> 自 `v2.3.0` 发布以来的全部改动。
> 可用 `git log v2.3.0..v2.3.1` 查看对应提交范围。

### 修复

- 阶段详情页锁定提示条文字在深色模式下对比度不足（浅金 `#8b6914` 近黑底约 3:1）：补充 `.dm-dark` / `.dm-auto` 覆盖，文字改为浅金 `#e0a56a`，对比度提升至约 7:1
- 阶段详情页进度条底色在「跟随系统 + 系统深色」时仍为浅灰：改用实际深色状态（`isDark`，结合 dm-dark 手动与 dm-auto 跟随系统）判断，深色下轨道底色统一为深灰 `#3a3a3a`

## [2.3.0] - 2026-09-03

> 自 `v2.2.0` 发布以来的全部改动。
> 可用 `git log v2.2.0..v2.3.0` 查看对应提交范围。

### 新增

- **首次启动引导**：首次进入小程序弹出全屏引导层，设置当前阶段；所选阶段之前的所有阶段自动标记为已完成

### 修复

- 阶段误解锁：未设置当前阶段时，路线页常规1 错误显示为已解锁；`getCurrentStage` 无存储改为返回 `null`，未设置时全部阶段锁定（与首启引导一致）
- 设置页「当前阶段」切换、生成测试数据未同步标记前序阶段为已完成，导致路线页前序阶段显示锁定而非已完成；现已与首启引导逻辑对齐（选某阶段为当前，其前序自动标记完成）

### 数据安全

- 备份导出新增已完成阶段名单（`STAGE_DONE_KEY`），导入时一并恢复（合并模式取并集）
- 清空全部数据改为移除当前阶段与已完成名单，回到初始未设置态（全部锁定），避免残留脏数据

## [2.2.0] - 2026-09-02

> 自 `v2.1.0` 发布以来的全部改动。
> 可用 `git log v2.1.0..v2.2.0` 查看对应提交范围。

### 新增

- **字体大小设置**：设置页新增「显示 → 字体大小」，支持小 / 标准 / 大 / 特大四档，通过 CSS 变量（`--fs`）缩放全站 40rpx 以下的正文字号，选择即时生效并随备份导出/导入
- **深色模式**：设置页新增「显示 → 深色模式」，跟随系统 / 浅色 / 深色 三态切换（微信原生分组样式）
- 全站深色适配：页面背景、卡片、文字、分隔线使用 CSS 变量色板（`--bg` / `--card` / `--text` 等），导航栏与 tabBar 跟随深色动态配色
- 版本更新机制：`app.js` 接入 `wx.getUpdateManager()`，发布新版本后用户进入小程序即提示"立即更新"并自动重启到新版本（不删除小程序、不清除本地数据）

### 修复

- 打卡记录页本月无记录时月份选择器不可用的问题：月份选择器改为始终显示，不再随列表隐藏
- 深色模式适配遗漏修复：
  - 打卡弹窗（打卡 / 晋级测试弹窗）补充深色适配：弹窗根节点绑定深色类，快捷时长按钮与「读完」标签改为深色配色
  - 设置页顶部导航栏适配深色：`onLoad` / `onShow` 补 `applyFontLevel` 调用，移除写死的白色导航栏配置，进入页面时随模式动态切换导航栏配色

### 清理与配置

- 设置页重构为微信原生分组列表风格：去掉彩色图标卡片与装饰竖条，改为分组标题 + 白卡列表（左标签、右值、inset 分隔线），布局更简洁
- 删除 `app.json` 中未实际生效的 `darkmode: true` 配置（未提供 `theme.json`，避免开发者工具编译报错）

### 文档

- README 补充深色模式、字体大小设置说明与 `utils/theme.js` 说明

## [2.1.0] - 2026-09-01

> 自 `v2.0.0` 发布以来的全部改动。
> 可用 `git log v2.0.0..v2.1.0` 查看对应提交范围。

### 数据安全

- 修复 `saveAll` 分片写入"先删后写"导致中断即丢数据：改为先写新分片，全部成功后再清理旧数据，失败自动回滚
- 修复主 key 写入失败仍删除旧分片的问题：仅在写入成功后才清理
- `saveAll` / `addCheckin` / `deleteCheckin` 增加返回结果，打卡保存失败时提示错误而非显示"打卡成功"
- `getAll` 在无法枚举 storage key 时按月份回溯探测分片，避免分片态数据"凭空消失"

### 性能

- 单次打卡在分片模式下只读写当天所在月份的分片，避免全量读写（原为数十次同步 I/O）
- 阶段页资源统计改为一次批量读取（新增 `getDayTotalsByStage`），避免每个资源触发一次全量读取
- 打卡后基于本地值累加时长，不再额外触发一次全量读取
- 首页 / 记录页改为仅 `onShow` 刷新，避免首屏重复计算两次
- 滑动删除增加位移阈值节流，减少 `touchmove` 高频 `setData` 导致的掉帧

### 新增

- **数据备份导出**：生成 docx 备份文件，用 picker 选择「打开备份文件 / 转发给好友」，取消时不生成文件
- **数据备份导入**：兼容 txt / json / docx，用 picker 选择「覆盖式导入 / 合并式导入」，合并时按 id 去重并保留本地记录
- **清空数据**：支持按阶段清除，用 picker 选择「全部数据 / 常规1-6 / 准桥梁」，二次确认后执行
- **测试数据生成**：按真实计划生成，每阶段累计约 80-90 小时，日期从今天往回推算，每日 15-60 分钟，含约 12% 缺卡日
- 首页"去打卡"跳转路线页后自动滚动到当前阶段
- 首页 Keep 风格重构，支持全资源打卡、记录按月汇总
- 打卡弹窗重构表单布局，新增备注输入与默认记忆、已读次数展示
- 首页概览与阶段口径统计，新增时长统计 / 阶段时长 / 已读完统计详情页
- 新增打卡记录页，支持按月份浏览与查看备注
- 常规阶段晋级功能：设置页可切换当前阶段，路线页高亮当前阶段
- 阶段锁定机制：仅当前阶段可打卡，之前/之后阶段仅可查看
- 关于页文案过审优化，弹窗取消焦点处理

### 修复

- 阶段页索引非法时提示"阶段不存在"并返回，避免停在空白页无法退出
- 导出备份取消选择时不再提示"已生成备份文件"，且不再提前生成文件
- 复制备份内容后移除多余的"已复制"弹窗（系统已有提示）
- 导出备份、导入备份、清空数据均改用 picker 组件选择操作方式
- 当前阶段之后的阶段仍可打卡的问题
- 清空数据未含分片 key、存储容量估算不准确的问题
- 存储分片切换后残留清理
- 图表按 canvas 实际尺寸渲染，尺寸统一
- 月份选择器取消 / 确定按钮文字垂直居中
- 路线页样式优化：去掉顶部标题区域与已完成标签，已完成阶段绿色显示，晋级标准单独一行
- 常规 X 详情页顶部锁定提示条去除

### 清理与配置

- 删除未被引用的 `utils/wxcharts-min.js`（约 30KB）与 4 个空页面目录
- 移除无效的 `checkinDirty` 脏标记（写入后从未被真正消费）
- 统一基础库版本为 3.5.5，关闭 sourceMap 上传，清理 `uploadWithSourceMap_` 脏键
- 打包排除 `CHANGELOG.md`、`.gitignore`；AppID 移入 `project.private.config.json`
- 统一 `projectname` 编码为明文中文

### 文档与构建

- 添加项目 README 文档，并持续更新功能说明
- README 增加打赏二维码（微信收款码），仅用于 GitHub 展示，小程序内不含打赏入口
- 小程序代码包排除 README 与 assets 目录

## 发布版本

| 版本 | 说明 |
| ---- | ---- |
| 3.7.2 | 打卡记录标签补齐深色档（修「常规N」浅底过亮）；「关于」页排版照官方 article 数值重构，并修掉深色下「加粗几乎看不出」、移除页内分享按钮。 |
| 3.7.1 | 修复半屏弹层关闭后输入框 placeholder 残留在屏幕上（阶段页 / 目标时长页 / 我的资源页）；「我的资源」空态改按 sections 判定，避免有资源却整页空白。 |
| 3.7.0 | 「我的资源」归属与记录 / 统计页选择器改用原生 picker；阶段进度分母可配置（默认建议区间上限，新增「阶段目标时长」页可逐阶段自定义）；分享进入不再先看封面广告。 |
| 3.6.0 | 新增「熏听」分组：开关打开后阶段页可打卡音频素材，时长按阶段系数折算为有效时长（常规1/2 不计入、常规3 ×0.5、常规4 起 ×0.8）；记录/统计同步口径，雷达图按阶段分组动态出轴。 |
| 3.5.1 | 资源选择弹层按分组数自动取高，左列选中态统一为品牌绿对勾、左右同白底；编辑页整页收成一块 cells，补录页收敛为「日期 / 阶段」与「学习内容」两块；修复编辑页资源选择「分组切不动」。 |
| 3.5.0 | 字号与深色改为跟随微信 / 系统，移除小程序内手动档与两个选择页；补录改为一次补一天的多条，单条编辑拆为独立页并改用原生选择器、压缩布局；另统一弹层关闭按钮并补齐深色蒙层。 |
| 3.4.1 | 新增分享能力：各页定制转发标题、落地页统一首页，「关于」页可分享给好友与朋友圈；「关于」页排版按 WeUI 规范重构（22pt 主标题、正文 17pt）；修复记录页标签不一致。 |
| 3.4.0 | 打卡记录左滑新增「编辑」；首页指标卡可点开今日明细弹窗；统计页排行榜占比分母改为累计值；全站细线改用 hairline 方案修复真机不可见；另修复深色选择器弹层与一批数据安全问题。 |
| 3.3.0 | 首页新增 Day N（当前阶段进行天数）与未设置阶段的欢迎卡引导；2×2「打卡天数」改为「连续打卡」；路线页未设置阶段不再显示满屏锁，顶部「当前阶段」可直达选择页。 |
| 3.2.0 | 打卡补录：可补记历史日期的打卡（日期 + 阶段/分组/资源三级级联）；阶段页资源行支持左滑「读完 / 撤销」，打卡弹窗与分组头的已读入口收口。 |
| 3.1.0 | 「我的资源」：把自己买的书/动画加入现有分组，与官方资源一起打卡与统计；官方资源 id 化并自动迁移老数据；数据统计两级合并为单页，修复弹层被图表穿透。 |
| 3.0.0 | 全新布局：设置与选择交互改为微信分组列表；全面对齐 WeUI 规范（纯色化、字号收敛、深色适配）；新增数据统计模块，含 ECharts 柱状图/雷达图与素材排行榜。 |
| 2.3.1 | 修复阶段详情页锁定提示文字与进度条底色的深色模式适配遗漏（对比度提升、跟随系统深色生效）。 |
| 2.3.0 | 新增首次启动引导（设置当前阶段，前序自动标记完成）；修复阶段误解锁与前序阶段完成标记；备份导入/清空兼容完成名单与未设置态。 |
| 2.2.0 | 新增深色模式（跟随系统 / 浅色 / 深色）与字体大小设置；接入版本更新机制；设置页重构为微信原生分组列表风格；修复打卡记录页月份选择器不可用、打卡弹窗与设置页导航栏深色适配遗漏等问题。 |
| 2.1.0 | 数据备份导出支持打开/转发 docx 文件；数据导入支持覆盖式与合并式；清空数据支持按阶段清除；修复打卡保存失败仍提示成功等数据安全问题；优化打卡与页面刷新性能。 |
| 2.0.0 | 儿童英语听力打卡小程序（庆爸2.0）：首页阶段统计 今日打卡、路线图打卡记时长、阶段详情支持晋级、记录按月筛选可删除、数据备份导入。本地存储无后端，首次使用请先在路线页设置当前阶段。 |
