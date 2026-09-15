# WeUI 组件原语（components.md）

> 基于对克隆仓库 `D:\github\weui`（Tencent/weui 主干 `src/`）中 `widget/` 组件 Less 的核对，给出可直接落地的 wxml / wxss 范式，并标注本项目（qingba）已有的等价原语。权威色板 / 尺寸见 `design-tokens.md`。
> 尺寸单位：括号内为 rpx（px×2）。颜色统一引用 `design-tokens.md` 的 `--weui-*` 或项目 `--*`。

---

## 原语 1：列表分组容器 `.weui-cells`（项目 `.group-card` / `.group`）

WeUI 的列表单位，承载一组 cell。默认无圆角、无阴影，靠上间距与灰底分组。

```html
<div class="weui-cells">
  <div class="weui-cell"> … </div>
  <div class="weui-cell"> … </div>
</div>
```
```css
.weui-cells {
  margin-top: 8px;            /* 16rpx */
  background-color: var(--weui-BG-2);
  position: relative; overflow: hidden;
}
.weui-cells::before, .weui-cells::after { /* 上下 1px 通栏分隔线 */
  content: " "; position: absolute; left:0; right:0; height:1px;
  border-top: 1px solid var(--weui-FG-3); transform: scaleY(.5);
}
```

**项目原语**：`app.wxss` 的 `.group`（圆角卡片 + 标题带）/ `.group-flat`（裸白带 + 行外 caption）。做「iOS 圆角分组」用 `.group`（圆角 20rpx、无阴影）；做「微信设置裸列表」用 `.group-flat`。

---

## 原语 2：单元格 `.weui-cell`（项目 `.cell` 家族）

单行/多行列表项，左文右值，可点击、可带箭头、可内嵌开关。

```html
<div class="weui-cell">
  <div class="weui-cell__bd">标题</div>
  <div class="weui-cell__ft">右侧值</div>
</div>
```
```css
.weui-cell {
  padding: 16px;                 /* 32rpx */
  display: flex; align-items: center;
  font-size: 17px;               /* 34rpx */
  line-height: 1.41176471;
  color: var(--weui-FG-0);
  position: relative;
}
.weui-cell::before {             /* 单元格间 0.5px 分隔线，left 缩进 16px */
  content: " "; position: absolute; left:16px; right:0; top:0; height:1px;
  border-top: 1px solid var(--weui-FG-3); transform: scaleY(.5);
}
.weui-cell:first-child::before { display: none; }
.weui-cell__bd { flex: 1; min-width: 0; }
.weui-cell__ft { text-align: right; color: var(--weui-FG-1); }
.weui-cell__desc { font-size: 12px(24rpx); color: var(--weui-FG-2); line-height:1.4; padding-top:4px; }
```

变体：
- **可点击带箭头** `.weui-cell_access`：`ft` 右内边距 24px(48rpx)，用 mask 箭头（`weui-icon-arrow`，色 `FG-2`）。
- **链接蓝** `.weui-cell_link`：整行 `LINK` 色。
- **警告红** `.weui-cell_warn`：文字/图标 `RED`。
- 按下态：`.weui-cell_active:active::after` 覆盖 `rgba(0,0,0,.1)` 蒙层；项目用 `--cell-active` 底色。

**项目原语**：`.cell` 基类 + 修饰符 `.cell--single`（单行，min-height 110rpx≈55pt）/ `.cell--desc`（含描述，146rpx≈73pt）/ `.cell-radio` / `.cell-check`（iconfont 对勾，品牌绿）/ `.cell-label` / `.cell-info` / `.cell-desc` / `.cell-value` / `.cell-arrow` / `.cell-icon` / `.cell-empty` / `.cell-divider`（兄弟节点分隔线，`margin-left:32rpx`）。每个 `.cell` 必须挂 `cell--single` 或 `cell--desc` 之一。

---

## 原语 3：分组标题 / 说明（项目 `.group-title` / `.cell-caption`）

```css
.weui-cells__title { margin-top:16px(32rpx); margin-bottom:3px; padding:0 16px(32rpx);
  color: var(--weui-FG-1); font-size:14px(28rpx); line-height:1.4; }
.weui-cells__tips  { margin-top:8px(16rpx); padding:0 16px(32rpx);
  color: var(--weui-FG-1); font-size:14px(28rpx); line-height:1.4; }
.weui-cells__tips a { color: var(--weui-LINK); }
```
说明文字（caption）超过 2 行时允许换行，`color: FG-1`，不与标题同色。

---

## 原语 4：按钮 Button（项目 `.btn` 家族）

```css
.weui-btn {
  display:block; min-width:184px(368rpx); max-width:280px(560rpx);
  margin: 0 auto; padding: 12px 24px;          /* 24rpx 48rpx */
  font-size:17px(34rpx); font-weight:500; line-height:1.41176471;
  text-align:center; color:#fff; border-radius:8px(16rpx);
  -webkit-tap-highlight-color: rgba(0,0,0,0); user-select:none;
}
.weui-btn_primary  { background-color: var(--weui-BRAND); }              /* 品牌绿，白字 */
.weui-btn_default  { color: var(--weui-FG-0); background-color: var(--weui-FG-5); } /* 灰底，主文字 */
.weui-btn_warn     { background-color: var(--weui-RED-100); }            /* 危险红 */
.weui-btn_disabled { color: var(--weui-FG-4); background-color: var(--weui-FG-5); }
.weui-btn_block    { width:auto; }
.weui-btn_inline   { display:inline-block; }                            /* 并排：各 flex:1，间距16px */
.weui-btn_medium   { font-size:14px(28rpx); padding:10px 24px; }        /* 高 40px/80rpx */
.weui-btn_mini     { font-size:14px(28rpx); padding:6px 12px; border-radius:6px(12rpx); } /* 高32px/64rpx */
.weui-btn:active::before { content:""; position:absolute; inset:0; background: var(--weui-BTN-ACTIVE-MASK); border-radius:inherit; }
```
- 高度档：默认 `--weui-BTN-HEIGHT: 48`(96rpx)、medium 40(80rpx)、mini 32(64rpx)。
- **项目 `.btn` 当前高 88rpx(44pt iOS)**：与 WeUI 官方 96rpx 略有差异；如需完全对齐 WeUI 可上调至 96rpx，否则保持项目现状，新按钮沿用 `.btn-*`。

```html
<button class="weui-btn weui-btn_primary">主操作</button>
<button class="weui-btn weui-btn_default">次操作</button>
```

**项目原语**：`.btn`（高 88rpx、圆角 8rpx）、`.btn-primary`（实心 `var(--brand)`）、`.btn-secondary`（灰底 `cell-active`）、`.btn-danger`（RED）、`.btn-disabled`、`.btn-block`、`.btn-row`（内容区居中并排）、`.btn-bar`（整页底部 + `safe-area-inset-bottom`）。布局约定「主右 / 次左」。

---

## 原语 5：表单 Form（label / input / textarea）

```html
<div class="weui-cell weui-cell_input">
  <div class="weui-cell__hd"><label class="weui-label" style="width:105px">标签</label></div>
  <div class="weui-cell__bd">
    <input class="weui-input" placeholder="请输入" />
  </div>
</div>
```
```css
.weui-label { display:block; width:105px(210rpx); }
.weui-input { width:100%; border:0; background:transparent; font-size:inherit; color:inherit;
  height:1.41176471em; line-height:1.41176471; }
.weui-input::-webkit-input-placeholder { color: var(--weui-FG-2); }
.weui-textarea { display:block; width:100%; border:0; height:80px(160rpx); resize:none; }
.weui-textarea-counter { text-align:right; font-size:14px(28rpx); color: var(--weui-FG-2); }
.weui-cell_warn .weui-textarea-counter { color: var(--weui-RED); }
```
**项目原语**：`.form-card` / `.form-row` / `.form-field`（原语 13/15）。

---

## 原语 6：开关 Switch（原生 `<switch>`）

WeUI 开关用小程序原生组件，勾选态跟随 `color` 品牌绿：

```html
<switch checked="{{on}}" color="#07c160" bindchange="onChange" />
```
- 关：灰（`#e9e9e9` / `FG-3` 系）；开：品牌绿 `BRAND`。
- 尺寸约 52×32px（104×64rpx），iOS 胶囊态。
- **项目自定义**：独立设置页（如深色模式「跟随系统」）自绘 iOS 胶囊开关 `.switch`（开启 `#07c160` / 关闭 `#e9e9e9`，深浅一致）；内联设置行仍用原生 `<switch>`。

---

## 原语 7：单选 Radio / 多选 Checkbox

```html
<!-- 单选 -->
<div class="weui-cells weui-cells_radio">
  <label class="weui-cell weui-check__label">
    <div class="weui-cell__bd">选项 A</div>
    <div class="weui-cell__ft">
      <input type="radio" class="weui-check" name="r" checked />
      <i class="weui-icon-checked"></i>
    </div>
  </label>
</div>
```
```css
.weui-cells_radio .weui-check:checked + .weui-icon-checked {
  color: var(--weui-BRAND);
  -webkit-mask-image: url("data:image/svg+xml,...check...");   /* 品牌绿对勾 */
}
.weui-cells_checkbox .weui-check:checked + .weui-icon-checked {
  background-image: url("data:image/svg+xml,...实心圆+白勾, fill=%2307C160..."); /* 圆底绿勾 */
}
```
对勾/选中标记统一用 **品牌绿 `#07c160`**。

**项目原语**：`stagePicker` / `fontPicker` / `importPicker` / `clearPicker` 用 `.cell-radio` + `.cell-check`（iconfont `icon-check`，品牌绿）呈现单选勾选，分隔线用 `.cell-divider` 兄弟节点。

---

## 原语 8：弹窗类 Dialog / ActionSheet / Toast / Half-screen

统一蒙层 `var(--weui-OVERLAY)`（浅 `.5` / 深 `.8`），内容卡片 `#fff` + 圆角 12px(24rpx)。

```css
.weui-mask { position:fixed; inset:0; background: var(--weui-OVERLAY); z-index:1000; }
.weui-dialog { background: var(--weui-BG-2); border-radius:12px(24rpx); width:80%; max-width:320px;
  text-align:center; overflow:hidden; }                                  /* 源码 border-radius:12px */
.weui-dialog__hd { padding:32px(64rpx) 24px(48rpx) 16px(32rpx); }
.weui-dialog__title { font-weight:500; font-size:17px(34rpx); line-height:1.4; color:var(--weui-FG-0); }
.weui-dialog__bd { padding:0 24px(48rpx); margin-bottom:32px(64rpx);
  font-size:17px(34rpx); line-height:1.4; color:var(--weui-FG-1); }       /* 正文用次级色 FG-1 */
.weui-dialog__bd:first-child { padding:32px(64rpx) 24px(48rpx) 0; font-weight:500; color:var(--weui-FG-0); }
.weui-dialog__ft { position:relative; display:flex; }
/* ft 顶部分隔线：1px + scaleY(.5)，色用 --weui-DIALOG-LINE-COLOR */
.weui-dialog__btn { flex:1; padding:20px(40rpx) 8px(16rpx); font-size:17px(34rpx);
  line-height:1.41176471; font-weight:500; color:var(--weui-LINK); }      /* 主操作默认 LINK 蓝 */
.weui-dialog__btn_default { color: var(--weui-FG-HALF); }
.weui-dialog__btn_warn { color: var(--weui-RED); }
.weui-dialog__btn:active { background: var(--weui-BG-COLOR-ACTIVE); }

.weui-actionsheet { position:fixed; left:0; bottom:0; width:100%; background: var(--weui-BG-2);
  border-radius:12px(24rpx) 12px 0 0; z-index:1000; }
.weui-actionsheet__title { padding:16px(32rpx); color: var(--weui-FG-1); font-size:14px(28rpx); text-align:center; }
.weui-actionsheet__menu { background:#fff; }
.weui-actionsheet__cell { position:relative; padding:18px(36rpx); text-align:center; font-size:17px(34rpx);
  color: var(--weui-FG-0); }
.weui-actionsheet__cell:active { background: var(--weui-BG-COLOR-ACTIVE); }
.weui-actionsheet__action { margin-top:8px(16rpx); background:#fff; }   /* 取消行，独立灰带 */

.weui-toast { position:fixed; left:50%; top:50%; transform:translate(-50%,-50%);
  background: rgba(0,0,0,.8); color:#fff; border-radius:8px(16rpx); padding:16px(32rpx);
  min-width:120px(240rpx); text-align:center; z-index:5000; }
.weui-toast .weui-icon-success { color:#fff; }       /* toast 内图标反白 */
.weui-toast__content { margin-top:8px(16rpx); font-size:14px(28rpx); }
```
**项目原语**：`.sheet-mask` / `.action-sheet`（原语 4）；居中 modal 用 `.weui-dialog` 同款结构。

---

## 原语 9：导航栏 Navbar / 标签栏 TabBar（小程序原生）

非 WXSS 组件，颜色在 `app.json` 的 `window` / `tabBar` 配置：

```jsonc
"window": {
  "navigationBarBackgroundColor": "#ededed",   // BG-0
  "navigationBarTextStyle": "black",          // 浅色栏用 black，深色用 white
  "navigationBarTitleText": "标题"
},
"tabBar": {
  "color": "#7f7f7f",
  "selectedColor": "#07c160",                 // BRAND 品牌绿
  "backgroundColor": "#f7f7f7",               // BG-1
  "borderStyle": "black"
}
```
- 导航栏标题 17px(34rpx)，居中；返回箭头用 `weui-icon-back`（FG-0）。
- TabBar 选中态已设为品牌绿 `#07c160`（与 BRAND 一致）。

---

## 原语 10：徽标 / 标签 Badge / Tag

```css
.weui-badge { display:inline-block; padding:2px 6px; min-width:16px(32rpx);
  background: var(--weui-RED); color:#fff; font-size:12px(24rpx);
  border-radius:16px(32rpx); line-height:1.2; text-align:center; }
.weui-cell__ft .weui-badge { margin-left:8px(16rpx); }

/* 文本标签（彩色字 + 0.1 alpha 底色） */
.weui-tag { display:inline-block; padding:2px 8px; font-size:12px(24rpx);
  border-radius:4px(8rpx); }
.weui-tag_orange { color: var(--weui-TAG-TEXT-ORANGE); background: rgba(250,157,59,.1); }
.weui-tag_green  { color: var(--weui-TAG-TEXT-GREEN);  background: rgba(6,174,86,.1); }
.weui-tag_blue   { color: var(--weui-TAG-TEXT-BLUE);   background: rgba(16,174,255,.1); }
.weui-tag_red    { color: var(--weui-TAG-TEXT-RED);     background: rgba(250,81,81,.1); }
```

> 项目实现：全局 `.weui-tag`（`app.wxss`）为 `padding:4rpx 16rpx; border-radius:8rpx; line-height:1.4`，**不带 margin**——标签间距由父级 flex `gap` 控制（如 records 页 `.record-tags { gap:8rpx }`）。禁止在页面内重复定义 `.weui-tag`，新增标签直接复用。

---

## 原语 11：图标 Icons

WeUI 提供 `weui-icon-*`（mask + `background-color: currentColor` 方案，色随文字 `color`）。本项目改用自绘 **iconfont**（`app.wxss` 内联 `@font-face`，全局生效），用法：

```html
<text class="iconfont icon-homefill"></text>   <!-- 字族来自 .iconfont，字形来自 .icon-*:before { content:"\e6bb" } -->
<text class="cell-check iconfont icon-check"></text>  <!-- 单选对勾，颜色走 var(--brand) -->
```
常用：`icon-check` `\e645`（对勾）、`icon-right` `\e6a3`（箭头）、`icon-homefill` `\e6bb`、`icon-lock`/`icon-unlock`、`icon-myfill`、`icon-circlefill`。颜色由父级 `color` 决定（品牌绿对勾用 `var(--brand)`）。

---

## 原语 12：时间线列表 Timeline（项目 `.route-cell` / `.route-node`）

用于「有先后顺序 + 带状态」的列表（如学习阶段路线）。由原语 1 / 2 组合而成：外层 `.weui-cells`，每行 `.weui-cell`；时间线节点统一置于**右侧** `.weui-cell__ft`，中区只放阶段信息，状态由「节点图标 + 当前行底色」表达。

```html
<view class="weui-cells">
  <view class="weui-cell weui-cell_access route-cell {{state === 'current' ? 'current-cell' : ''}}">
    <view class="weui-cell__bd">
      <view class="weui-cell__bd_text route-name">阶段名</view>
      <!-- 次级信息只挂 route-meta（28rpx / --text2）；不挂 __desc（那是 24rpx / --text3） -->
      <view class="route-meta">phase · 目标</view>
    </view>
    <view class="weui-cell__ft">
      <view class="route-node-wrap">
        <view class="route-node {{state}}">
          <text wx:if="{{state === 'current'}}" class="iconfont icon-right"></text>
          <text wx:elif="{{state === 'locked'}}" class="iconfont icon-lock"></text>
          <text wx:else class="iconfont icon-check"></text>
        </view>
        <view class="route-node-line" wx:if="{{!isLast}}"></view>
      </view>
    </view>
  </view>
</view>
```

```css
.route-cell .weui-cell__ft { display: flex; align-items: stretch; }   /* 撑满行高，供竖线延伸 */
.route-node-wrap { flex-direction: column; align-items: center; }
.route-node { width: 44rpx; height: 44rpx; border-radius: 50%; border: 2rpx solid var(--text3); background: var(--card2); }
.route-node .iconfont { font-size: calc(34rpx * var(--fs,1)) !important; }
.current-cell { background: rgba(7,193,96,.10); }        /* 仅「当前」那一行 */

.route-node-line { flex: 1; width: 1rpx; background: var(--divider); }   /* 末行不渲染 */
```

- **节点三态（描边圆 + iconfont 图标，禁止渐变 / 外发光）**：当前 `border:0` + `background:transparent` + `.icon-right`（`var(--text3)` 正常箭头色，读作「点击进入」）；已完成 `border-color:var(--brand)` + `.icon-check`（`var(--brand)`）；未解锁沿用基类（灰描边 + 灰图标，无需单独写 `.locked`）
- **当前行高亮用 cell 级底色，禁止容器级染色**：「当前」整行加 `.current-cell` 浅绿底（深色 `rgba(7,193,96,.20)`、按下 `.28`）。**不要**把底色加到 `.weui-cells` 容器上——容器染色会把已完成 / 未解锁行一起染绿，三态失去区分度
- **`.weui-cells` 容器保持 WeUI 默认外观**：不要给容器设 `background: transparent`，也不要用 `::before/::after { display:none }` 隐藏通栏线。前者会盖掉 `.weui-cells` 的 `var(--card)` 使分组透出页面底色，后者会让该组变成无边界裸块，与同页其他分组（白底 + 上下通栏线）不一致。分组要区分就改 cell，不改容器
- 连接线用 `var(--divider)`，深色自动适配；**末行不渲染** `.route-node-line`
- **不设状态 chip**：状态由节点图标 + 当前行底色共同表达，避免与右侧辅助信息重复（原 `.route-chip` 已移除）
- 字号：主文 34rpx、副信息 28rpx、节点图标 34rpx；`.route-name` **不设 `font-weight`**，与全局 `.weui-cell__bd_text`（400）一致

---

## 原语 17：数据看板卡片 Dashboard（项目 `.home-hero` / `.home-stat`）

用于统计 / 概览类「非列表」页面（如首页）。由白底圆角卡片 + 大号数字 + 可选图表构成，**扁平纯色、无阴影 / 无渐变**（与 WeUI 卡片一致）。

```html
<!-- Hero 卡：主数据 + 7 日柱状图 -->
<view class="home-hero">
  <view class="home-hero-num">
    <text class="home-hero-val">{{weekHours}}</text>
    <text class="home-hero-unit">h</text>
    <text class="home-hero-delta">{{weekDeltaText}}</text>
  </view>
  <view class="home-hero-bars">
    <view class="home-bar" wx:for="{{weekBars}}" wx:key="day">
      <view class="home-bar-track">
        <view class="home-bar-fill {{item.isToday ? 'is-today' : ''}}" style="height:{{item.percent}}%"></view>
      </view>
      <text class="home-bar-label">{{item.label}}</text>
    </view>
  </view>
</view>

<!-- 指标卡：右上角 iconfont 箭头 + 大号数字 + 说明 -->
<view class="home-stat">
  <text class="home-stat-arrow iconfont icon-right"></text>
  <view class="home-stat-num">{{todayHours}}<text class="home-stat-unit">h</text></view>
  <view class="home-stat-label">今日时长</view>
</view>
```

```css
.home-hero {                                 /* 白底圆角卡：20rpx 圆角，无阴影 */
  margin: 16rpx 32rpx 24rpx;                 /* 左右对齐页面边距 32rpx */
  padding: 32rpx;
  border-radius: 20rpx;                      /* 10pt iOS 卡片圆角 */
  background: var(--card);
  color: var(--text);
}
.home-hero-val, .home-stat-num {
  font-size: calc(72rpx * var(--fs, 1));     /* 大号数字：不受 34/28/24 档约束 */
  font-weight: 400; line-height: 1.1; color: var(--text);
}
.home-hero-unit, .home-stat-unit,
.home-stat-label { font-size: calc(28rpx * var(--fs, 1)); color: var(--text2); }
.home-bar-fill { background: var(--card2); }              /* 非今日：主题自适应灰 */
.home-bar-fill.is-today { background: #07C160; }          /* 今日：品牌绿高亮 */
.home-stat-arrow { position: absolute; top: 24rpx; right: 24rpx;
  font-size: calc(28rpx * var(--fs, 1)); color: var(--text3); line-height: 1; }
```

- **无阴影 / 无渐变**：卡片靠 `--card`（白）与页面 `--bg`（灰）的对比分层，**不要**用 `box-shadow`；柱体 / 进度等填充一律纯色。
- **图表填充用 token**：「今日 / 高亮」用 `var(--brand)`；「非今日 / 底色」用 `var(--card2)`（浅 `#f7f8fa` / 深 `#232326`），**不要硬编码 `rgba(0,0,0,.05)`**（深色档不可见）。
- **大号数字**：统计主数据用 40 / 44 / 56 / 72rpx（`72rpx` ≈ 36pt），`font-weight: 400`；单位 / 标签用 28rpx `--text2`（对应 `design-tokens.md` §9 字号档的「数据展示除外」）。
- **箭头用 iconfont**：卡片内「指示 / 进入」箭头用 `<text class="iconfont icon-right">`（色 `--text3` FG-2），**不要用裸字符 `↗` / `›`**（跨字体渲染不一致）。
- **指标网格**：2×2 用 `display:flex; flex-wrap:wrap; gap:16rpx; padding:0 32rpx;`，卡片 `flex:1 1 calc(50% - 8rpx)` / `min-width:calc(50% - 8rpx)`；网格左右内距 32rpx 与 Hero 卡 / 页面边距一致。

---

## 原语 18：阶段统计详情（项目 `pages/stats`，顶部阶段选择器）

单个阶段的「累计」统计视图，长期常规阶段不做周/月/年切片。由扁平大数字 + 简单 flex 汇总 + 图表卡构成，**延续原语 17 的扁平纯色、无阴影/无渐变**。

> **阶段切换不要另起一级列表页**：在页面顶部左侧放「阶段选择器」——复用打卡记录页月份选择器原语（可点胶囊 + `▾` → 半屏 `picker-view` 弹层 + 取消/确定），默认选中当前阶段（未设置时取第一个有数据的阶段）。切换阶段时若目标阶段无数据（图表 canvas 被 `wx:if` 移除），需销毁 ECharts 实例、切回有数据的阶段时按需重建，避免实例指向已失效的 canvas 节点。

```html
<!-- 核心数据：无卡片，累计时长按 小时/分钟 分段、数字更大 -->
<view class="head-card">
  <view class="head-main">
    <block wx:for="{{headSegs}}" wx:key="unit">
      <text class="head-num">{{item.num}}</text>
      <text class="head-unit">{{item.unit}}</text>
    </block>
  </view>
  <view class="head-sub">{{dateRangeText}}，{{stageName}} 历时 {{stageDays}} 天</view>
</view>

<!-- 汇总三项：简单 flex 两列（前两项一行、第三项换行），右侧 icon-right -->
<view class="summary">
  <view class="summary-item" wx:for="{{summary}}" wx:key="index">
    <text class="summary-prefix">{{item.prefix}}</text>
    <text class="summary-value">{{item.value}}</text>
    <text class="summary-unit">{{item.unit}}</text>
    <text class="iconfont icon-right summary-arrow"></text>
  </view>
</view>
```

```css
.head-card { margin: 8rpx 32rpx 0; }                  /* 无卡片，仅留外边距 */
.head-num  { font-size: calc(64rpx * var(--fs, 1)); font-weight: 700; color: var(--text); }
.head-unit { font-size: calc(28rpx * var(--fs, 1)); color: var(--text2); margin: 0 8rpx; }
.head-sub  { font-size: calc(26rpx * var(--fs, 1)); color: var(--text2); }
.summary   { display: flex; flex-wrap: wrap; margin: 24rpx 32rpx 0; }
.summary-item { width: 50%; box-sizing: border-box; display: flex; align-items: baseline; padding: 0; }
.summary-value { font-size: calc(40rpx * var(--fs, 1)); font-weight: 700; color: var(--text); margin: 0 8rpx; }
.summary-arrow { margin-left: 8rpx; font-size: calc(28rpx * var(--fs, 1)); color: var(--text3); }
```

- **无卡片 hero**：核心数据不套 `.card`，直接贴页面底（与原语 17 的卡片式 Hero 区分——详情页强调信息密度，总览/列表页才用圆角卡）。
- **累计时长分段**：「X 小时 Y 分钟」用 `splitCumulative()` 拆成 `[{num, unit}]`，数字 `64rpx` 粗体远大于单位 `28rpx`，**不要**用 `h/m` 缩写（与首页 Hero 的 `h` 单位区分场景）。
- **阶段跨度**：副行用「首次打卡日 → 最后打卡日」+「阶段名称 历时 N 天」，跨度从打卡记录派生（阶段数据无 `start_date`/`end_date`）。
- **汇总 chevron**：三项简单 flex 两列（`width:50%` + `flex-wrap`），每项 `prefix + 大数字 + unit + icon-right`；箭头用 iconfont `icon-right`（`\e6a3`）紧贴 unit（`margin-left:8rpx`），**不用裸字符 `›`**；前两行各两项、第三项换行到下一行左侧。

---

## 原语 19：滚轮选择器弹层（`picker-view` 半屏，项目 `.mp-mask` / `.mp-sheet`）

用于「在多个互斥选项里选一个」的轻量场景（选择月份 / 选择阶段），比跳一级列表页更符合「就地切换、不打断」的分层原则。项目现状：`pages/records`（月份）、`pages/stats`（阶段）两处同款。

```html
<!-- 触发入口：可点胶囊 + ▾（▾ 在展开时翻转） -->
<view class="overview-picker" bindtap="onToggleMonthPicker">
  <text class="overview-month">{{monthDisplay}}</text>
  <text class="overview-arrow {{monthPickerOpen ? 'up' : ''}}">▾</text>
</view>

<!-- 弹层：必须带 fontClass + darkClass（见下「关键约定」第 1 条） -->
<view class="mp-mask {{fontClass}} {{darkClass}} {{monthPickerOpen ? 'show' : ''}}" bindtap="onClose" wx:if="{{monthPickerOpen}}">
  <view class="mp-sheet" catchtap="noop">
    <view class="mp-title mb-16">选择月份</view>
    <picker-view indicator-style="height: 80rpx;" indicator-class="mp-pv-indicator" mask-class="mp-pv-mask"
                 class="mp-pv" value="{{pickerValue}}" bindchange="onPickerChange">
      <picker-view-column>
        <view wx:for="{{yearRange}}" wx:key="*this" class="mp-item">{{item}}年</view>
      </picker-view-column>
    </picker-view>
    <view class="mp-actions">
      <button class="mp-btn mp-cancel" bindtap="onClose">取消</button>
      <button class="mp-btn mp-ok" bindtap="onConfirm">确定</button>
    </view>
  </view>
</view>
```

```css
.mp-mask  { position: fixed; left: 0; right: 0; top: 0; bottom: 0; z-index: 1000;
            display: flex; align-items: flex-end;
            background: rgba(0,0,0,0); pointer-events: none; transition: background .2s; }
.mp-mask.show { background: rgba(0,0,0,.45); pointer-events: auto; }
.mp-sheet { width: 100%; background: var(--card); border-radius: 24rpx 24rpx 0 0;
            padding: 24rpx 32rpx calc(env(safe-area-inset-bottom) + 32rpx); }
.mp-title { text-align: center; font-size: calc(30rpx * var(--fs, 1)); font-weight: 600; color: var(--text); }
.mp-pv    { width: 100%; height: 400rpx; }
.mp-item  { line-height: 80rpx; text-align: center;          /* 与 indicator-style height 严格一致 */
            font-size: calc(30rpx * var(--fs, 1)); color: var(--text); }
.mp-cancel { background: var(--cell-active); color: var(--text2); }
.mp-ok     { background: var(--brand); color: #fff; font-weight: 600; }

/* 内置蒙层是固定白色渐变、不吃 CSS 变量，深色下会在卡片上留灰白块 → 必须覆盖掉 */
.mp-pv-mask      { background-image: none !important; background-color: transparent !important; }
/* 选中框只能用透明背景 + 主题色细线：indicator 覆盖在内容层之上，实色底会整行盖住文字 */
.mp-pv-indicator { background: transparent !important;
                   border-top: 1rpx solid var(--divider); border-bottom: 1rpx solid var(--divider); }
```

- **弹层根节点必须带 `{{fontClass}} {{darkClass}}`（头号易漏点）**：`dm-*` 只挂在页面根 `.container` 上，`page` 上只有浅色基础变量。弹层若写在 `.container` 之外又不自带主题类，内部所有 `var(--*)` 都会回落到浅色值——「手动深色 + 系统浅色」时表现为白卡片、浅灰「取消」按钮、深色文字。项目另有 4 处弹层（`.sheet-mask` / `.pm-mask` / `.hs-mask`）已按此写法，新增浮层必须照办。
- **`mask-class` 与 `indicator-class` 必写**：`picker-view` 的蒙层与选中框是组件内置样式，不读 CSS 变量、也不跟随 `dm-*`。蒙层一律去掉；选中框**只能保持透明背景 + `var(--divider)` 上下细线**（项目表现为浅色 `#e5e5e5` / 深色 `rgba(255,255,255,.1)`），与微信原生 picker 观感一致。
- **切勿给 indicator 填实色底**：indicator 是覆盖在内容层之上的元素，`background: var(--card2)` 这类不透明底色会把**选中行整行文字盖住**（表现为选中项「消失」）。若确实想要选中行底色，唯一可行方向是给 `.mp-item` 提 `position: relative; z-index`，但依赖组件内部层级，需真机验证。
- **`indicator-style` 的 height 与 `.mp-item` 的 `line-height` 必须相等**（项目取 `80rpx`），否则选中项与细线错位。
- **滚动项由页面自己渲染**，故 `.mp-item` 直接吃项目 token 与 `--fs`，字号档位切换时选择器文字同步缩放。
- **交互细节**：遮罩 `bindtap` 关闭、面板 `catchtap="noop"` 防穿透；两按钮等宽（`width:45%` + `gap:20rpx`），取消在前用 `--cell-active`、确定在后用 `--brand`。

---

## 原语 20：左滑操作（swipe action，项目 `.swipe-wrap` / `.swipe-bg` / `.swipe-fg`）

列表行左滑露出操作按钮（编辑 / 删除）。项目现状：`pages/records` 打卡记录列表。

```html
<view class="swipe-wrap"
      data-idx="{{idx}}"
      bindtouchstart="onTouchStart" bindtouchmove="onTouchMove" bindtouchend="onTouchEnd">
  <view class="swipe-bg">
    <!-- 非破坏操作在左 -->
    <view class="swipe-edit" catchtap="editRecord" data-id="{{r.id}}">编辑</view>
    <!-- 破坏性操作在右，远离手指起始位置 -->
    <view class="swipe-del" catchtap="deleteRecord" data-id="{{r.id}}">删除</view>
  </view>
  <view class="swipe-fg" style="transform: translateX({{r._dx}}rpx);
       transition: {{r._anim ? 'transform 0.25s ease' : 'none'}};">…行内容…</view>
</view>
```

```css
.swipe-wrap { position: relative; overflow: hidden; }
.swipe-bg   { position: absolute; top: 0; bottom: 0; right: 0;
              width: 300rpx;                 /* = 按钮数 × 单宽，与 JS 的 SWIPE_W 必须一致 */
              display: flex; align-items: stretch; }
.swipe-edit, .swipe-del {
  flex: 1; height: 100%; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: calc(34rpx * var(--fs, 1)); font-weight: 500;
}
.swipe-edit { background: #c7c7cc; }   /* 中性灰：非破坏操作 */
.swipe-del  { background: #ff4d4f; }   /* 危险红：删除 */
.swipe-fg   { position: relative; background: var(--card); z-index: 1; }
```

```js
// 操作区总宽（rpx）= 按钮数 × 单宽，必须与 .swipe-bg 的 width 一致
const SWIPE_W = 300

_snapDx(dx) { return dx <= -SWIPE_W / 2 ? -SWIPE_W : 0 }   // 过半吸附展开，否则回弹

onTouchMove(e) {
  const idx = this.data._curSwipeIdx
  if (idx < 0) return
  let newDx = (e.touches[0].clientX - this.data._touchStartX) * 2   // px → rpx 约 2 倍
  if (newDx < -(SWIPE_W + 20)) newDx = -(SWIPE_W + 20)              // 过拖限位
  if (newDx > 10) newDx = 10
  // 节流：同一次滑动内位移变化 < 2rpx 时跳过，避免高频 setData 掉帧
  if (this._swipeIdx === idx && Math.abs(newDx - this._lastDx) < 2) return
  this._swipeIdx = idx; this._lastDx = newDx
  this.setData({ [`records[${idx}]._dx`]: newDx })
}
```

- **宽度常量双处同步（头号易错点）**：JS 的 `SWIPE_W` 与 wxss 的 `.swipe-bg { width }` 必须一致，否则吸附位置和视觉露出宽度对不上（出现半截按钮或留白）。加按钮 / 改宽度时两处一起改。
- **按钮排序**：非破坏（编辑）在左、破坏性（删除）在右——手指从左滑入时先碰到的是安全操作。
- **配色**：编辑用中性灰 `#c7c7cc`，删除用危险红 `#ff4d4f`；两者都是固定彩色，**深色模式不做适配**（彩色块在深浅底上观感一致）。
- **手势与回弹**：拖动时 `_anim = false`（跟手），松手时 `_anim = true` + 吸附到 `0` 或 `-SWIPE_W`；位移过半（`-SWIPE_W/2`）才吸附展开。
- **同时只允许一行展开**：`onTouchStart` 里把其它行的 `_dx` 归 0（需先克隆数组，直接改 `this.data` 里的对象会绕过 setData 的引用管理）。
- **操作按钮用 `catchtap`**：避免冒泡触发行本身的点击。
- **操作后复位**：跳转类操作（编辑）返回后由 `onShow` 重建列表自然复位；就地操作（删除）由数据刷新重建。
- **行间分隔线**：`overflow: hidden` 的容器内用 `.swipe-wrap:not(:last-child) .record-row::after` 画缩进线，避免用 `border-bottom` 被滑动内容带着走。

---

## 设计原则速记
1. 颜色、字号、间距一律引用 token（`--weui-*` 或项目 `--*`），禁止硬编码同质值。
2. 深色模式只切变量，不写独立样式。
3. 列表优先用「分组容器 + 单元格 + 分隔线」三件套；iOS 圆角卡片用 `.group`，原生裸列表用 `.group-flat`。
4. 主操作用品牌绿（primary / 选中 / 对勾），删除/危险用 RED，链接用 LINK。
5. 圆角：按钮 8px、弹窗 12px、胶囊开关/徽标随原生；卡片分组 20rpx。
