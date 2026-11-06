// 数据变更通知总线：数据层（checkin / children / customResources / decoBox 等）
// 写入口调 notify() 广播「有数据变更」，cloudBackup 订阅后驱动自动备份的防抖调度。
// 独立成模块的原因：数据层不能直接 require cloudBackup（会形成加载环：
// cloudBackup → backup → checkin → cloudBackup），经此中转双方只依赖本文件。
// 载荷只有一个可选的 source 动作标签（'add' / 'edit' / 'del' …），仅用于自动备份
// 日志展示「这次同步是谁触发的」；备份本身是全量快照模型，不关心改了什么、改了几次，
// 防抖窗口内的连续变更天然合并为一次上传。

let _listeners = []

// 广播数据已变更（同步逐个调用监听器；监听方异常自行吞掉，绝不影响写入主流程）
// @param {string} [source] 动作标签，见 cloudBackup 的 CHANGE_LABELS
function notify(source) {
  for (let i = 0; i < _listeners.length; i++) {
    try { _listeners[i](source) } catch (e) { console.error('[dataChanged] listener error', e) }
  }
}

// 订阅；返回取消订阅函数（当前无取消场景，留作对称 API）
function subscribe(fn) {
  if (typeof fn === 'function') _listeners.push(fn)
  return function () {
    _listeners = _listeners.filter((f) => f !== fn)
  }
}

module.exports = { notify, subscribe }
