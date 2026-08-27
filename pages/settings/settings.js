// 设置页
const checkin = require('../../utils/checkin.js');
const { routeData } = require('../../utils/data.js');

// 构建阶段选项
const stageOptions = routeData.stages.map(s => ({
  id: s.stage_id,
  name: s.stage_name
}));

Page({
  data: {
    totalCount: 0,
    stageOptions,
    currentStageIndex: -1,
    currentStage: null,
    currentStageDisplay: ''
  },

  onLoad() {
    this.loadStats();
    this.loadCurrentStage();
  },

  onShow() {
    this.loadStats();
    this.loadCurrentStage();
  },

  // 加载当前阶段
  loadCurrentStage() {
    const saved = checkin.getCurrentStage();
    if (saved) {
      const index = stageOptions.findIndex(s => s.id === saved.id);
      this.setData({
        currentStageIndex: index >= 0 ? index : -1,
        currentStage: saved,
        currentStageDisplay: saved.name
      });
    } else {
      this.setData({
        currentStageIndex: -1,
        currentStage: null,
        currentStageDisplay: ''
      });
    }
  },

  // 切换阶段
  onStageChange(e) {
    const index = parseInt(e.detail.value);
    if (index < 0 || index >= stageOptions.length) return;

    // 获取完整阶段数据
    const stage = routeData.stages[index];
    const stageData = {
      id: stage.stage_id,
      name: stage.stage_name,
      targetPhase: stage.target_phase,
      vocabularyTarget: stage.vocabulary_target,
      timeInvestment: stage.time_investment
    };

    // 保存
    checkin.setCurrentStage(stageData);

    this.setData({
      currentStageIndex: index,
      currentStage: stageData,
      currentStageDisplay: stageData.name
    });

    wx.showToast({
      title: `已设置：${stageData.name}`,
      icon: 'success'
    });
  },

  // 加载统计数据（目前只需要 totalCount，用于清空数据提示）
  loadStats() {
    try {
      const count = checkin.totalCountAll();
      this.setData({ totalCount: count });
    } catch (e) {
      console.error('加载统计失败', e);
    }
  },

  // ===== 备份（导出JSON文件） =====
  onBackup() {
    try {
      // 收集所有数据
      const data = {};

      // 打卡记录（扁平化处理，方便导入）
      const all = checkin.getAll();
      const records = [];
      for (const day in all) {
        for (const c of all[day]) {
          records.push(c);
        }
      }
      data.checkin_records = records;

      // 默认备注
      const remarks = wx.getStorageSync(checkin.DEFAULT_REMARK_KEY);
      if (remarks) {
        data.checkin_default_remark = remarks;
      }

      // 已读次数
      const readCounts = wx.getStorageSync(checkin.READ_COUNT_KEY);
      if (readCounts) {
        data.read_count_data = readCounts;
      }

      // 添加版本信息
      data.__backup_meta = {
        version: '2.0',
        timestamp: Date.now(),
        date: new Date().toLocaleString('zh-CN'),
        storageFormat: 'flat'  // 标识数据格式
      };

      const json = JSON.stringify(data, null, 2);

      // 生成文件名
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const fileName = `qingba_backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.txt`;

      // 写入临时文件
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

      fs.writeFile({
        filePath,
        data: json,
        encoding: 'utf8',
        success: () => {
          // 直接转发给好友（或文件传输助手）
          this.shareFile(filePath, fileName);
        },
        fail: (err) => {
          console.error('写入文件失败', err);
          wx.showToast({
            title: '备份失败',
            icon: 'none'
          });
        }
      });
    } catch (e) {
      console.error('备份失败', e);
      wx.showToast({
        title: '备份失败',
        icon: 'none'
      });
    }
  },

  // 转发文件给好友
  shareFile(filePath, fileName) {
    if (wx.shareFileMessage) {
      wx.shareFileMessage({
        filePath,
        fileName,
        success: () => {
          wx.showToast({
            title: '备份已发送',
            icon: 'success'
          });
        },
        fail: (err) => {
          console.error('shareFileMessage fail', err);
          // 转发失败时，回退到复制到剪贴板
          wx.showModal({
            title: '转发失败',
            content: '无法直接转发文件，是否复制备份内容到剪贴板？粘贴到聊天即可保存。',
            confirmText: '复制',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                this._copyBackupToClipboard(filePath);
              }
            }
          });
        }
      });
    } else {
      // 不支持转发API，直接复制到剪贴板
      wx.showModal({
        title: '复制备份',
        content: '当前微信版本不支持文件转发，将备份内容复制到剪贴板，粘贴到聊天即可保存。',
        confirmText: '复制',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this._copyBackupToClipboard(filePath);
          }
        }
      });
    }
  },

  // 复制备份内容到剪贴板（备选方案）
  _copyBackupToClipboard(filePath) {
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: 'utf8',
      success: (res) => {
        wx.setClipboardData({
          data: res.data,
          success: () => {
            wx.showModal({
              title: '已复制',
              content: '备份内容已复制到剪贴板，打开微信聊天粘贴即可保存。',
              showCancel: false,
              confirmText: '我知道了'
            });
          }
        });
      },
      fail: () => {
        wx.showToast({
          title: '读取文件失败',
          icon: 'none'
        });
      }
    });
  },

  // ===== 导入（从备份文件） =====
  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'json'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.readAndImport(file.path);
      },
      fail: (err) => {
        console.log('选择文件失败或取消', err);
      }
    });
  },

  readAndImport(filePath) {
    wx.showLoading({ title: '读取中...' });

    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: 'utf8',
      success: (res) => {
        wx.hideLoading();
        try {
          const data = JSON.parse(res.data);

          // 验证必要的 key
          if (!data.checkin_records || !Array.isArray(data.checkin_records)) {
            wx.showToast({
              title: '备份格式无效',
              icon: 'none'
            });
            return;
          }

          const recordCount = data.checkin_records.length;
          wx.showModal({
            title: '确认导入',
            content: `将导入 ${recordCount} 条打卡记录，是否继续？`,
            confirmText: '导入',
            cancelText: '取消',
            confirmColor: '#4a90d9',
            success: (modalRes) => {
              if (modalRes.confirm) {
                this.doImport(data);
              }
            }
          });
        } catch (e) {
          wx.hideLoading();
          wx.showModal({
            title: '解析失败',
            content: 'JSON格式错误，请检查文件内容是否正确',
            showCancel: false
          });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('读取文件失败', err);
        wx.showToast({
          title: '读取文件失败',
          icon: 'none'
        });
      }
    });
  },

  doImport(data) {
    wx.showLoading({ title: '导入中...' });

    try {
      // 将扁平数组转换为按日期分组的对象
      const grouped = {};
      if (data.checkin_records) {
        for (const record of data.checkin_records) {
          const day = record.day || checkin.todayStr(new Date(record.timestamp));
          if (!grouped[day]) {
            grouped[day] = [];
          }
          grouped[day].push(record);
        }
        wx.setStorageSync(checkin.STORAGE_KEY, grouped);
      }

      // 保存默认备注
      if (data.checkin_default_remark) {
        wx.setStorageSync(checkin.DEFAULT_REMARK_KEY, data.checkin_default_remark);
      }

      // 保存已读次数
      if (data.read_count_data) {
        wx.setStorageSync(checkin.READ_COUNT_KEY, data.read_count_data);
      }

      wx.hideLoading();
      this.loadStats();

      wx.showToast({
        title: '导入成功',
        icon: 'success'
      });

      // 通知其他页面数据已更新
      const app = getApp();
      if (app) {
        app.globalData.checkinDirty = true;
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: '导入失败',
        icon: 'none'
      });
    }
  },

  // ===== 清空数据 =====
  onClearData() {
    if (this.data.totalCount === 0) {
      wx.showToast({ title: '暂无数据', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认清空',
      content: `将删除全部 ${this.data.totalCount} 条打卡记录，此操作不可恢复，是否继续？`,
      confirmText: '清空',
      cancelText: '取消',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.doClear();
        }
      }
    });
  },

  doClear() {
    wx.showLoading({ title: '清除中...' });

    setTimeout(() => {
      try {
        wx.removeStorageSync(checkin.STORAGE_KEY);
        wx.removeStorageSync(checkin.DEFAULT_REMARK_KEY);
        wx.removeStorageSync(checkin.READ_COUNT_KEY);

        wx.hideLoading();
        this.loadStats();

        wx.showToast({
          title: '已清空',
          icon: 'success'
        });

        // 通知其他页面
        const app = getApp();
        if (app) {
          app.globalData.checkinDirty = true;
        }
      } catch (e) {
        wx.hideLoading();
        wx.showToast({
          title: '清除失败',
          icon: 'none'
        });
      }
    }, 300);
  }
});
