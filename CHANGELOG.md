# 更新日志

本项目所有重要变更都会记录在此文件中，格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

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
| 3.0.0 | 全新布局：设置与选择交互改为微信分组列表；全面对齐 WeUI 规范（纯色化、字号收敛、深色适配）；新增数据统计模块，含 ECharts 柱状图/雷达图与素材排行榜。 |
| 2.3.1 | 修复阶段详情页锁定提示文字与进度条底色的深色模式适配遗漏（对比度提升、跟随系统深色生效）。 |
| 2.3.0 | 新增首次启动引导（设置当前阶段，前序自动标记完成）；修复阶段误解锁与前序阶段完成标记；备份导入/清空兼容完成名单与未设置态。 |
| 2.2.0 | 新增深色模式（跟随系统 / 浅色 / 深色）与字体大小设置；接入版本更新机制；设置页重构为微信原生分组列表风格；修复打卡记录页月份选择器不可用、打卡弹窗与设置页导航栏深色适配遗漏等问题。 |
| 2.1.0 | 数据备份导出支持打开/转发 docx 文件；数据导入支持覆盖式与合并式；清空数据支持按阶段清除；修复打卡保存失败仍提示成功等数据安全问题；优化打卡与页面刷新性能。 |
| 2.0.0 | 儿童英语听力打卡小程序（庆爸2.0）：首页阶段统计 今日打卡、路线图打卡记时长、阶段详情支持晋级、记录按月筛选可删除、数据备份导入。本地存储无后端，首次使用请先在路线页设置当前阶段。 |
