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
// 存储: qingba_dark_mode = 'auto' | 'light' | 'dark'

const DARK_MODE_KEY = 'qingba_dark_mode'
const DEFAULT_DARK_MODE = 'auto'

const DARK_MODES = [
  { key: 'auto', label: '跟随系统' },
  { key: 'light', label: '浅色' },
  { key: 'dark', label: '深色' }
]

function indexOfDark(key) {
  for (let i = 0; i < DARK_MODES.length; i++) {
    if (DARK_MODES[i].key === key) return i
  }
  return -1
}

function getDarkMode() {
  let key = ''
  try {
    key = wx.getStorageSync(DARK_MODE_KEY) || ''
  } catch (e) {}
  if (indexOfDark(key) < 0) return DEFAULT_DARK_MODE
  return key
}

function setDarkMode(key) {
  if (indexOfDark(key) < 0) return false
  try {
    wx.setStorageSync(DARK_MODE_KEY, key)
  } catch (e) {}
  return true
}

function getDarkModeIndex() {
  const i = indexOfDark(getDarkMode())
  return i >= 0 ? i : 0
}

// 根节点的深色 class，如 dm-dark / dm-light / dm-auto
function getDarkClass() {
  return 'dm-' + getDarkMode()
}

// 当前模式描述文本，如 "跟随系统"
function getDarkModeText() {
  const mode = DARK_MODES[indexOfDark(getDarkMode())] || DARK_MODES[0]
  return mode.label
}

// 是否实际处于深色（auto 时结合系统偏好）
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
  DARK_MODES,
  DEFAULT_DARK_MODE,
  getDarkMode,
  setDarkMode,
  getDarkModeIndex,
  getDarkClass,
  getDarkModeText,
  isDarkMode,
  indexOfDark
}
