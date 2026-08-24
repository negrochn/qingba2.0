App({
  onLaunch() {
    // 全局数据
  },
  globalData: {
    // 打卡数据脏标记：stage 页打卡后置为 true，home 页 onShow 时检查并刷新
    checkinDirty: false
  }
})
