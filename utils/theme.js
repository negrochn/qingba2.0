// 字体大小设置工具
// 通过切换根节点 class 改变 CSS 变量 --fs，实现全站字号缩放
// 存储: qingba_font_level = 'small' | 'normal' | 'large' | 'xlarge'

const FONT_LEVEL_KEY = 'qingba_font_level'

const DEFAULT_LEVEL = 'normal'

// 档位定义：scale 为字号缩放系数（作用于 40rpx 以下的正文类字号）
const LEVELS = [
  { key: 'small', label: '小', desc: '紧凑，一屏显示更多', scale: 0.9 },
  { key: 'normal', label: '标准', desc: '默认字号', scale: 1 },
  { key: 'large', label: '大', desc: '更清晰易读', scale: 1.15 },
  { key: 'xlarge', label: '特大', desc: '最大字号', scale: 1.3 }
]

function getLevels() {
  return LEVELS
}

function indexOf(key) {
  for (let i = 0; i < LEVELS.length; i++) {
    if (LEVELS[i].key === key) return i
  }
  return -1
}

// 读取当前档位 key（脏数据/未设置时回落到标准）
function getFontLevel() {
  let key = ''
  try {
    key = wx.getStorageSync(FONT_LEVEL_KEY) || ''
  } catch (e) {}
  if (indexOf(key) < 0) return DEFAULT_LEVEL
  return key
}

// 保存当前档位 key
function setFontLevel(key) {
  if (indexOf(key) < 0) return false
  try {
    wx.setStorageSync(FONT_LEVEL_KEY, key)
  } catch (e) {}
  return true
}

// ===== 深色模式 =====
// 微信风格：跟随系统 toggle（开启 → 跟随系统，关闭 → 可手动选择浅色 / 深色）
// 存储: qingba_dark_mode = 'auto' (跟随系统) | 'light' (普通模式) | 'dark' (深色模式)
// 关闭「跟随系统」时默认进入普通模式（DEFAULT_MANUAL_MODE）

const DARK_MODE_KEY = 'qingba_dark_mode'
const DEFAULT_DARK_MODE = 'auto'
const VALID_DARK_KEYS = ['auto', 'light', 'dark']

// 关闭态默认进入普通模式
const DEFAULT_MANUAL_MODE = 'light'

const DARK_MODE_LABELS = {
  auto: '跟随系统',
  light: '已关闭',
  dark: '已开启'
}

function indexOfDark(key) {
  return VALID_DARK_KEYS.indexOf(key)
}

function getDarkMode() {
  let key = ''
  try {
    key = wx.getStorageSync(DARK_MODE_KEY) || ''
  } catch (e) {}
  return VALID_DARK_KEYS.indexOf(key) >= 0 ? key : DEFAULT_DARK_MODE
}

function setDarkMode(key) {
  if (VALID_DARK_KEYS.indexOf(key) < 0) return false
  try {
    wx.setStorageSync(DARK_MODE_KEY, key)
  } catch (e) {}
  return true
}

function getDarkModeIndex() {
  const i = indexOfDark(getDarkMode())
  return i >= 0 ? i : 0
}

// 根节点的深色 class：dm-auto | dm-light | dm-dark
function getDarkClass() {
  return 'dm-' + getDarkMode()
}

// 设置页 cell 显示文本：'auto'→'跟随系统'，'light'→'已关闭'，'dark'→'已开启'（显示状态，而非重复模式名）
function getDarkModeText() {
  return DARK_MODE_LABELS[getDarkMode()] || DARK_MODE_LABELS[DEFAULT_DARK_MODE]
}

// 是否实际处于深色：'dark' 或 ('auto' 且系统深色)
function isDarkMode(systemDark) {
  const mode = getDarkMode()
  return mode === 'dark' || (mode === 'auto' && !!systemDark)
}

function defaultIndex() {
  return indexOf(DEFAULT_LEVEL)
}

// 当前档位下标（用于 picker / slider）
function getFontLevelIndex() {
  const i = indexOf(getFontLevel())
  return i >= 0 ? i : defaultIndex()
}

// 根节点的缩放 class，如 fs-large
function getFontClass() {
  return 'fs-' + getFontLevel()
}

// 当前档位描述文本，如 "标准 · 默认字号"
function getFontLevelText() {
  const level = LEVELS[indexOf(getFontLevel())] || LEVELS[defaultIndex()]
  return level.label
}

module.exports = {
  FONT_LEVEL_KEY,
  LEVELS,
  DEFAULT_LEVEL,
  getLevels,
  getFontLevel,
  setFontLevel,
  getFontLevelIndex,
  getFontClass,
  getFontLevelText,
  indexOf,
  defaultIndex,
  DARK_MODE_KEY,
  DEFAULT_DARK_MODE,
  VALID_DARK_KEYS,
  DEFAULT_MANUAL_MODE,
  DARK_MODE_LABELS,
  getDarkMode,
  setDarkMode,
  getDarkModeIndex,
  getDarkClass,
  getDarkModeText,
  isDarkMode,
  indexOfDark
}