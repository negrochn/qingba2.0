// 设置页
const checkin = require('../../utils/checkin.js');

Page({
  data: {
    totalCount: 0,
    totalDays: 0,
    totalHours: '0'
  },

  onLoad() {
    this.loadStats();
  },

  onShow() {
    this.loadStats();
  },

  // 加载统计数据
  loadStats() {
    try {
      const count = checkin.totalCountAll();
      const days = checkin.totalDaysAll();
      const totalMin = checkin.totalMinutesAll();
      const totalHours = (totalMin / 60).toFixed(1).replace(/\.0$/, '');

      this.setData({
        totalCount: count,
        totalDays: days,
        totalHours
      });
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
      const fileName = `qingba_backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;

      // 写入临时文件
      const fs = wx.getFileSystemManager();
      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

      fs.writeFile({
        filePath,
        data: json,
        encoding: 'utf8',
        success: () => {
          // 打开文件，让用户保存/分享
          wx.openDocument({
            filePath,
            fileType: 'json',
            showMenu: true,
            success: () => {
              wx.showToast({
                title: '备份成功',
                icon: 'success'
              });
            },
            fail: () => {
              // openDocument 失败时，尝试分享
              this.shareFile(filePath, fileName);
            }
          });
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

  // 分享文件（作为备选方案）
  shareFile(filePath, fileName) {
    if (wx.shareFileMessage) {
      wx.shareFileMessage({
        filePath,
        fileName,
        fail: () => {
          wx.showModal({
            title: '备份文件已生成',
            content: `文件已保存至：${filePath}\n请通过文件管理器分享`,
            showCancel: false
          });
        }
      });
    } else {
      wx.showModal({
        title: '备份文件已生成',
        content: `文件已保存至：${filePath}\n请通过文件管理器分享`,
        showCancel: false
      });
    }
  },

  // ===== 导入（从JSON文件） =====
  onImport() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
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
