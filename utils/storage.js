// 统一 storage 封装：开发版/体验版与正式版本地数据隔离
//
// 背景：微信本地 storage 按「appid + 微信号 + 设备」隔离，不区分版本——
// 开发版、体验版、正式版读写的是同一份本地数据，开发版测试会污染正式数据。
// 方案：按 envVersion 给 key 加前缀分流——
//   release（正式版）：不加前缀，存量数据零迁移、行为不变；
//   develop / trial（测试侧）：加 'd_' 前缀，与正式数据完全隔离（空库起步，各改各的）。
// envVersion 识别异常时按正式版处理：宁可测试侧拿不到数据，
// 不可让正式数据被写进测试前缀后「消失」。

const DEV_PREFIX = 'd_'

// 会话级常量：envVersion 小程序启动后不变
const IS_DEV = (function () {
  try {
    const env = wx.getAccountInfoSync().miniProgram.envVersion
    return env === 'develop' || env === 'trial'
  } catch (e) {
    return false
  }
})()

// 逻辑 key → 真实 key
function _k(key) {
  return IS_DEV ? DEV_PREFIX + key : key
}

// ===== 逻辑 key 读写（业务代码日常用这组）=====
// get 对不存在的键返回 ''（与 wx.getStorageSync 原生行为一致）

function get(key) {
  try { return wx.getStorageSync(_k(key)) } catch (e) { return '' }
}

function set(key, value) {
  try { wx.setStorageSync(_k(key), value) } catch (e) {}
}

function remove(key) {
  try { wx.removeStorageSync(_k(key)) } catch (e) {}
}

// ===== 真实 key 读写（getStorageInfoSync().keys 遍历场景专用）=====
// 遍历拿到的是已带前缀的真实 key，再走 get/remove 会二次加前缀，必须用 raw 系列
// 逻辑 key/前缀要拿去和真实 keys 匹配时，先经 realKey() 转成真实形态

function getRaw(key) {
  try { return wx.getStorageSync(key) } catch (e) { return '' }
}

function removeRaw(key) {
  try { wx.removeStorageSync(key) } catch (e) {}
}

// 逻辑 key → 真实 key（只做映射不读写；「遍历 keys 按前缀匹配」场景专用）
function realKey(key) {
  return _k(key)
}

// 是否测试侧（开发版/体验版）
function isDev() {
  return IS_DEV
}

// 云端分流标记：测试侧传给云函数，正式传空串（云函数按缺省走正式集合）
function envTag() {
  return IS_DEV ? 'dev' : ''
}

module.exports = {
  get,
  set,
  remove,
  getRaw,
  removeRaw,
  realKey,
  isDev,
  envTag
}
