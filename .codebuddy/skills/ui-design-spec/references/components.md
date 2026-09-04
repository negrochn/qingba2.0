# 微信组件样式约定

> 基于 `design-tokens.md`，纯微信风格组件原语。**不依赖任何项目既有样式**；所有颜色 / 字号 / 间距均引用 token。

## 导航栏 `nav-bar`
- 白底；标题居中，`nav-title` 字（34rpx / 600 / `#000`）；左返回箭头用 chevron 字形或图标。
- 深色：背景随系统，标题转 `rgba(255,255,255,0.92)`，箭头随 `chevron` 深色值。
- **变体**：多选态下左为"取消"、中为"已选择 N 条消息"、右常驻"操作"按钮（`selectedCount === 0` 时禁用 + 不可点）。

---

## 原语 1：`.group`（全宽分组 section + 标题带）

灰色标题带 + 白色全宽 section；section 无侧边距、无圆角；段间灰色间隙由 `.group` 的 `margin-bottom`（`group-gap`）提供，分隔线从屏幕左缘缩进对齐文字。

```xml
<view class="group">
  <view class="group-title">账号</view>
  <view class="group-card">
    <view class="cell">个人资料 <text class="cell-chevron">›</text></view>
    <view class="cell">账号安全 <text class="cell-chevron">›</text></view>
    <view class="cell cell-last">个人信息与权限 <text class="cell-chevron">›</text></view>
  </view>
</view>
```

- `.group-title`：字 `text-2`、`26rpx`，padding `group-title-pad`，背景同 `bg`（即灰带）。
- `.group-card`：背景 `card`，`margin:0`、`border-radius:0`（全宽平铺，无圆角、无侧边距）；`overflow:hidden` 防子元素溢出。

## 原语 2：`.group-flat`（裸白带 + 行外 caption）

无标题带、无圆角卡片；row 与 caption 是**同级**单元，caption 在灰底上、左缩进与 row 对齐；带 caption 的组间用 `group-gap-lg`。

```xml
<view class="group-flat">
  <view class="cell">
    <text class="cell-label">个性化推荐</text>
    <switch class="cell-switch" checked />
  </view>
  <view class="cell-caption">开启后，将为你推荐兴趣相关度更高的音乐内容</view>
</view>

<view class="group-flat">
  <view class="cell">
    <text class="cell-label">优先使用无损音质播放</text>
    <switch class="cell-switch" />
  </view>
  <view class="cell-caption">
    开启后，具备无损音源的歌曲始终以无损音质播放，移动网络下将消耗更多数据流量
  </view>
</view>
```

## `.cell` 基类（三变体共用）

统一约束（wxss）：
- `display:flex; align-items:center; justify-content:space-between;`
- 最小高度 `cell-h`（88rpx，点击热区）。
- 左右 padding：左右 `cell-pad-x`（32rpx，对称）。
- 行间细分隔线：`border-bottom:1rpx solid divider-row`，缩进左 32rpx；末个 cell 去线。
- 按下态：`background` 略深（建议 `rgba(0,0,0,0.04)`，深色模式 `rgba(255,255,255,0.06)`）。
- 主文字 `.cell-label`：字 `text`、34rpx。

三变体：

**① 开关 cell**（`.cell` + `<switch>`）
```xml
<view class="cell">
  <text class="cell-label">微信内消息横幅</text>
  <switch class="cell-switch" />
</view>
```
- 复用小程序原生 `<switch>`（**不要**自定义圆球组件，保证一致性与性能）。
- 开启色绑定：`color="{{successColor}}"`，浅色 `#34C759`、深色 `#30D158`。
- 关闭态底色 `#E9E9EB`（深色 `#39393D`）。

> **项目补充（自定义胶囊开关）**：在"深色模式"这类**独立设置页**中，项目改用自绘 `.switch` 胶囊开关（而非原生 `<switch>`），开启态走 WeChat 品牌绿 `#07C160`、关闭态 `#e9e9e9`，深浅模式样式一致。结构见下方「原语 12：`.switch`（自定义 iOS 胶囊开关）」。内联设置行（如"小小优趣成长计划"）仍沿用原生 `<switch>`。

**② 右侧值 + chevron cell**（`.cell-right`）
```xml
<view class="cell">
  <text class="cell-label">消息提示音</text>
  <view class="cell-right">
    <text class="cell-value">默认</text>
    <text class="cell-chevron">›</text>
  </view>
</view>
```
- `.cell-value`：字色 `text-2`，字号同 row。
- `.cell-chevron`：字色 `chevron`，约 34rpx。

**③ 多行描述 + chevron cell**（`.cell-multi`）
```xml
<view class="cell cell-multi">
  <text class="cell-label">通知显示内容</text>
  <view class="cell-detail">
    <text class="cell-desc">显示朋友和群聊的名称、消息内容</text>
    <text class="cell-chevron">›</text>
  </view>
</view>
```
- `.cell-multi`：`min-height` 改 120rpx，纵向内容自适应。
- `.cell-desc`：字色 `text-2`，字号 28rpx（`desc`），允许多行换行。

## `.cell-caption`（行外说明，仅 `.group-flat` 用）

- 与 `.cell` **同级**，不在 cell 内。
- 字色 `caption`，字号 28rpx（`caption`），行高 1.5。
- 左缩进 32rpx（与 row 主文严格对齐），上下 padding `caption-pad-y`（16rpx 24rpx）。
- 用 `<view>`（非 `<text>`），允许内嵌蓝色下划线链接等富文本。
- 约定：**caption 不超过 2 行**；超 2 行改用详情页承载，避免在设置页堆长文案。

## 原生 `<switch>` 用法
```xml
<switch checked="{{on}}" color="{{successColor}}" bindchange="onToggle" />
```
- `color` 绑定开关开启色（浅色 `success` / 深色 `success-dark`）。
- 关闭态底色由系统控制（浅色 `#E9E9EB` / 深色 `#39393D`），无需自定义。

---

## 原语 3：`.picker-page`（单选 picker 页）

> 来源：微信「消息提示音」页。整页一个白底卡片、内部是一列可选项，恰好 1 项被选中，选中态用**绿色对勾**表示，未选中态右侧**完全留空**（无圆点、无灰圈、无边框）。

结构：整页一个 `.group` 容器，**无 `.group-title`**；容器内是一列 `.cell.cell-radio`。

```xml
<view class="container">
  <view class="group">
    <view class="group-card">
      <view class="cell cell-radio {{sel==='default' ? 'cell-checked' : ''}}"
            bindtap="pick" data-key="default">
        <text class="cell-label">默认</text>
        <text class="cell-check" hidden="{{sel!=='default'}}">✓</text>
      </view>
      <view class="cell cell-radio" bindtap="pick" data-key="jimu">
        <text class="cell-label">积木</text>
        <text class="cell-check" hidden="{{sel!=='jimu'}}">✓</text>
      </view>
      <view class="cell cell-radio cell-last" bindtap="pick" data-key="youya">
        <text class="cell-label">优雅</text>
        <text class="cell-check" hidden="{{sel!=='youya'}}">✓</text>
      </view>
    </view>
  </view>
</view>
```

约定：
- **整行可点**：点击命中整行（最小热区 `cell-h` 88rpx），不只文字。
- **对勾显隐**：统一用 `.cell-check` 节点 + `hidden` 控制，不用原生 `<radio>` / `<radio-group>`（结构更自由，可单 card 多组）。
- **未选中态右侧留空**：不要用圆点 / 灰圈 / 边框占位，iOS 标志性做法就是"无标记"。
- **多选场景**：同一 `.cell-radio` 结构，把 `sel` 换成数组 `sels`，`hidden` 改为 `{{!sels.includes(key)}}` 即可，颜色与对勾不变。

### 必填的 flex 布局（常见 Bug）

`.cell-check` 贴右依赖两条规则，**缺一会让对勾紧贴 label 文字**（典型表现："普通模式✓" 排成一行整体靠左，✓ 与 label 之间没有间距）：

```css
.cell {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 必填：让 .cell-check 贴右 */
  min-height: 88rpx;
  padding: 24rpx 16rpx 24rpx 32rpx;
  box-sizing: border-box;
}
.cell-label {
  flex: 1;        /* 必填：占满 label 与 check 之间的空白 */
  min-width: 0;   /* 防止 label 过长撑破 flex */
  margin-right: 24rpx;
  font-size: calc(34rpx * var(--fs, 1));
  color: var(--text);
}
.cell-check {
  flex-shrink: 0; /* 必填：对勾不能被压扁 */
  font-size: calc(34rpx * var(--fs, 1));
  color: #34C759; /* success；深色模式页等场景用品牌绿 #07C160 */
  line-height: 1;
}
```

- 同一页面内同时有"开关行 + picker-page 行"（如 `pages/darkMode`）时，**只给 radio 行的 `.cell-label` 加 `flex:1`**，开关行的 `.cell-label` 套在 `.cell-info`（自带 `flex:1`）里——所以采用更精确选择器：
  ```css
  .cell.cell-radio > .cell-label { flex: 1; min-width: 0; margin-right: 24rpx; }
  ```
  不要给全局 `.cell-label` 加 `flex:1`，否则开关行内 `.cell-label` 在 column flex 容器里会撑高，导致 label/desc 之间出现不期望的垂直空白。
- 已知踩坑（`pages/darkMode` 初版）：`.cell` 缺 `justify-content: space-between`、`.cell-label` 缺 `flex: 1`，对勾紧贴 label；修复即按本节补齐。

### `.cell-radio` 与 `.cell-check`

- `.cell-radio`：继承 `.cell` 基类（高度、`cell-pad-x`、分隔线、按下态、主文字 `text`/34rpx），无需重写。
- `.cell-check`：字色 `success`（`#34C759`，深色 `#30D158`）、字号约 `34rpx`、与 row 等高居中。
- **对勾字符**：默认用 `✓`（U+2713）；若真机渲染偏细（PingFang 下 `✓` 纤细），改用图标方案（`<icon>` 或自定义组件渲染 SF Symbols 风格 `checkmark`，字色仍走 `success`）。
- 选中态如需额外强调，可加 `.cell-checked` 背景微变（建议 `rgba(0,0,0,0.02)`，深色 `rgba(255,255,255,0.04)`），**非必须**。

> **项目实例（深色模式选择页 `pages/darkMode`）**：即「原语 1 跟随系统 toggle（原语 12 自定义 `.switch`）+ 原语 3 手动选择 picker-page」的**组合页**。当 `followSystem=false` 时，用 `wx:if` 条件渲染出下方"手动选择"分组（原语 3 单选：普通模式 / 深色模式），默认勾选普通模式；该页 `.cell-check` 用品牌绿 `#07C160`。是"跟随系统开关 + 条件渲染 picker-page"的典型写法。

> **项目实例（qingba 的多个独立 picker-page：`fontPicker` / `stagePicker` / `importPicker` / `clearPicker`）**：
> - **列表分隔线**：项目统一用兄弟节点 `<view class="cell-divider">`（`margin-left:32rpx; background:var(--divider)`）插在 cell 之间，wxml 用 `wx:if="{{i>0}}"` 在 `wx:for` 循环项之间自动插入，**不用** `.cell` 的 `border-bottom`。
> - **默认勾选**：`stagePicker` 默认勾选当前值；`importPicker` / `clearPicker` 默认 `selectedKey:''`（无勾选），进入即需用户点选。
> - **对勾绿**：四个 picker 页 `.cell-check` 用 `#34C759` / 深色 `#30D158`（`success`）；仅 `darkMode` 用品牌绿 `#07C160`。
> - **返回机制**：整页单选完成后 `wx.navigateBack`，在 `success` 回调里取 `getCurrentPages()[length-2]`（设置页）调用其回调方法（如 `startImport` / `startClear`），由设置页承接后续业务（文件选择 / 二次确认弹窗）。

---

## 原语 4：`.action-sheet`（底部确认弹层）

> 来源：微信「是否删除该条消息」确认弹层。背景 dim 遮罩 + 底部白底面板，**顶部两角圆角**、底部贴屏；可含标题文本 + 多个操作行，**危险操作用红色文字**。

### 形态与结构

整页结构：遮罩（占满屏幕，可点关闭） + 底部 action-sheet 面板（贴底，顶部圆角）。

```xml
<view class="sheet-mask" bindtap="onClose">
  <view class="action-sheet" catchtap="">
    <view class="sheet-title">是否删除该条消息？</view>
    <view class="sheet-row sheet-row-danger" bindtap="onConfirm">确定</view>
    <view class="sheet-divider"></view>
    <view class="sheet-row" bindtap="onClose">取消</view>
  </view>
</view>
```

### 节点说明

- **`.sheet-mask`**：全屏覆盖，背景 `mask`（浅色 `rgba(0,0,0,0.5)`，深色 `rgba(0,0,0,0.7)`），点击关闭弹层。
- **`.action-sheet`**：底部白底面板，仅**顶部两角**圆角 `radius-sheet`（24rpx），底部贴屏，含 `padding-bottom: env(safe-area-inset-bottom)`。
- **`.sheet-title`**（可选）：居中，`text-2` 色，`sheet-title` 字（34rpx / 行高 1.4），上 padding 32rpx、下 padding 24rpx。
- **`.sheet-row`**：操作行；高 `sheet-row-h`（88rpx），水平居中文字，字色 `text`，`sheet-row` 字号 34rpx。
- **`.sheet-row-danger`**：危险 / 销毁操作，**字色 `danger`（`#FF3B30`）**，普通操作用 `.sheet-row` 默认字色 `text`。
- **`.sheet-divider`**：行间 1rpx 横线，颜色复用 `divider-row`。
- **`catchtap=""`** 在 `.action-sheet` 阻止冒泡，避免点面板关闭。

### 约定

- **危险 / 取消布局**：截图示例是"标题 → 危险操作（红）→ 取消（黑）"在同一面板内。如果有"非危险操作 + 取消"两个一般选项，可加 `8rpx` 灰底间隔分两个面板块（iOS 风格），但**取消永远在最底部**。
- **多操作顺序**：从上到下按"操作风险从高到低"或"操作意图从正向到反向"排列；取消永远在底。
- **图标**：可选在 `.sheet-row` 前加 icon（24rpx 图标、16rpx 右间距），常见如删除（垃圾桶）、转发（箭头）等。截图示例无图标。
- **遮罩可点关闭**：默认 `bindtap="onClose"`，避免出现"只能点取消才能退出"。

### 动效（约定，待补 TODO 章节）

- 进入：遮罩淡入（0.2s）、面板从下方滑入（0.3s）。
- 退出：面板下滑消失（0.25s）、遮罩淡出（0.2s）。

### 变体：`.action-sheet-grouped`（分组选项 sheet）

> 适用于"多条非危险操作 + 取消"场景。截图示例：多选转发时弹出的"逐条转发 / 合并转发 / 取消"。

**形态**：在 `.action-sheet` 内多个 `.sheet-row` 之间用 `8rpx` 灰底间隔（`.sheet-gap`）分成"操作组"和"取消组"。

```xml
<view class="sheet-mask" bindtap="onClose">
  <view class="action-sheet" catchtap="">
    <view class="sheet-row" bindtap="onForward">逐条转发</view>
    <view class="sheet-row" bindtap="onMerge">合并转发</view>
    <view class="sheet-gap"></view>
    <view class="sheet-row" bindtap="onClose">取消</view>
  </view>
</view>
```

- `.sheet-gap`：`height: 8rpx; background: bg;` —— 灰底窄条，将面板视觉切成两块。
- **取消永远在最底**，与"操作组"用 `.sheet-gap` 分隔。
- 多个非危险操作行紧贴排列（无 `.sheet-divider`），用 8rpx 灰带断成上下两组即可。

---

## 原语 5：`.search-bar`（nav 下的伪搜索框）

> 来源：截图顶部的"搜索"输入框。整条可点，点击后**跳到独立搜索页**（不在当前页变 input）。

```xml
<view class="search-bar" bindtap="onSearchTap">
  <view class="search-icon">🔍</view>
  <text class="search-placeholder">搜索</text>
</view>
```

**token**：
- 背景：`search-bg` = `#F2F2F7`（浅色）/ `rgba(118,118,128,0.24)`（深色）。
- 圆角：`radius-search` ≈ `16rpx`（小圆角，非胶囊）。
- 高度：`search-h` = `64rpx`。
- 上下 margin：`16rpx`（贴 nav 下沿、留 16rpx 后接列表）。
- 左右内边距：`24rpx`（搜索栏整体在 `page-pad-x` 内）。
- 图标：28rpx、字色 `text-2`（与 placeholder 同色）。
- placeholder 字色：`text-2`、28rpx。

**约定**：
- **不可就地编辑**：搜索栏永远是"伪输入框"，点击后进独立搜索页（避免在列表页突然出现键盘抖动）。
- 不用 `<input>`，直接用 `<view>` + 文字；如需兼容 a11y，加 `role="button"` 等价属性。
- 搜索栏与列表间距：`16rpx`（让搜索栏"漂"在列表之上）。
- **多选态下不显示搜索栏**（多选时整个 nav 区域被选中计数 + 操作按钮占据，搜索栏隐藏或灰化）。

---

## 原语 6：`.cell-checkable`（列表多选 / 选择态）

> 来源：截图左侧的消息选择圆圈 + 顶部"已选择 1 条消息"导航标题。

**选择圈视觉**（行最左侧 36rpx 圆）：

- 未选中：空心圆，描边 `chevron` 色、2rpx。
- 选中：实心圆，背景 `success`（`#34C759`，深色 `#30D158`）、内白色对勾 `✓`。

**整行结构**：

```xml
<view class="cell cell-checkable" bindtap="onToggle" data-id="{{item.id}}">
  <view class="cell-check-circle {{item.selected ? 'is-checked' : ''}}">
    <text class="cell-check-mark" hidden="{{!item.selected}}">✓</text>
  </view>
  <view class="cell-content">
    <text class="cell-label">{{item.name}}</text>
    <text class="cell-desc">{{item.preview}}</text>
  </view>
</view>
```

- `.cell-checkable`：在 `.cell` 基类基础上，左侧预留 `cell-checkable-pad-l`（72rpx = 36rpx 圆 + 16rpx 间距 + 20rpx 边距），按整行可点切换选中态。
- `.cell-check-circle`：36rpx × 36rpx，`border-radius: 50%`，`.is-checked` 切到 `success` 背景 + 描边透明。
- `.cell-check-mark`：字色 `check-on`（`#FFFFFF`，固定白）、24rpx、600、居中。
- **绿色与开关、对勾同源**：选中圆 `background: success`，与原语 3 picker 对勾、原语 1 开关开启色一致。

**nav 联动**：
- 选中数量 `{{selectedCount}}` 实时显示在 nav 标题位（如"已选择 1 条消息"）。
- `selectedCount === 0` 时为普通 nav（"X 个会话"/"消息列表"等）。
- nav 右侧常驻一个"操作"按钮（如"转发"），`selectedCount === 0` 时禁用（灰）+ 不可点；`>= 1` 时启用，点击触发底部 `.action-sheet-grouped`（"逐条转发 / 合并转发"）。

**约定**：
- 列表进入多选模式时，**整列圆圈 fade-in**（100ms 淡入），不要每个 row 单独动画。
- 点空白处 / 点 nav 的"取消"退出多选模式，恢复原列表，圆圈 fade-out。
- 选中圆与左侧头像/内容**不重叠**：用 `cell-checkable-pad-l`（72rpx）整体左移头像区，**不要**用绝对定位叠加。
- 多选 row 也可以叠加 chevron / 副标题等，但**不能**与开关共存（同一行同时多选 + 开关 = 视觉冲突，应拆为不同入口）。

---

## 原语 7：`.tab-bar`（底部 tab 导航）

> 来源：微信首页底部 4 项 tab：微信 / 通讯录 / 发现 / 我。选中态用 WeChat 品牌绿 `brand`，未选中用灰色 `text-2`，可叠加红点徽标。

### 结构
```xml
<view class="tab-bar">
  <view class="tab-bar-item {{current === 'chat' ? 'is-active' : ''}}"
        bindtap="onTabTap" data-key="chat">
    <view class="tab-bar-icon-wrap">
      <image class="tab-bar-icon" src="/icon-chat-active.png" />
      <view class="tab-bar-badge" hidden="{{!chatUnread}}"></view>
    </view>
    <text class="tab-bar-label">微信</text>
  </view>
  <view class="tab-bar-item" bindtap="onTabTap" data-key="contacts">
    <view class="tab-bar-icon-wrap">
      <image class="tab-bar-icon" src="/icon-contacts.png" />
    </view>
    <text class="tab-bar-label">通讯录</text>
  </view>
  <view class="tab-bar-item" bindtap="onTabTap" data-key="discover">
    <view class="tab-bar-icon-wrap">
      <image class="tab-bar-icon" src="/icon-discover.png" />
      <view class="tab-bar-badge" hidden="{{!discoverUnread}}"></view>
    </view>
    <text class="tab-bar-label">发现</text>
  </view>
  <view class="tab-bar-item" bindtap="onTabTap" data-key="me">
    <view class="tab-bar-icon-wrap">
      <image class="tab-bar-icon" src="/icon-me.png" />
    </view>
    <text class="tab-bar-label">我</text>
  </view>
</view>
```

### token
- 背景：`tabbar-bg` = `#FFFFFF`（浅）/ `#1C1C1E`（深）。
- 高度：`tabbar-h` = `110rpx`（不含底部安全区）+ `env(safe-area-inset-bottom)`。
- 顶部分割线：`1rpx solid divider-row`（与内容区分隔）。
- 图标：`tabbar-icon` = `40rpx × 40rpx`。
- 文字：`tabbar-label` = `24rpx / regular`；选中字重 `500`。
- 选中色：`brand`（`#07C160`，**不切换**）。
- 未选中色：`text-2`（`#8E8E93`，深色 `rgba(235,235,245,0.6)`）。

### 约定
- **选中色用 `brand`，不用 `success`**：tabBar 是品牌识别色，**禁止**用 `success`（iOS systemGreen）替代。
- **图标必须 SVG + 双态 class**：`.tab-bar-icon-active`（选中）/ `.tab-bar-icon`（未选中），由 CSS 控制 `fill` / `stroke`；**禁止**用 `filter` / `hue-rotate` 改色（对比度风险）。
- **红点徽标 `.tab-bar-badge`**：绝对定位在图标右上角 `-4rpx / -4rpx`，`16rpx × 16rpx` 圆，`unread` 背景（详见原语 10）。
- **数字徽标 `.tab-bar-badge-pill`**：32rpx 高 + 自适应宽，> 99 显示 "99+"。
- **不可滚动**：tabBar 始终固定吸底，不参与页面滚动。
- **底部安全区**：`.tab-bar` 加 `padding-bottom: env(safe-area-inset-bottom)`。
- **不可自定义 5 个以上 tab**：超过 4 项用"更多"入口收敛（iOS HIG 规范）。

---

## 原语 8：`.chat-row`（聊天列表行）

> 来源：微信首页聊天列表。每行代表一个会话：左头像 + 中内容（标题 / 时间 + 预览 / 静音）+ 右徽标或静音图标。

### 结构
```xml
<view class="chat-row" bindtap="onOpenChat" data-id="{{item.id}}">
  <view class="chat-avatar {{item.isGroup ? 'chat-avatar-group' : ''}}">
    <block wx:if="{{!item.isGroup}}">
      <image class="avatar-img" src="{{item.avatar}}" mode="aspectFill" />
    </block>
    <block wx:else>
      <view class="avatar-grid">
        <image class="avatar-grid-item" src="{{item.members[0]}}" />
        <image class="avatar-grid-item" src="{{item.members[1]}}" />
        <image class="avatar-grid-item" src="{{item.members[2]}}" />
        <image class="avatar-grid-item" src="{{item.members[3]}}" />
        <image class="avatar-grid-item" src="{{item.members[4]}}" />
        <image class="avatar-grid-item" src="{{item.members[5]}}" />
      </view>
    </block>
    <view class="chat-badge" hidden="{{!item.unread || item.mute}}">
      <text class="chat-badge-text">{{item.unread > 99 ? '99+' : item.unread}}</text>
    </view>
  </view>
  <view class="chat-content">
    <view class="chat-line-1">
      <text class="chat-title">{{item.name}}</text>
      <text class="chat-time">{{item.timeText}}</text>
    </view>
    <view class="chat-line-2">
      <text class="chat-preview">{{item.preview}}</text>
      <view class="chat-mute" hidden="{{!item.mute}}">
        <text class="chat-mute-icon">🔕</text>
      </view>
    </view>
  </view>
</view>
```

### token
- 高度：`chat-row-h` ≈ `120rpx`。
- padding：上下 `chat-row-pad-y`（20rpx）、左右 `chat-row-pad-x`（24rpx）（**注意**：比设置页 `.cell` 的 88rpx 高，因含两行内容）。
- 头像：`.chat-avatar` 88rpx × 88rpx（详见原语 9）。
- 头像与内容间距：`chat-avatar-gap`（24rpx）。
- 标题：`chat-title` 32rpx / 500，字色 `text`。
- 预览：`chat-preview` 28rpx / regular，字色 `text-2`，**单行省略**。
- 时间：`chat-time` 24rpx / regular，字色 `text-2`，与标题同行右对齐。
- 标题与预览间距：`chat-title-gap`（8rpx）。
- 静音图标：`24rpx`，字色 `chevron`。

### 变体

**① 单聊 / 群聊**：单图头像 vs 3×2 拼图头像。
**② 未读徽标**：右上角红点或数字药丸（详见原语 10）；静音群不显示未读徽标。
**③ 静音群**：右侧用静音图标（24rpx bell），**不显示**未读徽标。
**④ 引用多条**：preview 含 `[N条] [图片]` 等内嵌标签，字色 `text-2`，与正文同字号，**无**特殊样式。
**⑤ 撤回消息**：preview 显示固定文案"你撤回了一条消息"，可加斜体或灰底强调。
**⑥ 免打扰 / 强提醒**：可在标题行右 / 末加角标 icon，待补充截图。
**⑦ 系统消息**：特殊 title（如"微信团队"），preview 用 `text-2` 灰字。

### 约定
- **整行可点**：点击进入聊天，按下态用 `background: rgba(0,0,0,0.04)`。
- **预览单行省略**：禁止 2 行省略，避免行高抖动；超过单行的内容用 `...` 截断。`overflow:hidden; text-overflow:ellipsis; white-space:nowrap;`。
- **未读徽标定位**：右上角覆盖头像角部，**不**压在头像中心；具体见原语 10。
- **静音群不显示未读数**：静音是用户的"主动屏蔽"，即便有未读也不显示徽标（截图示例："家庭会" 静音、无徽标）。
- **时间格式**：
  - 当天：`HH:mm`（如 `10:51`、`08:27`）。
  - 昨天 / 本周内：`星期X`（如 `星期三`）。
  - 更早：`MM/DD`。
  - 建议用 `dayjs.fromNow()` 或自写工具函数。
- **行间分割线**：`.chat-row` 之间 `1rpx solid divider-row`，缩进左 `88rpx + 24rpx = 112rpx`（头像 + 间距后）。

---

## 原语 9：`.avatar`（头像）

> 来源：微信聊天列表 + tabBar 用户头像。单聊用单图，群聊用 3×2 拼图。

### 单聊头像
```xml
<view class="avatar">
  <image class="avatar-img" src="{{src}}" mode="aspectFill" />
</view>
```

- 尺寸：`avatar-size` = `88rpx × 88rpx`。
- 圆角：`avatar-radius` = `8rpx`（**小圆角，正方形，非正圆**）。
- 占位：默认灰底白头像 icon（用 SVG 或 emoji）。

### 群聊头像（3×2 拼图）
```xml
<view class="avatar avatar-group">
  <view class="avatar-grid">
    <image class="avatar-grid-item" src="{{m0}}" />
    <image class="avatar-grid-item" src="{{m1}}" />
    <image class="avatar-grid-item" src="{{m2}}" />
    <image class="avatar-grid-item" src="{{m3}}" />
    <image class="avatar-grid-item" src="{{m4}}" />
    <image class="avatar-grid-item" src="{{m5}}" />
  </view>
</view>
```

- 网格：3 列 × 2 行，每格 `~28rpx × ~28rpx`，格间 1-2rpx 灰缝（或无缝拼接，看设计风格）。
- 整体保持 `avatar-size`（88×88）。
- 群成员数 < 6 时，未满格用灰底占位（与 `.cell-check-circle` 描边同色或略深）。

### 约定
- **正方形 + 8rpx 圆角**：这是微信风格，**禁止**用 `border-radius: 50%`。
- **裁剪**：头像 `<image>` 设 `mode="aspectFill"`，避免变形。
- **加载失败**：onError 时显示默认占位（灰底白头像 icon）。
- **不可点击放大**：列表头像不可单独点击放大（避免与 row 整体点击冲突），如需放大进详情页。

---

## 原语 10：`.badge`（未读 / 红点徽标）

> 来源：tabBar 红点 + 聊天列表未读徽标。两种形态：纯红点 / 数字药丸。

### 红点版 `.badge-dot`
```xml
<view class="badge badge-dot" hidden="{{count === 0}}"></view>
```
- 尺寸：`badge-dot-size` = `16rpx × 16rpx`，`border-radius: 50%`。
- 背景：`unread`（`#FA5151`）。
- 定位：绝对定位在父元素右上角 `-4rpx / -4rpx`，父元素需 `position: relative`。
- 用于：tabBar 图标、未读计数 = 1 但无需显示具体数字时。

### 数字药丸 `.badge-pill`
```xml
<view class="badge badge-pill" hidden="{{count === 0}}">
  <text class="badge-text">{{count > 99 ? '99+' : count}}</text>
</view>
```
- 高度：`badge-pill-h` = `32rpx`，最小宽 `32rpx`（数字 1 位时）、自适应宽（数字 > 1 位时）。
- 圆角：`16rpx`（半圆）。
- 背景：`unread`（`#FA5151`）。
- 文字：`badge-fs` = `22rpx / 600`，字色 `badge-on`（白）。
- `count > 99` 显示 `99+`（微信惯例）。
- 用于：tabBar 图标、聊天列表右上角。

### 变体：`.badge-pill-brand`（品牌绿 pill）

> 用于正向 / 完成态（如「读完」「已读」标签）。颜色用 `brand`（`#07C160`）而非 `success` / `danger` / `unread` —— 三者分别对应"系统选中 / 危险 / 未读"，与"品牌完成"语义不同。

```xml
<view class="badge-pill-brand">读完</view>
```

```css
.badge-pill-brand {
  display: inline-flex;
  align-items: center;
  height: 36rpx;
  padding: 0 16rpx;
  background: var(--brand);   /* #07C160，不参与主题切换 */
  color: var(--badge-on);     /* #FFFFFF */
  border-radius: 16rpx;
  font-size: calc(22rpx * var(--fs, 1));
  font-weight: 500;
  flex-shrink: 0;
}
```

约定：
- **高度 36rpx**：略大于未读徽标（32rpx），以承载 2-3 个汉字（"读完"/"完成"/"已读"）。
- **背景不参与主题切换**：`brand` 在浅色 / 深色下保持 `#07C160`；`badge-on` 始终 `#FFFFFF`。
- **不替代 `.badge-pill`**：前者是品牌完成态，后者是未读 / 计数红，不可混用。

### 约定
- **`unread` 与 `danger` 区分**：徽标用 `unread`（WeChat 红 `#FA5151`），**禁止**用 `danger`（iOS systemRed `#FF3B30`）。这是消息计数色，不是销毁警告色。
- **数字格式**：> 99 显示 "99+"；= 0 隐藏徽标（**不**显示 "0"）。
- **定位基准**：徽标绝对定位的父元素需 `position: relative`。
- **不可点击**：徽标本身无 click 事件，点击整行触发跳转。
- **背景色不参与主题切换**：`unread` 在浅色 / 深色下保持 `#FA5151`；`badge-on` 始终 `#FFFFFF`。

---

## 原语 11：`.device-banner`（设备状态条）

> 来源：微信首页搜索栏下的"Windows 微信已登录"。多端登录 / 在线状态提示条。

```xml
<view class="device-banner" bindtap="onDeviceTap">
  <view class="device-banner-icon">🖥️</view>
  <text class="device-banner-text">Windows 微信已登录</text>
  <text class="device-banner-chevron" hidden="{{!showChevron}}">›</text>
</view>
```

- 背景：`card`（白），全宽，`padding: 24rpx 32rpx`。
- 高度：≈ `80rpx`，由 padding 撑开。
- 图标：`device-banner-icon` 32rpx，字色 `text-2`。
- 文字：`device-banner-text` 28rpx / regular，字色 `text`。
- chevron（可选）：24rpx，字色 `chevron`，用于"管理设备"等跳转入口。
- 整行可点，跳设备管理页。

---

## 原语 12：`.switch`（自定义 iOS 胶囊开关）

> 来源：项目 `pages/darkMode`（深色模式"跟随系统"toggle）。微信真机大尺寸 toggle 为 iOS 风格胶囊开关（品牌绿 `#07C160` / 灰 `#e9e9e9`），项目**自绘**该控件（不依赖原生 `<switch>`），以保证开启色与微信品牌绿一致、且深浅模式下样式统一。

### 结构

```xml
<view class="switch {{on ? 'switch-on' : ''}}" bindtap="toggle">
  <view class="switch-knob"></view>
</view>
```

整控件 `bindtap` 切换（`on` 数据决定 `.switch-on`）；通常包在 `.cell.cell-toggle` 行内、与左侧 label 一起整行可点。

### WXSS（项目实测值）

```css
.switch {
  position: relative;
  flex-shrink: 0;
  width: 100rpx;        /* 略小于原生 104，更贴微信紧凑感 */
  height: 56rpx;
  border-radius: 999rpx;
  background: #e9e9e9;   /* 关闭态灰 */
  transition: background-color 0.2s ease;
}
.switch-on {
  background: #07c160;   /* 微信品牌绿 */
}
.switch-knob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.15);
  transition: left 0.2s ease;
}
.switch-on .switch-knob {
  left: 48rpx;           /* 滑到右侧 */
}
```

### 约定

- **尺寸**：100×56rpx（圆球 48×48，左 4rpx 起、开启滑到 `left:48rpx`），0.2s ease 过渡。
- **颜色**：开启 `#07C160`、关闭 `#e9e9e9`；**深浅模式样式一致**（不随 `dm-dark` / `dm-auto` 变化），圆球固定白 + 轻投影。
- **整控件可点**：与 `.cell-toggle` 整行点击配合即可切换，无需单独点圆球。
- **与原生 `<switch>` 的取舍**：内联设置行（如"小小优趣成长计划"）用原生 `<switch>` 即可；独立设置页里需要强制微信品牌绿 / 统一深浅观感时，用本原语自绘。
- **对勾字符复用原语 3 的 `.cell-check`**，但本页对勾也走 `#07C160`（非 `#34C759`）。

---

## 原语 13：`.form-page`（整页多字段表单页）

> 来源：微信「添加发票抬头」「收货地址」「实名认证」等表单页。nav 取消 / 保存 + 整页白底 section 集中承载分段控件与字段列表，**所有字段在同一张白底卡片内**（与 `.group` 全宽平铺风格一致），字段间用 1rpx 分隔线，**不要**每个字段独立卡片。

整页结构：nav-bar（取消 / 标题 / 保存）+ 内容区（`.group-card` 包所有字段）。

```xml
<view class="container">
  <!-- nav 已由页面 nav-bar 提供：左 取消 / 中 添加发票抬头 / 右 保存 -->
  <!-- 保存按钮未变更时禁用 = 字色 #C7C7CC + 不可点；变更后字色 brand -->

  <view class="group">
    <view class="group-card">
      <!-- 顶部分段切换（可选；如「抬头类型：个人 / 单位」） -->
      <view class="form-row">
        <view class="form-label">抬头类型</view>
        <view class="seg-control">
          <view class="seg-item {{type==='个人' ? 'seg-active' : ''}}"
                bindtap="setType" data-key="个人">个人</view>
          <view class="seg-item {{type==='单位' ? 'seg-active' : ''}}"
                bindtap="setType" data-key="单位">单位</view>
        </view>
      </view>
      <view class="cell-divider"></view>

      <!-- 字段行（label + input） -->
      <view class="form-row">
        <view class="form-label">名称</view>
        <input class="form-field" placeholder="单位名称（必填）"
               placeholder-class="form-placeholder-required" />
      </view>
      <view class="cell-divider"></view>

      <view class="form-row">
        <view class="form-label">税号</view>
        <input class="form-field" placeholder="纳税人识别号"
               placeholder-class="form-placeholder" />
      </view>

      <!-- 分组断点：同一卡片内字段较多时用 .form-divider-section 做视觉分段 -->
      <view class="cell-divider form-divider-section"></view>

      <view class="form-row">
        <view class="form-label">电话号码</view>
        <input class="form-field" placeholder="电话号码"
               placeholder-class="form-placeholder" />
      </view>
      <view class="cell-divider"></view>
      <view class="form-row">
        <view class="form-label">开户银行</view>
        <input class="form-field" placeholder="开户银行名称"
               placeholder-class="form-placeholder" />
      </view>
      <view class="cell-divider"></view>
      <view class="form-row">
        <view class="form-label">银行账户</view>
        <input class="form-field" placeholder="银行账户号码"
               placeholder-class="form-placeholder" />
      </view>
    </view>
  </view>
</view>
```

WXSS（最小集，复用既有原语）：

```css
.form-row {
  display: flex;
  align-items: center;
  min-height: 88rpx;             /* form-row-h */
  padding: 24rpx 32rpx;          /* form-row-pad-x */
  box-sizing: border-box;
}
.form-label {
  font-size: calc(34rpx * var(--fs, 1));
  color: var(--text);
  margin-right: 24rpx;           /* form-label-gap */
  flex-shrink: 0;
}
.form-field {
  flex: 1;
  min-width: 0;
  font-size: calc(34rpx * var(--fs, 1));
  color: var(--text);
  text-align: right;             /* 与 settings 页 .cell-value 一致 */
}
.form-placeholder {
  color: var(--text-2);
}
.form-placeholder-required {
  color: var(--brand);            /* #07C160，必填提示 */
}

/* 分组断点：复用 .cell-divider，再加 24rpx 上 margin 做视觉分段 */
.form-divider-section {
  margin-top: 24rpx;
}
```

### 约定

- **nav 取消 / 保存**：左"取消"（普通 text 按钮，34rpx / 字色 `text`），右"保存"（**未变更时禁用**：字色 `#C7C7CC` + `pointer-events: none`；变更后字色 `brand`、可点）。
- **整页一张白底卡片**：所有字段集中在单一全宽 `.group-card` 内，与 `.group` 原语一致（平铺、无圆角、段间 `group-gap`）；**禁止**每个字段独立卡片。
- **label 不 flex 占满**：`flex-shrink: 0` + 固定 `margin-right`，把 flex 剩余空间交给 input，避免长 label（如"单位地址"）与 input 互挤。
- **input 右对齐文本**：`text-align: right`，与设置页 `.cell-value` 风格统一。
- **分组断点**：同一卡片内字段 > 4 时，用 `.form-divider-section`（= `.cell-divider` + `margin-top: 24rpx`）做视觉分段；不要拆为多张 `.group-card`。
- **placeholder 样式必须用 `placeholder-class`**：小程序 `<input>` 的 placeholder **不支持**内联 `style` 改色，必须用 `placeholder-class` 指定样式类。
- **必填用 `brand`**：不要用 `danger`（避免与危险操作混淆），与 tabBar 选中、seg-control 选中同源。

---

## 原语 14：`.seg-control`（分段切换控件）

> 来源：微信「添加发票抬头」抬头类型（个人 / 单位）、支付方式（余额 / 银行卡）。两个或更多选项 N 选 1，选中态走**品牌绿**边框 + 绿字。

```xml
<view class="seg-control">
  <view class="seg-item {{key==='default' ? 'seg-active' : ''}}"
        bindtap="pick" data-key="default">默认</view>
  <view class="seg-item {{key==='custom' ? 'seg-active' : ''}}"
        bindtap="pick" data-key="custom">自定义</view>
</view>
```

WXSS：

```css
.seg-control {
  display: flex;
  align-items: center;
}
.seg-item {
  height: 56rpx;                  /* seg-item-h */
  padding: 0 32rpx;               /* seg-item-pad-x */
  margin-left: 16rpx;             /* seg-gap，除首个外 */
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid var(--text-2);
  border-radius: 8rpx;            /* radius-seg */
  background: var(--card);
  font-size: calc(34rpx * var(--fs, 1));
  color: var(--text-2);
  box-sizing: border-box;
}
.seg-item:first-child {
  margin-left: 0;                 /* 首个项不留左间距 */
}
.seg-active {
  border-color: var(--brand);     /* #07C160 */
  color: var(--brand);
}
```

### 约定

- **颜色**：选中态用 `brand`（`#07C160`），**不要**用 `success`（与开关开启 / picker 勾选混淆）；未选中态用 `text-2`。
- **不要用本控件做"开关"语义**：本控件是单选触发器，**按下立即应用**，无须配保存按钮（与开关 / picker 一致）。
- **整控件不可点**：点击命中单个 `.seg-item`（不需点 `.seg-control` 整行）；`bindtap` 挂在 `.seg-item`。
- **N 选 1 写法**：把 `key` 换成 `sel`（或数组），`data-key` 对应值判断 `{{sel==='value' ? 'seg-active' : ''}}`。
- **不与 `.cell-switch` / `<switch>` 混用**：分段切换 ≠ 开关。开关是二态 toggle（开 / 关），分段切换是多选 1。

---

## 原语 15：`.form-input`（单行表单字段）

> 来源：微信「添加发票抬头」字段行。左侧 label（自适应宽度，不 flex 占满），右侧 `<input>` 占满剩余空间并右对齐。占位文字用 `placeholder-class` 控制颜色。

详见「原语 13 `.form-page`」内的 `.form-row` / `.form-label` / `.form-field` / `.form-placeholder` / `.form-placeholder-required` 节点定义。本原语 = 一行表单字段 = `.form-row + .form-label + .form-field`。

### 变体：label 侧必填星标（更可控）

必填项也可在 label 后直接挂一个 `.form-required-marker`，避免依赖 placeholder 内含 `(必填)` 字样：

```xml
<view class="form-row">
  <view class="form-label">名称<text class="form-required-marker"> *</text></view>
  <input class="form-field" placeholder="单位名称" placeholder-class="form-placeholder" />
</view>
```

```css
.form-required-marker {
  color: var(--brand);
  margin-left: 4rpx;
  font-size: calc(34rpx * var(--fs, 1));
}
```

### 约定

- **label `flex-shrink: 0` + `margin-right: 24rpx`**：label 占自然宽，input `flex: 1` 占满；label 与 input 之间留 24rpx（form-label-gap）。
- **input `text-align: right`**：与设置页 `.cell-value` 右对齐风格统一。
- **placeholder 必须用 `placeholder-class`**：小程序 `<input>` 的 placeholder **不支持**内联 `style` 颜色，必须通过 `placeholder-class` 指定样式类。
- **必填颜色 = `brand`**（`#07C160`），**不要**用 `danger`（避免与危险操作混淆）。
- **字段内嵌进 `.group-card`**：与 `.group` 原语一致，平铺、无圆角；不要为字段单独建卡片。

---

## TODO：待逐组件补全
- [x] 导航栏 / 返回
- [x] 分组原语 `.group` / `.group-flat`
- [x] `.cell` 三变体（开关 / 值+chevron / 多行描述+chevron）
- [x] `.cell-caption` 行外说明
- [x] 原生 `<switch>`
- [x] 原语 3 `.picker-page` 单选 picker 页 / `.cell-radio` / `.cell-check`
- [x] 原语 4 `.action-sheet` 底部确认弹层 / `.sheet-mask` / `.sheet-row-danger` / `.action-sheet-grouped` 变体
- [x] 原语 5 `.search-bar` nav 下伪搜索框
- [x] 原语 6 `.cell-checkable` 列表多选行 / `.cell-check-circle` 选中圈
- [x] 原语 7 `.tab-bar` 底部 tab 导航 / `.tab-bar-badge` 红点 / `.tab-bar-icon-wrap`
- [x] 原语 8 `.chat-row` 聊天列表行 / `.chat-avatar` / `.chat-title` / `.chat-preview` / `.chat-time` / `.chat-mute`
- [x] 原语 9 `.avatar` 单图 / 3×2 拼图 / 占位
- [x] 原语 10 `.badge` 红点 / 数字药丸（`.badge-dot` / `.badge-pill`）
- [x] 原语 11 `.device-banner` 设备状态条
- [ ] 弹层动效（遮罩淡入 / 面板滑入 / 退出动画）
- [ ] 居中 modal（UIAlert 风格，非底部）
- [ ] 空状态
- [ ] 加载 / 骨架屏
- [x] 单行 / 多行文本输入 `.form-input`（见原语 15）；整页多字段表单 `.form-page`（见原语 13）；分段切换 `.seg-control`（见原语 14）
- [ ] 滚轮选择器 `.wheel-picker`（地区 省/市/区、性别、日期）—— 微信自研底部 `picker-view`，带「完成」
- [ ] 滑块 `.slider`（字体大小，拖动实时预览上方示例文字）
- [ ] 标签 chip 多选 `.tag-chip`（设置备注和标签）
- [ ] 列表选择（多语言 / 聊天背景，已覆盖 picker-page；可补更复杂多选联系人）
- [ ] 消息详情页（聊天界面 / 输入栏 / 语音 / 表情 / 图片消息）
- [ ] 强提醒 / 免打扰 / @全员 等群消息角标