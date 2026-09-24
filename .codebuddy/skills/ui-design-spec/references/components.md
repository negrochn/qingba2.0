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

**项目原语**：`.cell` 基类 + 修饰符 `.cell--single`（单行，min-height 110rpx≈55pt）/ `.cell--desc`（含描述，146rpx≈73pt）/ `.cell-radio` / `.cell-check`（iconfont 对勾，品牌绿）/ `.cell-label` / `.cell-info` / `.cell-desc` / `.cell-value` / `.cell-arrow` / `.cell-icon` / `.cell-empty`。每个 `.cell` 必须挂 `cell--single` 或 `cell--desc` 之一。

**分隔线由伪元素自动提供，wxml 不插节点**：`.weui-cell::before` 画 cell 之间的缩进线（`left:32rpx`，`first-child` 不显示），`.weui-cells::before/::after` 画分组上下通栏线。两者均为 `height:1px` + `background:var(--divider)` + `transform: scaleY(0.5)` + `transform-origin: top|bottom`（**细线必须这样写**：`1rpx` 在真机会被像素网格吸附舍成 0 而整条消失，详见 SKILL.md「分隔线」条）。早期文档提到的 `.cell-divider` 兄弟节点方案**已从代码移除**，勿再引用。

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

**分组标题有成本，别滥用（项目约定）**：一个分组标题约占 **78rpx**，还额外带来一组 `.weui-cells` 的上下通栏线（视觉上等于又多一层边界）。**同类信息优先合并进同一个 `.weui-cells`**，靠行首标签区分，而不是各起一组——例如「日期 / 阶段 / 资源」三项本属同一张表单的一组属性，分三组要多付两个标题与两组通栏线（`pages/editRecord` 实测省 156rpx）；同一张卡内的相邻小节（如时长 + 快捷按钮 + 备注）用 `.weui-divider` 分节，也别再开第二张卡。整页规划时先估「分组数 × 78rpx + 行数 × 112rpx + 卡片与按钮区」，超过一屏（iPhone 8 约 1334rpx）再逐项收口。

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
- **`weui-btn_default` 的底色必须是半透明叠加（项目约定，踩过两次）**：WeUI 官方的 default 按钮底是 `--weui-FG-5`（`rgba(0,0,0,.05)` / `rgba(255,255,255,.1)`），**不是实色**。因为同一枚 default 按钮既要落在页面 `--bg` 上（如 `stage` 的「晋级下一阶段」进度按钮），又要落在 `--card` 上（弹窗里的「取消」，而 `.weui-btn::after` 的 WeUI 边框已按项目约定去掉）——**换成任何不透明实色都只适配一种底，在另一种上直接隐形**。项目令牌 `--btn-default` 即此值（见 `design-tokens.md` §9）。

```html
<button class="weui-btn weui-btn_primary">主操作</button>
<button class="weui-btn weui-btn_default">次操作</button>
```

**项目原语**：`.btn`（高 88rpx、圆角 8rpx）、`.btn-primary`（实心 `var(--brand)`）、`.btn-secondary`（灰底 `cell-active`）、`.btn-danger`（RED）、`.btn-disabled`、`.btn-block`、`.btn-row`（内容区居中并排）、`.btn-bar`（整页底部 + `safe-area-inset-bottom`）。布局约定「主右 / 次左」。

- **原生能力按钮（`open-type`）直接套 `.weui-btn`，无需额外样式**：分享 / 授权等能力按钮只需把原生 `<button>` 挂上 `.weui-btn` 系列类，例如「关于」页文章末尾的 `<button class="weui-btn weui-btn_block weui-btn_primary" open-type="share">分享给好友</button>`——`.weui-btn::after { border: none }` 已清掉原生边框，视觉与普通按钮完全一致。注意 `open-type` 在**朋友圈单页模式**下被禁用，需按场景值 `1154` 隐藏该按钮（见 `design-guidelines.md` §六）。

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
**项目原语**：页面级表单用 `.weui-cells` + `.weui-cell_input`（原语 1/2）；**弹层内**的表单用 `.form-card` / `.form-row` / `.form-field` 一族（原语 23）。

- **表单页密度（项目约定）**：`.form-row` 最小高度 **112rpx**（`min-height:112rpx` + `padding:12rpx 0`，内容区 88rpx 正好放下 `.form-field`），一张 `.form-card` 是圆角块、**底色取 `--card2`**（`padding:0 32rpx`，行间用 `.weui-divider` 分节）。**相邻小节优先合进同一张卡**（如「时长 / 快捷时长 / 备注」三段共用一张卡），别一段一张卡——省下的不只是卡片间距，还有各自的分组标题（见原语 3）。卡片底色与行按压反馈的取值理由见原语 23。
- **输入行的两种形态**：右侧要带单位 / 后缀时用 `.form-unit`（`--text3`、`margin-left:8rpx`）配 `.form-field`；**不需要左侧标签位的输入**（如备注）直接满宽 `.form-field-full`，用 placeholder 承担说明，长内容能看全——但此时 placeholder 必须自带语义（「备注，选填，如：第1-2册」），因为不再有标签。
- **按钮区上边距**：全局 `.weui-btn-area` 是 `padding-top:96rpx`（WeUI「按钮区上 48px」），那是给多张卡片堆叠留的呼吸位；卡片少的页面可在**页面级覆盖**收窄（`pages/editRecord` 收到 32rpx），页面样式加载在 `app.wxss` 之后、同特异性即覆盖。

---

## 原语 6：开关 Switch（原生 `<switch>`）

WeUI 开关用小程序原生组件，勾选态跟随 `color` 品牌绿：

```html
<switch checked="{{on}}" color="#07c160" bindchange="onChange" />
```
- 关：灰（`#e9e9e9` / `FG-3` 系）；开：品牌绿 `BRAND`。
- 尺寸约 52×32px（104×64rpx），iOS 胶囊态。
- **项目现状**：一律用原生 `<switch color="#07c160">`。早期有个自绘 iOS 胶囊开关 `.switch`（曾用于已删除的深色模式选择页），随该页一并移除，项目中已无 `.switch` 样式。

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

**项目原语**：`stagePicker` / `importPicker` / `clearPicker` 用 `.cell-radio` + `.cell-check`（iconfont `icon-check`，品牌绿）呈现单选勾选；分隔线由 `.weui-cell::before` 伪元素自动提供，wxml 无需插节点。

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

- **弹层头部只有一派（项目约定）**：半屏面板统一「**抓手 + 标题左 + 关闭右**」，**不要**混用 WeUI half-screen-dialog 的「左上角关闭 + 居中标题 + 通栏细线」——两派并存会让同一个 App 的弹层观感分裂（本版即把 `components/resource-picker` 的头部统一过来，删掉 `.rp-hd` 三件套与通栏细线）。标题取 `34rpx` / `font-weight:600`。
- **关闭按钮统一用 iconfont `icon-close`**：不要用裸字符 `×` 靠 `font-size` 硬撑（字形随字族回退，不同机型粗细不一）。热区补足 **88rpx**（设计指南「可点项最小热区 ≥ 88rpx」），并用**负 margin** 抵消热区外扩，避免标题与图标的视觉间距被撑开；按压反馈用 `background: var(--cell-active)` 而非 `opacity`。
- **底部弹层与软键盘：优先用「移除输入框」的结构性方案（项目约定，两次真机失败后定稿）**：软键盘由**原生层**渲染、**永远盖在底部弹层之上**，表现为弹层刚推出就被数字键盘压住、内容根本看不到。
  1. **推荐做法**：弹层打开期间用 `wx:if` 把页面上的 `<input>` 整体移出 DOM、换成同宽同高的纯文本（`wx:else`）。**键盘必须有「聚焦的输入框」作宿主** —— 输入框不在了，它既不可能继续挂着，也不会被弹层的入场动画重新拉起；与 `focus` 属性语义、`hideKeyboard` 在哪些机型生效、渲染先后统统无关。替代文本要与输入框**同宽 / 同档 / 同对齐**，只补 `line-height` 让它在原盒高内垂直居中，避免切换时行宽行高跳动。
  2. **为什么不用「收键盘」那一套**（`wx.hideKeyboard()` + 清受控 `focus` 变量）：真机上两次都没压住。不可控的变量太多 —— 官方文档对 `focus` 只写「获取焦点」，**没有说置 `false` 会失焦**；`wx.hideKeyboard` 的生效条件（是否要求键盘已弹出、时机是否须在用户手势内）未写明；iOS 另有「input 失焦后键盘不自动收起」的已知问题；而官方 input 文档的 Tip 明写「**在 input 聚焦期间，避免使用 css 动画**」，弹层自带的 transform 过渡正是把键盘重新拉起来的元凶。这些只能作为**辅助**保留（低版本客户端无 `wx.hideKeyboard`，加 `if (wx.hideKeyboard)` 判断）。
  3. **关弹层时记得清掉受控聚焦变量**：输入框会被重新创建，若该变量仍指向某行，它会带着 `focus=true` 出生、反而把键盘弹回来。
  先例 `pages/backfill` 的时长输入框 + 资源选择弹层。

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
>
> **同一行并列多个标签时，尺寸在父级集中收紧一次**：字号 / 内边距 / 圆角统一写在父级选择器上（如 `.record-tags .weui-tag { padding:2rpx 10rpx; border-radius:6rpx; }`），**不要**再在每个标签类（`.tag-stage` / `.tag-group-*` / `.record-backfill` / `.record-remark`）里各写一份覆盖——曾因此出现「补录 / 备注大一号、分类标签块偏大」的行内不一致（现已回归基类 `24rpx` 与统一内边距）。
>
> **彩色标签的浅 / 深两档必须写在同一个文件里（`app.wxss`「记录标签配色」一节）**：记录列表的标签（`.tag-stage` 阶段 / `.tag-group-*` 9 个分类 / `.record-remark` 备注 / `.record-backfill` 补录）**浅色档与深色档上下相邻书写**（深色档为 `.dm-dark .*` + `@media (prefers-color-scheme: dark) { .dm-auto .* }` 两套），页面 wxss（`pages/records`）只保留上面那条「父级集中收紧尺寸」。**根因**：此前浅色留在页面、深色留在全局，两边分开维护 —— `.tag-group-*` 与 `.record-remark` 都有深色档，**唯独漏了 `.tag-stage`**，深色下「常规N」仍是 `#7a5200` / `#fff7e6` 的浅金底，落在 `#191919` 卡片上亮成一块，看起来像被高亮选中。新增彩色标签时，**浅 / 深两行一起写**。
> **相邻语义的标签在深色档要刻意错开一档**：浅色档里 `.tag-stage`（`#7a5200` / `#fff7e6`）与 `.tag-group-science_extensions`（`#ad6800` / `#fffbe6`）本就近乎同色，深色档因此把阶段压到**金棕 `#e6a23c`**、科普拓展保持**浅琥珀 `#ffd666`**（均配 16% 同色透明底），两者同排出现时可分辨。

---

## 原语 11：图标 Icons

WeUI 提供 `weui-icon-*`（mask + `background-color: currentColor` 方案，色随文字 `color`）。本项目改用自绘 **iconfont**（`app.wxss` 内联 `@font-face`，全局生效），用法：

```html
<text class="iconfont icon-homefill"></text>   <!-- 字族来自 .iconfont，字形来自 .icon-*:before { content:"\e6bb" } -->
<text class="cell-check iconfont icon-check"></text>  <!-- 单选对勾，颜色走 var(--brand) -->
```
常用：`icon-check` `\e645`（对勾）、`icon-close` `\e646`（关闭）、`icon-right` `\e6a3`（箭头）、`icon-homefill` `\e6bb`、`icon-lock`/`icon-unlock`、`icon-myfill`、`icon-circlefill`。颜色由父级 `color` 决定（品牌绿对勾用 `var(--brand)`）。

**自定义组件内使用时，必须在组件自己的 wxss 里 `@import "../../styles/iconfont.wxss";`**。`@font-face` 注册在 `app.wxss`（webview 级全局生效），所以字族本身在组件内可用；但 `.iconfont` / `.icon-*::before` 是 **class 选择器**，而 app.wxss 的 class 样式不穿透进自定义组件（只有标签名选择器会穿透），漏引会表现为「图标位置是空白」而没有任何报错。已有先例：`components/radio-list/radio-list.wxss`。

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

.route-node-line { flex: 1; width: 1px; background: var(--divider);
                   transform: scaleX(0.5); transform-origin: center; }   /* 竖线用 scaleX；末行不渲染 */
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
.home-hero-unit { font-size: calc(30rpx * var(--fs, 1)); color: var(--text2); }   /* Hero 单位 15pt */
.home-stat-unit, .home-stat-label { font-size: calc(28rpx * var(--fs, 1)); color: var(--text2); }
.home-bar-fill { background: var(--card2); }              /* 非今日：主题自适应灰 */
.home-bar-fill.is-today { background: #07C160; }          /* 今日：品牌绿高亮 */
.home-stat-arrow { position: absolute; top: 44rpx; right: 24rpx;
  font-size: calc(34rpx * var(--fs, 1)); color: var(--text3); line-height: 1; }
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
.head-card { padding: 16rpx 32rpx 0; }                /* 无卡片，仅留内距 */
.head-num  { font-size: calc(64rpx * var(--fs, 1)); font-weight: 500; color: var(--text); }
.head-unit { font-size: calc(28rpx * var(--fs, 1)); color: var(--text2); margin-left: 8rpx; }
.head-sub  { display: flex; align-items: center; margin-top: 12rpx;
             font-size: calc(28rpx * var(--fs, 1)); color: var(--text2); }
.summary   { display: flex; flex-wrap: wrap; margin: 16rpx 32rpx 0; }
.summary-item { width: 50%; box-sizing: border-box; display: flex; align-items: baseline; padding: 0; }
.summary-prefix, .summary-unit { font-size: calc(28rpx * var(--fs, 1)); color: var(--text2); }
.summary-value { font-size: calc(40rpx * var(--fs, 1)); font-weight: 500; color: var(--text); margin: 0 8rpx; }
.summary-arrow { margin-left: 8rpx; font-size: calc(28rpx * var(--fs, 1)); color: var(--text3); }
```

- **无卡片 hero**：核心数据不套 `.card`，直接贴页面底（与原语 17 的卡片式 Hero 区分——详情页强调信息密度，总览/列表页才用圆角卡）。
- **累计时长分段**：「X 小时 Y 分钟」用 `splitCumulative()` 拆成 `[{num, unit}]`，数字 `64rpx` 中等字重（`font-weight:500`）远大于单位 `28rpx`，**不要**用 `h/m` 缩写（与首页 Hero 的 `h` 单位区分场景）。
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
/* 选中框只能用透明背景 + 主题色细线：indicator 覆盖在内容层之上，实色底会整行盖住文字。
   它是 80rpx 高的框，加 transform 会把选中区压扁，故上下线直接给 1px（不走 scaleY 方案） */
.mp-pv-indicator { background: transparent !important;
                   border-top: 1px solid var(--divider); border-bottom: 1px solid var(--divider); }
```

- **弹层根节点必须带 `{{fontClass}} {{darkClass}}`（头号易漏点）**：`dm-auto` 只挂在页面根 `.container` 上，`page` 上只有浅色基础变量。弹层若写在 `.container` 之外又不自带主题类，内部所有 `var(--*)` 都会回落到浅色值——**系统深色时表现为白卡片、浅灰「取消」按钮、深色文字**（手动档已移除，这是现存唯一的触发路径）。项目现存两类浮层都已按此写法：`pages/records` / `pages/stats` 的滚轮弹层 `.mp-mask`，以及六个半屏弹层共用的 `components/half-sheet` 之 `.hsc-mask`（早期各页私有的 `.sheet-mask` / `.pm-mask` / `.hs-mask` 已随组件化清理，勿再引用）。新增浮层必须照办。
- **`mask-class` 与 `indicator-class` 必写**：`picker-view` 的蒙层与选中框是组件内置样式，不读 CSS 变量、也不跟随 `dm-*`。蒙层一律去掉；选中框**只能保持透明背景 + `var(--divider)` 上下细线**（项目表现为浅色 `#e5e5e5` / 深色 `rgba(255,255,255,.1)`），与微信原生 picker 观感一致。
- **切勿给 indicator 填实色底**：indicator 是覆盖在内容层之上的元素，`background: var(--card2)` 这类不透明底色会把**选中行整行文字盖住**（表现为选中项「消失」）。若确实想要选中行底色，唯一可行方向是给 `.mp-item` 提 `position: relative; z-index`，但依赖组件内部层级，需真机验证。
- **`indicator-style` 的 height 与 `.mp-item` 的 `line-height` 必须相等**（项目取 `80rpx`），否则选中项与细线错位。
- **滚动项由页面自己渲染**，故 `.mp-item` 直接吃项目 token 与 `--fs`，字号档位切换时选择器文字同步缩放。
- **交互细节**：遮罩 `bindtap` 关闭、面板 `catchtap="noop"` 防穿透；两按钮等宽（`width:45%` + `gap:20rpx`），取消在前用 `--cell-active`、确定在后用 `--brand`。

### 原生 `<picker>` 还是自绘 `picker-view`（选型）

两者**互斥**：原生零维护但弹层完全不受样式控制，自绘能跟随项目变量但要自己养一整套。项目按「**是否需要跟随**」分派：

| | 原生 `<picker>` | 自绘 `picker-view` + 半屏弹层（本原语） |
|---|---|---|
| 弹层跟 `--fs` 字号档 | ❌ | ✅ |
| 弹层跟 `dm-auto` 深色 | ❌（跟随系统深色） | ✅ |
| 弹层样式 / 标题 / 按钮 | ❌ 全不可控 | ✅ |
| 维护成本 / 系统级适配 | ✅ 零维护 | ⚠️ 蒙层 / 滚轮 / 动画 / 深色 / 无障碍都要自己补 |

- 原生 `<picker>` **没有任何样式属性**（无 `style` / `class` / 字号），弹层由原生层渲染、WXSS 渗透不进去；唯一接近的 `header-text`（选择器标题）**仅安卓有效**。官方给的出路就是「要完全自定义请用 `picker-view`，并自行实现弹层容器」。
- 原生可用的 `mode`：`selector`（单列）/ `multiSelector`（多列联动）/ `date` / `time` / `region`。
- **`multiSelector` 两列联动的关键坑**：左列滚动时必须在 `bindcolumnchange` 里**同时把右列下标重置为 0**，否则右列会停在上一分组的旧下标上而错位。
- **`multiSelector` 的 `value` 是受控的（第二个坑，更隐蔽）**：`bindcolumnchange` 里改 `range` 时，除了把右列下标重置为 0，还必须**把左列下标一并写回**（整体 `setData({ multiValue: [value, 0] })`）。只写 `multiValue[1]` 的话，picker 收到新 `range` 后会按传入的旧 `value` 把左列复位回原分组——表现为「滚到第 2 个分组又被弹回第一个」，也就是用户口中的「分组切不动」。`bindchange`（点确定）里同样建议写回 `multiValue: [gi, ri]`，否则再次打开弹层会跳回旧位置。先例 `pages/editRecord` 的资源行。
- 原生只能渲染**纯文本**：需要尾标 / 图标时只能拼进文案（如 `书名（自定义）`），不能挂类；值的「占位灰字」也只能靠给 `__ft_value` 加 `placeholder` 类实现。
- **同一个 App 里两种观感并存是平台限制，不是缺陷**：项目现状是日期 / 阶段行用原生（一次只选一屏，原生更省心），月份 / 阶段选择器用自绘（需跟随变量）。要全站统一，只能把日期行也换成自绘（见 `pages/records` 的 `.mp-*` 原语）。

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

## 原语 21：文章页排版（项目 `pages/about`，WeUI `.weui-article`）

用于说明 / 关于 / 协议这类「文章型」页面：整页一篇文章，靠**字号差与留白**建立层级（**不是**字重，更不是竖条 / 细线 / 卡片这类边界元素），**无卡片框、无彩色块、无底色**。数值逐条照 WeUI 官方 `weui-article.less`。项目现状：`pages/about`（常规路线介绍）与 `pages/about-bigloop`（大循环路线介绍）两页——后者 `@import` 前者 wxss、只补页面特有样式，token 体系单点维护。

```html
<view class="container {{fontClass}} {{darkClass}}">
  <view class="weui-article">
    <view class="weui-article__h1">3-4岁 · 常规路径</view>        <!-- 文章主标题（首屏锚点） -->
    <view class="weui-article__note">说明：本小程序仅作…</view>    <!-- 注脚 / 免责 -->

    <view class="weui-article__h2">路线介绍</view>                 <!-- 章节 -->
    <view class="weui-article__section">
      <view class="weui-article__p">正文…<text class="weui-article__strong">行内强调</text></view>
      <view class="about-list">                                   <!-- 无序列表：真符号 + 悬挂缩进 -->
        <view class="about-li">把握住孩子的听力水平</view>
      </view>

      <view class="weui-article__h3">方式一：亲子共读</view>        <!-- 小节 -->
      <view class="weui-article__h4">注意事项</view>
      <view class="about-ol">                                     <!-- 有序列表：CSS counter 自动编号 -->
        <view class="about-oli">不能让孩子跟读…</view>
      </view>
    </view>
  </view>
</view>
```

```css
/* ① 档位 token：字号 / 行高 / 字重三件套绑在一起（借 TDesign Typography 的做法，数值仍是 WeUI 阅读档） */
.weui-article {
  --art-h1: 44rpx;   --art-h1-lh: 60rpx;  --art-h1-w: 500;   /* 22px / 30px */
  --art-h2: 40rpx;   --art-h2-lh: 56rpx;  --art-h2-w: 500;   /* 20px / 28px */
  --art-h3: 34rpx;   --art-h3-lh: 48rpx;  --art-h3-w: 500;   /* 17px / 24px */
  --art-h4: 34rpx;   --art-h4-lh: 48rpx;  --art-h4-w: 400;   /* 官方 h4 不加粗 */
  --art-body: 34rpx; --art-body-lh: 54rpx;                   /* 17px / 27px */
  --art-note: 24rpx; --art-note-lh: 40rpx;                   /* 12px / 20px */
  --art-gap-para: 48rpx; --art-gap-block: 64rpx; --art-gap-section: 96rpx;   /* 间距阶梯 */
  padding: 96rpx 48rpx;                                      /* 官方 48px 24px */
  font-size: calc(var(--art-body) * var(--fs, 1));
  color: var(--text);
  line-height: calc(var(--art-body-lh) * var(--fs, 1));      /* 行高与字号成对写死，不写倍率 */
}
.weui-article__section { margin-bottom: var(--art-gap-section); }   /* 官方 48px，嵌套 64 / 48rpx */
.weui-article__section .weui-article__section { margin-bottom: var(--art-gap-block); }
.weui-article__section .weui-article__section .weui-article__section { margin-bottom: var(--art-gap-para); }

/* ② 各元素只引 token */
.weui-article__h1 { font-size: calc(var(--art-h1) * var(--fs, 1));
  line-height: calc(var(--art-h1-lh) * var(--fs, 1)); font-weight: var(--art-h1-w);
  text-align: center; margin: 0 0 var(--art-gap-section); }   /* 官方：500 / 居中 / 下距 48px */
.weui-article__h2 { font-size: calc(var(--art-h2) * var(--fs, 1));
  line-height: calc(var(--art-h2-lh) * var(--fs, 1)); font-weight: var(--art-h2-w);
  margin: var(--art-gap-section) 0 32rpx; }                   /* 官方 20px，比正文大一档 */
.weui-article__h3 { font-size: calc(var(--art-h3) * var(--fs, 1));
  line-height: calc(var(--art-h3-lh) * var(--fs, 1)); font-weight: var(--art-h3-w);
  margin: 0 0 16rpx; }                                        /* 官方 17px/500/下距 8px */
.weui-article__h4 { font-size: calc(var(--art-h4) * var(--fs, 1));
  line-height: calc(var(--art-h4-lh) * var(--fs, 1)); font-weight: var(--art-h4-w);
  margin: 0 0 8rpx; }                                         /* 官方 17px/**400**/下距 4px */
.weui-article__p    { font-size: calc(var(--art-body) * var(--fs, 1));
  line-height: calc(var(--art-body-lh) * var(--fs, 1)); color: var(--text);
  margin-bottom: var(--art-gap-para); }                       /* 官方段距 24px */
.weui-article__note { font-size: calc(var(--art-note) * var(--fs, 1)); color: var(--text3); text-align: justify; }
.weui-article__strong { color: var(--text); font-weight: 700; }          /* 唯一强调档：同色加粗（700） */
/* 深色档提亮：@media (prefers-color-scheme: dark) { .dm-auto .weui-article__strong { color: #fff; } } */

/* ③ 列表：借 Markdown 的结构语义，视觉仍是微信文章 */
.about-list { margin: 0 0 var(--art-gap-para); }            /* 官方 ul/ol 下距 24px */
.about-li { position: relative; padding-left: 40rpx; margin-bottom: 8rpx;    /* 官方缩进 1.2em */
  font-size: calc(var(--art-body) * var(--fs, 1));
  line-height: calc(var(--art-body-lh) * var(--fs, 1)); color: var(--text); }
.about-li::before { content: '•'; position: absolute; left: 4rpx; top: 0; color: var(--text3); }
.about-ol { margin: 0 0 var(--art-gap-para); counter-reset: about-ol; }
.about-oli { position: relative; padding-left: 40rpx; margin-bottom: 8rpx;
  font-size: calc(var(--art-body) * var(--fs, 1));
  line-height: calc(var(--art-body-lh) * var(--fs, 1)); color: var(--text);
  counter-increment: about-ol; }                                        /* 序号自动生成 */
.about-oli::before { content: counter(about-ol) '.'; position: absolute; left: 0; top: 0; color: var(--text3); }
```

- **层级模型（借层级、不引组件）**：`h1` 文章标题 → `h2` 章节 → `h3`·`h4` 小节 → `p` 正文 → `note` 注脚 → `strong` 行内强调。**数值照 WeUI 官方 article 原样**（22 / 20 / 17 / 17 px → 44 / 40 / 34 / 34 rpx），只做 px → rpx 与 `calc(× var(--fs))` 两处改动；`note` 的 12pt(24rpx) 是项目自加档（官方无此档）。**文章正文占 17px 档**（官方 article 正文基准即 17px / FG-0）；`15pt` 的定位是「过渡次级字号」，不要拿它写文章正文
- **层级靠字号差，不靠字重 / 边界元素**：`h2` 官方就是 **20px**（`40rpx`，**比正文大一档**），这是章节能被一眼认出的根本 —— 把它压回正文档（曾用 34rpx）后只能靠「间距 + 字重」硬撑，深色下立刻崩。`h3`(17px/500) 与 `h4`(17px/**400**) 同字号，靠字重与间距分层；**官方 `h4` 是不加粗的**，别顺手提到 700（整页 700 会让「加粗」失去强调力）。**试过并否掉的路子**：h2 加品牌绿竖条、章节 / 阶块间加细线、阶段参考卡片化 —— 深色下 `--card`(#191919) 与 `--bg`(#111) 只差 8 个色阶、字重差又被白字光晕吃掉，靠新增边界元素补层级收益低、观感碎
- **档位 token 化（借 TDesign Typography 的「做法」，不借它的数值）**：字号 / 行高 / 字重绑成 `--art-*` 三件套（`--art-h1…h4` / `--art-body` / `--art-note` 及各自的 `-lh` / `-w`），元素只引 token 名；**行高与字号成对写死**（不再写 `line-height: 1.6` 倍率）；间距走阶梯（`--art-gap-para/block/section` = 48 / 64 / 96rpx，取自 TDesign `--td-spacer` 的档位）。改一处即整页联动，也是将来出现第二处文章页时提升为全局原语的前提。**为什么不照搬 TDesign 的数值**：它的默认正文只有 14px（`--td-font-body-medium` 28rpx）、标题一律 `font-weight: 600`、`h4` 档（`title-large` 36rpx）与正文几乎贴平、`h6` 档（28rpx）比正文还小 —— 那是「App 界面层级」而不是「长文阅读层级」；照搬会让正文变小、段距从 48rpx 收到 32rpx，并让 `strong` 退回 600 而复发 Android 字重坑。补充事实：TDesign 小程序端**没有 `typography` 组件**，是 `title` / `paragraph` / `text` 三个组件共用 `.t-typography` 类名 + `--td-*` 变量（品牌色是蓝 `#0052d9`、`mark` 黄底 `#fcdf47` 且硬编码不可覆盖），引入即与项目 `--*` + `dm-auto` 体系并行两套变量
- **`h1` 居中 + 下距 96rpx**：官方 `text-align: center` / `margin-bottom: 48px` —— 文章主标题居中是官方规定，别按项目其他页「标题左对齐」的习惯改掉
- **`__section` 分节必须给下边距**：WeUI 官方 48px(96rpx)，嵌套逐级 32px(64rpx) / 24px(48rpx)。项目把 `__h2` 写在 `__section` **之外**（官方是 h2 在 section 内），故把等量的 96rpx 上边距补在 `h2` 上 —— 相邻的两个 96rpx 会合并（margin collapsing）成 96rpx = 官方章间距；**若某环境不合并、看到 192rpx 双倍间距，把 `h2` 的 `margin-top` 改成 `0` 即回到官方值**
- **列表借结构语义，不手写符号**：无序列表用 `::before` 出 `•` + `padding-left:40rpx` 悬挂缩进（官方 `ul` 是 `margin-left: 1.2em` ≈ 20px；**不要**「段落前面挂一个 `·` 字符」）；有序列表用 **CSS `counter`** 自动编号（增删条目不必手改 `1.`~`5.`）。列表项字号与正文同为 34rpx，仅靠符号 + 悬挂缩进区分
- **官方 article 是「纯 CSS + 语义标签」，小程序侧只能照搬数值**：官方 `.weui-article` 靠后代选择器命中 `h1` / `h2` / `p` / `section`，几乎没有任何 `__h1` / `__p` 类名（只有 `__list_inside` / `__list_none` 两个列表修饰符）；小程序 wxml 只有 `view` / `text` 等组件、没有语义标签，所以 `.weui-article__*` 这套类名是项目自建 —— 官方 CSS 直接抄进 wxss 不会生效，能照搬的只有数值。官方小程序组件库里也**没有** article 组件
- **强调只保留一档：同色加粗 `700` + 深色档提亮到纯白**：行内 `__strong` 给 `--text` + `font-weight:700`，**不引入彩色语义**（如 TDesign `mark` 硬编码黄底、`theme` 的蓝色 primary），与项目「扁平纯色、禁彩色字」一致；也不为单段引入带竖线的提示块。两条硬约束：
  - **字重必须 `700`，不能用 `600`** —— Android 系统字体（Roboto）只有 400 / 500 / 700 三档，`600` 会被就近映射、真机可能落到 500/medium，表现为「加粗几乎看不出」
  - **深色档颜色要提亮到 `#fff`** —— 深色 `--text` 只有 80% 白，强调与正文同色时单靠字重区分不够（白字在暗底还有光晕扩散），故在 `.dm-auto` + `@media (prefers-color-scheme: dark)` 内把 `__strong` 提到纯白，与正文拉开明确的亮度台阶
- **样式留在 `about.wxss`、第二页 `@import` 复用**：第二处文章页（`about-bigloop`）出现后并未把 `.weui-article__*` 提升为全局——`about-bigloop.wxss` 第一行 `@import "../about/about.wxss"`，页面特有结构（如「可选支线」文字徽标）才写在自己的 wxss 里。**token 体系因此保持单点维护**（改 `--art-*` 两页同时生效）；只有当第三处及以上文章页出现、或跨页面共性结构变多时，再考虑抽全局
- **不设结尾动作区（分享）**：文章末尾**不放**页内分享按钮。早期用过 `.about-share` + `.weui-btn_block` + 一行 `24rpx` `--text3` 说明，现已移除 —— 右上角「···」菜单恒有「转发给朋友」，功能完全重复；而满宽品牌绿按钮是文章页里唯一的行动块，会把注意力从内容拉开。分享能力只依赖页面 js 的 `onShareAppMessage` + `onShareTimeline` 声明（详见 `design-guidelines.md` §六）

---

## 原语 22：双列选择弹层（左分组 / 右资源，项目 `components/resource-picker`）

用于「在两个强关联维度里各选一项」的场景（先分组、再该分组下的资源）。**不逐级下钻**：切分组点左边即可，不用返回上一级，两列一次看全。项目现状：`pages/backfill` 的选资源入口（`pages/editRecord` 走的是原生 `multiSelector`，见原语 19 的选型表）。

```html
<view class="rp-mask {{fontClass}} {{darkClass}} {{show ? 'show' : ''}}" bindtap="onCancel" catchtouchmove="noop">
  <view class="rp-sheet {{sheetSizeClass}}" catchtap="noop">
    <view class="rp-handle"></view>
    <view class="rp-head">
      <view class="rp-title">选择资源</view>
      <view class="rp-close iconfont icon-close" catchtap="onCancel"></view>
    </view>
    <view class="rp-body">
      <scroll-view class="rp-groups" scroll-y>
        <view class="rp-group {{item.key === activeGroupKey ? 'active' : ''}}"
              wx:for="{{groups}}" wx:key="key" data-key="{{item.key}}" bindtap="onSwitchGroup">
          <text class="rp-group-name">{{item.label}}</text>
          <text class="rp-check iconfont icon-check" wx:if="{{item.key === activeGroupKey}}"></text>
        </view>
      </scroll-view>
      <scroll-view class="rp-items" scroll-y>
        <view class="rp-item {{item.id === value ? 'active' : ''}}" wx:for="{{items}}" wx:key="id"
              data-id="{{item.id}}" bindtap="onPickItem">
          <text class="rp-item-name">{{item.name}}</text>
          <text class="rp-custom" wx:if="{{item.custom}}">自定义</text>
          <text class="rp-check iconfont icon-check" wx:if="{{item.id === value}}"></text>
        </view>
      </scroll-view>
    </view>
  </view>
</view>
```

```css
/* 高度按「能装下几个分组行」分三档：默认 7 行 / .h8 8 行 / .h9 9 行。
   固定占高 172rpx = 上 padding 16 + 抓手 8+8+24 + 头部 56+28 + 下 padding 32 */
.rp-sheet {
  --rp-rows: 7;
  height: calc(172rpx + 24rpx + 96rpx * var(--rp-rows) + env(safe-area-inset-bottom));
  display: flex; flex-direction: column; background: var(--card);
  border-radius: 24rpx 24rpx 0 0;
  padding: 16rpx 0 calc(env(safe-area-inset-bottom) + 32rpx);
  transform: translateY(100%); transition: transform .25s ease;   /* 隐藏态沉到视口下方 */
}
.rp-sheet.h8 { --rp-rows: 8; }
.rp-sheet.h9 { --rp-rows: 9; }
.rp-mask.show .rp-sheet { transform: translateY(0); }

.rp-body   { flex: 1; min-height: 0; display: flex; overflow: hidden; }   /* 左右同白底 */
.rp-groups { position: relative; width: 300rpx; flex-shrink: 0; height: 100%; }
/* 列间竖线：1px + scaleX(.5) + transform-origin: right（细线统一方案） */
.rp-group  { position: relative; display: flex; align-items: center; box-sizing: border-box;
             min-height: 96rpx; padding: 16rpx 24rpx;
             font-size: calc(34rpx * var(--fs, 1)); color: var(--text2); }
.rp-group-name { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rp-group.active { color: var(--brand); font-weight: 500; }
.rp-items  { flex: 1; min-width: 0; height: 100%; background: var(--card); }
.rp-item   { position: relative; display: flex; align-items: center;
             min-height: 112rpx; padding: 32rpx 24rpx;                  /* 对齐 @weuiCellHeight */
             font-size: calc(34rpx * var(--fs, 1)); color: var(--text); }
.rp-item.active { color: var(--brand); }
.rp-check  { flex-shrink: 0; font-size: calc(44rpx * var(--fs, 1)) !important;
             color: var(--brand); line-height: 1; }                      /* 与 .weui-cells_radio 的选中勾同档 */
```

- **左右两列同白底，分栏靠列间竖线**：左列曾铺 `--card2` 灰底，它与右列 `--card` 只差一档（浅色下几乎看不出、深色更弱），反而不如一根定位在列边界的 `1px + scaleX(.5)` 竖线干脆。
- **两列选中态同款：文字品牌绿 + 行尾 `icon-check`**。左列早期用「右侧竖线指示条」（还要 `z-index` 去盖列间竖线），与右列的对勾不一致；统一成勾后选中语义只由一个字形承担。
- **高度不要用「内容 auto 撑开」**：左右都是 `scroll-view`，必须有确定高度才能滚动——`height:100%` 落在 auto 高度的父级上会形成循环依赖，iOS 上可能塌成 0；且右列资源条数动态（自定义资源每阶段上限 50 条），撑开后会超出屏幕、被 `.rp-body` 的 `overflow:hidden` 裁掉，**既看不到也滚不到**。
- **每档高度 = 固定占高 + 行高 × N + 余量 + 安全区**。余量取 `24rpx`：固定占高是理论估算（大字号档头部会变高几 rpx、`env()` 取值也会取整），余量太小会在真机上冒出滚动条。用 `rpx + env()` 表达，随屏宽与安全区自动适配，**不必用 JS 量窗口再换算 px**。
- **不需要拖拽改高度**：三档自动取高已能满足（曾实现过「拖拽 + 吸附三档 + 下滑关闭」并整体移除）。若将来确实要拖拽，注意 `scroll-view` 仍要有确定高度，且拖拽期间要关掉 `transition`。
- **常驻挂载 + `show` 切 class**（不是 `wx:if` 创建销毁）：隐藏态只写 `pointer-events: none` 是不够的（只是不接收点击，面板仍会渲染在页面上挡住内容），还要 `visibility: hidden` + `transform: translateY(100%)` 移出视口，并**最终落到 `display: none`** —— 真机上原生输入框不吃前两者，会留下 placeholder 残影（根因与挂/摘时序见原语 23）。
- 其余约定同原语 8：根节点带 `{{fontClass}} {{darkClass}}`、头部统一「抓手 + 标题左 + 关闭右」、关闭按钮用 `icon-close` 且热区补足 88rpx。

---

## 原语 23：半屏弹层与弹层表单（项目 `components/half-sheet` + `app.wxss` 的 `.form-*` / `.seg-*`）

项目把「底部半屏弹层」拆成两层：**外壳复用组件、内容走全局原语**。

| 层 | 归属 | 内容 |
|---|---|---|
| 外壳 | `components/half-sheet` | 蒙层 / 面板 / 抓手 / 头部（标题左 + 关闭右）/ `footer` 槽 |
| 内容 | `app.wxss`「弹层表单」原语 | `.form-card` / `.form-row` / `.form-row-static` / `.form-label(-muted)` / `.form-right` / `.form-field` / `.form-unit` / `.form-static` / `.seg-control(-grid)` / `.seg-item` / `.seg-active` |

```html
<half-sheet show="{{show}}" title="常规1 · 记一笔"
            font-class="{{fontClass}}" dark-class="{{darkClass}}" bind:close="closeSheet">
  <view class="form-card">
    <view class="form-row">…可填行…</view>
    <view class="weui-divider"></view>
    <view class="form-row form-row-static">…只读参考行…</view>
  </view>
  <view slot="footer" class="weui-btn-area_inline">
    <button class="weui-btn weui-btn_default">取消</button>
    <button class="weui-btn weui-btn_primary">确定</button>
  </view>
</half-sheet>
```

```css
/* 外壳（组件内）：面板 = --card，头部下间距 24rpx，安全区由面板 padding 承担 */
.hsc-sheet { background: var(--card); border-radius: 24rpx 24rpx 0 0;
             padding: 16rpx 32rpx calc(env(safe-area-inset-bottom) + 32rpx); }
/* 内容（app.wxss）：卡片比外壳低一档，行自身不设底色 */
.form-card { background: var(--card2); border-radius: 16rpx; padding: 0 32rpx; }
.form-row  { min-height: 112rpx; padding: 12rpx 0; }
.seg-item  { height: 56rpx; border: 2rpx solid var(--divider); background: var(--card); }
```

- **卡片底色必须与外壳拉开一档**：`.form-card` 取 `--card2`（`#f7f7f7` / `#202020`），**不是**与面板同色的 `--card`。同色时卡片的**边界、16rpx 圆角、`padding: 0 32rpx` 的内缩全都不可见**——内缩只会被读成「没和弹层标题对齐」，圆角是纯死样式；低一档后三者同时成立，弹层里才有「块」的层次。
- **按压反馈色按「元素自身有没有底色」来选（易错）**：
  - `.form-row` **不设底色**（透出卡片的 `--card2`）→ 按压色用 **`--divider`**（浅 `#e5e5e5` / 深 `rgba(255,255,255,.1)`）。沿用 `--cell-active`（`#ececec`）叠在 `#f7f7f7` 上只差 **11** 个色阶，按住几乎无反应；`--divider` 浅色差 18、深色 ≈ 22，与它原先落在 `--card` 上的手感相当。
  - `.seg-item` **自带 `--card` 白底** → 按压前后是「白 → `--cell-active`」，差 19 个色阶，**与容器底无关，照用不改**。
  - 判据一句话：**透明底的元素，按压色跟容器的底配；自带底色的元素，按压色跟它自己的底配**。与 `--btn-default` 必须保持半透明同源（见 `design-tokens.md` §9）——跨越不同底的交互色，按最弱的那个底来选。
- **深色档 `--card2 > --card`（`#202020` > `#191919`），与浅色档方向相反**。连带结果是 `.seg-item`（`--card` 底）在灰卡上**浅色呈凸起、深色呈凹陷**——方向不一致，但两边都看得出边界，暂不特殊处理；`.seg-active` 的选中态（`--card` 底 + 品牌绿边与字）反而因此比同色时更清楚。
- 组件细节：`styleIsolation: 'apply-shared'`（使用方要能通过 `sheetClass` 定制面板，如 `resource-picker` 的三档高度 `.h8` / `.h9` 与「左右内边距归零」）；蒙层根节点自带 `{{fontClass}} {{darkClass}}`（组件内用 iconfont 需自己 `@import`，见原语 11）。
- **隐藏态必须落到 `display: none`（真机坑）**：外壳是「常驻挂载 + `show` 切 class」，隐藏态只写 `pointer-events: none` 面板仍会渲染在页面上，所以还要 `visibility: hidden` + 面板 `translateY(100%)`。但这两条**挡不住原生输入框**——真机上 `input` 由原生层绘制，**既不吃父级的 `visibility`，也不吃 `transform`**，弹层关闭后普通视图全部隐藏、唯独 placeholder 还停在未变换的布局位置（屏幕底部），表现为页面下方凭空多出几行「请输入」。
  - 解法：补第三态 `display: none`（`.hsc-hidden`），把整块从渲染树移出、原生层随之销毁；
  - **挂 / 摘该态要控时序**（在 js 的 `show` observer 里），否则会把过渡动画吞掉：**打开** → 先摘掉 `display:none`、隔一帧（20ms）再挂显示态；**关闭** → 先播 250ms 滑出动画、走完（260ms）再挂上；`detached` 清定时器；
  - 因此组件内由内部状态 `shown`（滑入 + 蒙层）/ `hidden`（`display:none`）驱动 class，不再直接用 `show`；
  - 已填数据不受影响 —— `display:none` 只是不渲染，页面 data 仍在，重开弹层照常回填。
- **弹层输入框一律不设 `maxlength`（拼音坑，`childManage` 实测）**：小程序 `input` 的 `maxlength` 在拼音输入法**组合期间也把拼音字母计入长度**——昵称限「8 个汉字或 16 个字母」时，全拼 `xiaoerzi` 打满 8 个字母就被硬截，汉字根本没机会上屏（表现为「还没输完就不让打了」）。解法三件套：
  1. `maxlength="-1"` 放开，输入全程不受限；
  2. `bindblur` 截断——blur 时组合必已结束，按**显示宽度**截（项目 `children.clipName`：码点遍历，`codePointAt(0) > 0xFF` 计 1、其余计 0.5，截断后 toast 提示）；**截断与提交校验必须同一函数 / 同一口径**，别一处码点计数、一处宽度计数；
  3. 提交时校验兜底（`children._validateName` / `customResources._validateName`），防其他入口写脏数据。
  输入中不打断拼音，损失只在失焦瞬间。（注：资源名 `customResources` 是纯码点上限 20，与昵称宽度口径是两套体系，各自内部一致即可。）
- **单输入行弹层：说明收进 placeholder**：只有一行输入的弹层（添加 / 改名 / 删除确认），限制说明别单开说明行或分节（卡片里孤零零一行小字偏重），直接写进 placeholder（「最多8个汉字或16个字母」「输入「xx」确认」），校验 toast 做兜底。
- 现存 9 个弹层实例：`pages/stage`（打卡 / 晋级测试）、`pages/targetSetting`、`pages/myResources`、`pages/home`（今日明细）、`components/resource-picker`、`pages/childManage`（添加/改名、删除确认）、`components/child-picker`（切换孩子）。

---

## 原语 24：毕业 / 里程碑庆祝卡（项目 `pages/home` 的 `.home-grad`）

路线走完主链终点这类**里程碑时刻**，用一张纯庆祝卡替代常规统计区。排版是 **WeUI msg 范式**（全居中：徽章 → 标题 → 副题 → 数字区 → tips）与**数据看板大数字**（原语 17）的组合；庆祝元素全为纯色，深浅两套主题零额外规则。

```html
<view class="home-grad">
  <view class="home-grad__badge-wrap">          <!-- 徽章 + confetti 的定位父级 -->
    <view class="home-grad__dot home-grad__dot--1"></view>
    <!-- …共 8 颗散点，绝对定位散布在徽章左右与上方… -->
    <view class="home-grad__badge">
      <text class="iconfont icon-check home-grad__check"></text>
    </view>
  </view>
  <view class="home-grad__title">大循环路线圆满收官</view>
  <view class="home-grad__subtitle">从慢半拍的孩子，变成并肩的同伴</view>
  <view class="home-grad__stats">               <!-- 三联数字：全程口径 -->
    <view class="home-grad__stat"><view class="home-grad__num">928</view><view class="home-grad__unit">天陪伴</view></view>
    <!-- …小时累计 / 天打卡… -->
  </view>
  <view class="home-grad__tips">剩下的路，交给他自己</view>
</view>
```

```css
.home-grad { margin: 16rpx 32rpx 24rpx; padding: 80rpx 32rpx 64rpx;
             border-radius: 20rpx; background: var(--card); text-align: center; }
.home-grad__badge  { width: 136rpx; height: 136rpx; border-radius: 50%;
                     background: var(--brand); display: flex; align-items: center; justify-content: center; }
.home-grad__check  { color: #fff; font-size: calc(72rpx * var(--fs, 1)); }  /* 覆盖 icon-check 默认 var(--brand)：绿底上要白勾 */
.home-grad__dot--1 { width: 18rpx; height: 18rpx; background: #ffc300; position: absolute; left: -52rpx; top: 4rpx; border-radius: 50%; }
.home-grad__title    { margin-top: 44rpx; font-size: calc(44rpx * var(--fs, 1)); font-weight: 500; line-height: 1.4; color: var(--text); }  /* weui-msg__title 22px */
.home-grad__subtitle { margin-top: 16rpx; font-size: calc(28rpx * var(--fs, 1)); line-height: 1.6; color: var(--text2); }
.home-grad__num      { font-size: calc(64rpx * var(--fs, 1)); font-weight: 400; line-height: 1.2; color: var(--text); }     /* 看板大数字档 */
.home-grad__unit     { margin-top: 4rpx; font-size: calc(24rpx * var(--fs, 1)); color: var(--text2); }
```

- **confetti 散点用固定高饱和纯色（WeUI 官方橙/黄/蓝 `#fa9d3b` / `#ffc300` / `#10aeff`），不随主题**：庆祝色是情绪表达，浅深两底下都成立 → **深色模式零额外规则**（写主题变量反而要在深色档重新挑三个「暗底可读」色，收益为负）；尺寸 10–18rpx 错落、绝对定位在徽章周围（`left/right` 取负值溢出 badge-wrap），纯色圆点满足项目「禁渐变 / 外发光」约定——庆祝感靠**多颗错落 + 三色节奏**，不靠发光
- **徽章内对勾要手动覆盖 `icon-check` 的默认色**：字形类默认走 `var(--brand)`（绿勾），绿底徽章上必须显式 `color:#fff`——「品牌绿圆 + 白勾」是庆祝卡的唯一强调点
- **数字必须切「全程口径」，不能用毕业时的当前阶段**：毕业那一刻「阶段累计」失去意义（进度 100% 挂着没有信息量），情绪价值来自全程数字（928 天陪伴比 80 小时有冲击力得多）——去掉阶段过滤遍历全部记录得「天陪伴 / 小时累计 / 天打卡」三联
- **纯庆祝、无操作入口**：不放「查看统计 / 回顾路线」按钮——操作留在原处（打卡入口照常），卡片只承担情绪价值；标题文案按业务对象区分（如按路线：常规「圆满完成」/ 大循环「圆满收官」）
- **顶部同屏联动收口**：页头右侧的「阶段名 + 百分比」在庆祝态整块隐藏（`wx:if` 反相），避免「已完成的阶段还挂着百分比」的语义冲突；问候语同步切庆祝文案（如 `Congratulations, Day N`，N 换全程口径）

---

## 设计原则速记
1. 颜色、字号、间距一律引用 token（`--weui-*` 或项目 `--*`），禁止硬编码同质值。
2. 深色模式只切变量，不写独立样式。
3. 列表优先用「分组容器 + 单元格 + 分隔线」三件套；iOS 圆角卡片用 `.group`，原生裸列表用 `.group-flat`。
4. 主操作用品牌绿（primary / 选中 / 对勾），删除/危险用 RED，链接用 LINK。
5. 圆角：按钮 8px、弹窗 12px、胶囊开关/徽标随原生；卡片分组 20rpx。
