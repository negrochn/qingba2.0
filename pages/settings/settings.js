// 设置页
const checkin = require('../../utils/checkin.js');
const { routeData } = require('../../utils/data.js');
const { generateStressData } = require('../../utils/stress-test.js');
const docx = require('../../utils/docx.js');
const theme = require('../../utils/theme.js');

// 构建阶段选项
const stageOptions = routeData.stages.map(s => ({
  id: s.stage_id,
  name: s.stage_name
}));

// 本地兜底版本号（正式版会自动读取线上版本号，开发/体验版为空时使用此值）
const FALLBACK_VERSION = '2.0.0';

// 获取显示版本号
function getAppVersion() {
  try {
    const info = wx.getAccountInfoSync();
    const version = info.miniProgram.version;
    const envVersion = info.miniProgram.envVersion; // develop | trial | release
    if (version) return version;
    if (envVersion === 'develop') return `${FALLBACK_VERSION}(开发版)`;
    if (envVersion === 'trial') return `${FALLBACK_VERSION}(体验版)`;
    return FALLBACK_VERSION;
  } catch (e) {
    return FALLBACK_VERSION;
  }
}

Page({
  data: {
    totalCount: 0,
    stageOptions,
    appVersion: getAppVersion(),
    // 开发者工具（压力测试）仅在开发版显示
    showDevTools: false,
    currentStageIndex: -1,
    currentStage: null,
    currentStageDisplay: '',
    youquEnabled: false,
    // picker 选项
    clearOptions: [],
    importOptions: [
      { key: 'overwrite', label: '覆盖式导入' },
      { key: 'merge', label: '合并式导入' }
    ],
    exportOptions: [
      { key: 'open', label: '打开备份文件' },
      { key: 'share', label: '转发给好友' }
    ],
    _importMode: 'overwrite',
    // 字体大小
    fontClass: 'fs-normal',
    fontLevelIndex: theme.defaultIndex(),
    fontLevelOptions: theme.LEVELS,
    fontLevelText: '',
    // 深色模式
    darkClass: 'dm-auto',
    darkModeIndex: theme.getDarkModeIndex(),
    darkModeOptions: theme.DARK_MODES,
    darkModeText: ''
  },

  onLoad() {
    // 正式版/体验版隐藏开发者工具入口
    let env = '';
    try { env = wx.getAccountInfoSync().miniProgram.envVersion || '' } catch (e) {}
    this.setData({
      showDevTools: env === 'develop',
      _importMode: 'overwrite'
    });

    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    this.loadFontLevel();
    this.loadDarkMode();
    this.loadStats();
    this.loadCurrentStage();
    this.loadYouquPlan();
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    this.loadFontLevel();
    this.loadDarkMode();
    this.loadStats();
    this.loadCurrentStage();
    this.loadYouquPlan();
    this._loadClearOptions();
  },

  // ===== 字体大小 =====
  loadFontLevel() {
    this.setData({
      fontLevelIndex: theme.getFontLevelIndex(),
      fontLevelText: theme.getFontLevelText(),
      fontClass: theme.getFontClass()
    });
  },

  onFontLevelChange(e) {
    const index = parseInt(e.detail.value, 10);
    const level = theme.LEVELS[index];
    if (!level) return;

    theme.setFontLevel(level.key);
    this.loadFontLevel();

    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    wx.showToast({
      title: `字号：${level.label}`,
      icon: 'none'
    });
  },

  // ===== 深色模式 =====
  loadDarkMode() {
    this.setData({
      darkModeIndex: theme.getDarkModeIndex(),
      darkModeText: theme.getDarkModeText(),
      darkClass: theme.getDarkClass()
    });
  },

  onDarkModeChange(e) {
    const index = parseInt(e.detail.value, 10);
    const mode = theme.DARK_MODES[index];
    if (!mode) return;

    theme.setDarkMode(mode.key);
    this.loadDarkMode();

    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    wx.showToast({
      title: `深色模式：${mode.label}`,
      icon: 'none'
    });
  },

  // 读取小小优趣成长计划开关
  loadYouquPlan() {
    this.setData({ youquEnabled: checkin.isYouquPlanEnabled() });
  },

  // 切换小小优趣成长计划开关
  onYouquPlanChange(e) {
    const enabled = !!e.detail.value;
    checkin.setYouquPlanEnabled(enabled);
    this.setData({ youquEnabled: enabled });
    wx.showToast({
      title: enabled ? '已开启' : '已关闭',
      icon: 'none'
    });
  },

  // 加载当前阶段
  loadCurrentStage() {
    const saved = checkin.getCurrentStage();
    if (saved) {
      // 从 routeData 补全完整字段（兼容旧存储或默认值只有 id/name 的情况）
      const routeStage = routeData.stages.find(s => s.stage_id === saved.id);
      const fullData = routeStage ? {
        id: routeStage.stage_id,
        name: routeStage.stage_name,
        targetPhase: routeStage.target_phase,
        vocabularyTarget: routeStage.vocabulary_target,
        timeInvestment: routeStage.time_investment
      } : saved;

      const index = stageOptions.findIndex(s => s.id === saved.id);
      this.setData({
        currentStageIndex: index >= 0 ? index : -1,
        currentStage: fullData,
        currentStageDisplay: fullData.name
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

    // 保存：当前阶段 + 前序阶段标记完成（与首页引导一致）
    checkin.setCurrentStage(stageData);
    const done = stageOptions.slice(0, index).map(s => s.id);
    checkin.setCompletedStages(done);

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

  // ===== 导出备份 =====
  // 点击 picker 选择打开/转发，选择后再生成文件
  onExportModeChange(e) {
    const options = this.data.exportOptions || [];
    const opt = options[e.detail.value];
    if (!opt) return;

    // 选择具体动作后，再按需生成备份文件
    this._generateBackupFile((filePath, fileName) => {
      if (opt.key === 'open') {
        this.openBackupFile(filePath);
      } else if (opt.key === 'share') {
        this.shareFile(filePath, fileName);
      }
    });
  },

  // 生成 docx 备份文件，成功后回调 (filePath, fileName)
  _generateBackupFile(callback) {
    wx.showLoading({ title: '生成中...', mask: true });

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

      // 当前阶段
      const currentStage = checkin.getCurrentStage();
      if (currentStage) {
        data.current_stage = currentStage;
      }

      // 已完成阶段名单（与首启引导一致）
      data.stage_done = checkin.getCompletedStages();

      // 小小优趣成长计划开关
      data.youqu_plan = checkin.isYouquPlanEnabled();

      // 字体大小档位
      data.font_level = theme.getFontLevel();

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
      const fileName = `qingba_backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.docx`;

      // 写入临时文件
      const fs = wx.getFileSystemManager();

      // 清理历史备份临时文件，避免多次备份后在本地目录累积
      try {
        const oldFiles = fs.readdirSync(wx.env.USER_DATA_PATH);
        oldFiles.forEach(f => {
          if (f.indexOf('qingba_backup_') === 0) {
            try { fs.unlinkSync(`${wx.env.USER_DATA_PATH}/${f}`) } catch (e) {}
          }
        });
      } catch (e) {}

      const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      const docxBuffer = docx.createDocx(json);

      fs.writeFile({
        filePath,
        data: docxBuffer,
        success: () => {
          wx.hideLoading();
          if (typeof callback === 'function') {
            callback(filePath, fileName);
          }
        },
        fail: (err) => {
          wx.hideLoading();
          console.error('写入文件失败', err);
          wx.showToast({
            title: '备份失败',
            icon: 'none'
          });
        }
      });
    } catch (e) {
      wx.hideLoading();
      console.error('备份失败', e);
      wx.showToast({
        title: '备份失败',
        icon: 'none'
      });
    }
  },

  // 用 openDocument 打开备份文件（iPhone 可"存储到文件"）
  openBackupFile(filePath) {
    if (!wx.openDocument) {
      wx.showToast({ title: '当前版本不支持打开文件', icon: 'none' });
      return;
    }
    wx.openDocument({
      filePath,
      fileType: 'docx',
      showMenu: true,
      success: () => {
        // 打开成功：预览页右上角菜单可转发 / 用其他应用打开（存储到文件）
      },
      fail: (err) => {
        console.error('openDocument fail', err);
        wx.showModal({
          title: '打开失败',
          content: '无法打开备份文件，可尝试转发给好友。',
          showCancel: false,
          confirmText: '知道了'
        });
      }
    });
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
          // 转发失败时，回退到打开备份文件另存
          wx.showModal({
            title: '转发失败',
            content: '无法直接转发文件，可尝试使用「打开备份文件」，从预览页右上角菜单存储到文件或转发。',
            confirmText: '打开备份',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                this.openBackupFile(filePath);
              }
            }
          });
        }
      });
    } else {
      // 不支持转发API，引导通过打开备份文件保存
      wx.showModal({
        title: '无法转发',
        content: '当前微信版本不支持文件转发。可使用「打开备份文件」，从预览页右上角菜单存储到文件或转发。',
        confirmText: '打开备份',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.openBackupFile(filePath);
          }
        }
      });
    }
  },

  // ===== 导入备份 =====
  // 点击 picker 选择覆盖/合并，选择后再选文件
  onImportModeChange(e) {
    const options = this.data.importOptions || [];
    const opt = options[e.detail.value];
    if (!opt) return;

    // 记录导入方式，再选择文件
    this.setData({ _importMode: opt.key });

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'json', 'docx'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.readAndImport(file.path, file.name);
      },
      fail: (err) => {
        console.log('选择文件失败或取消', err);
      }
    });
  },

  readAndImport(filePath, fileName) {
    wx.showLoading({ title: '读取中...' });

    const fs = wx.getFileSystemManager();
    if (docx.isDocxName(fileName)) {
      // docx：以二进制读取后解析
      fs.readFile({
        filePath,
        success: (res) => {
          wx.hideLoading();
          try {
            const text = docx.parseDocx(res.data);
            this._handleImportText(text);
          } catch (e) {
            console.error('docx 解析失败', e);
            wx.showModal({
              title: '解析失败',
              content: '备份文件解析失败，请使用本小程序导出的、未修改过的备份文件。',
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
    } else {
      // txt / json：直接按文本读取
      fs.readFile({
        filePath,
        encoding: 'utf8',
        success: (res) => {
          wx.hideLoading();
          this._handleImportText(res.data);
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
    }
  },

  // 解析备份文本并确认导入
  _handleImportText(text) {
    try {
      const data = JSON.parse(text);

      // 验证必要的 key
      if (!data.checkin_records || !Array.isArray(data.checkin_records)) {
        wx.showToast({
          title: '备份格式无效',
          icon: 'none'
        });
        return;
      }

      const recordCount = data.checkin_records.length;
      const modeText = this.data._importMode === 'merge' ? '合并式导入' : '覆盖式导入';
      wx.showModal({
        title: '确认导入',
        content: `备份包含 ${recordCount} 条打卡记录，导入方式：${modeText}，是否继续？`,
        confirmText: '导入',
        cancelText: '取消',
        confirmColor: '#4a90d9',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.doImport(data, this.data._importMode);
          }
        }
      });
    } catch (e) {
      wx.showModal({
        title: '解析失败',
        content: 'JSON格式错误，请检查文件内容是否正确',
        showCancel: false
      });
    }
  },

  doImport(data, mode = 'overwrite') {
    wx.showLoading({ title: '导入中...' });

    try {
      // 将扁平数组转换为按日期分组的对象
      // 过滤无效记录：无合法 day 且 timestamp 无法解析的脏数据直接丢弃
      const grouped = {};
      if (data.checkin_records) {
        for (const record of data.checkin_records) {
          if (!record || typeof record !== 'object') continue;
          let day = '';
          if (typeof record.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(record.day)) {
            day = record.day;
          } else {
            const ts = Number(record.timestamp);
            if (ts > 0) {
              const d = new Date(ts);
              if (!isNaN(d.getTime())) day = checkin.todayStr(d);
            }
          }
          if (!day) continue;
          if (!grouped[day]) {
            grouped[day] = [];
          }
          grouped[day].push(record);
        }

        // 合并模式：保留本地记录，按日期合并并按 id 去重（同 id 保留本地版本）
        if (mode === 'merge') {
          const local = checkin.getAll();
          const mergedByDay = {};
          for (const day in local) {
            if (Array.isArray(local[day]) && local[day].length > 0) {
              mergedByDay[day] = local[day].slice();
            }
          }
          for (const day in grouped) {
            if (!mergedByDay[day]) {
              mergedByDay[day] = [];
            }
            for (const c of grouped[day]) {
              mergedByDay[day].push(c);
            }
          }
          for (const day in mergedByDay) {
            const seen = new Set();
            const deduped = [];
            for (const c of mergedByDay[day]) {
              const key = c && c.id ? c.id : (c ? `${c.day}_${c.timestamp}_${c.resourceName}` : '');
              if (!key) {
                deduped.push(c);
                continue;
              }
              if (!seen.has(key)) {
                seen.add(key);
                deduped.push(c);
              }
            }
            deduped.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            mergedByDay[day] = deduped;
          }
          checkin.saveAll(mergedByDay);
        } else {
          checkin.saveAll(grouped);
        }
      }

      // 保存默认备注
      if (data.checkin_default_remark) {
        wx.setStorageSync(checkin.DEFAULT_REMARK_KEY, data.checkin_default_remark);
      }

      // 保存已读次数（合并模式：本地与备份按资源累加）
      if (data.read_count_data) {
        if (mode === 'merge') {
          const mergedCounts = Object.assign({}, wx.getStorageSync(checkin.READ_COUNT_KEY) || {});
          for (const key in data.read_count_data) {
            mergedCounts[key] = (mergedCounts[key] || 0) + (data.read_count_data[key] || 0);
          }
          wx.setStorageSync(checkin.READ_COUNT_KEY, mergedCounts);
        } else {
          wx.setStorageSync(checkin.READ_COUNT_KEY, data.read_count_data);
        }
      }

      // 恢复当前阶段
      if (data.current_stage) {
        wx.setStorageSync(checkin.CURRENT_STAGE_KEY, data.current_stage);
      }

      // 恢复已完成阶段名单（合并模式：取并集）
      if (Array.isArray(data.stage_done)) {
        if (mode === 'merge') {
          const merged = new Set([
            ...(checkin.getCompletedStages() || []),
            ...data.stage_done
          ]);
          checkin.setCompletedStages(Array.from(merged));
        } else {
          checkin.setCompletedStages(data.stage_done);
        }
      }

      // 恢复小小优趣成长计划开关（缺省按 false，兼容旧备份）
      if (typeof data.youqu_plan === 'boolean') {
        checkin.setYouquPlanEnabled(data.youqu_plan);
      }

      // 恢复字体大小档位（旧备份无此字段时保持当前设置）
      if (typeof data.font_level === 'string' && theme.indexOf(data.font_level) >= 0) {
        theme.setFontLevel(data.font_level);
        this.loadFontLevel();
      }

      wx.hideLoading();
      this.loadStats();

      wx.showToast({
        title: '导入成功',
        icon: 'success'
      });

    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: '导入失败',
        icon: 'none'
      });
    }
  },

  // ===== 清空数据 =====
  // 每次进入设置页时刷新清空范围选项
  _loadClearOptions() {
    const total = this.data.totalCount || 0;
    if (total === 0) {
      this.setData({ clearOptions: [] });
      return;
    }

    // 统计各阶段记录条数
    const all = checkin.getAll();
    const counts = {};
    for (const day in all) {
      for (const c of all[day]) {
        const sid = c && c.stageId ? c.stageId : '';
        counts[sid] = (counts[sid] || 0) + 1;
      }
    }

    // picker 选项：全部数据 + 有数据的阶段（附加 count 供确认提示与空判断）
    const options = routeData.stages
      .filter(s => (counts[s.stage_id] || 0) > 0)
      .map(s => ({
        key: s.stage_id,
        name: s.stage_name,
        label: s.stage_name,
        count: counts[s.stage_id] || 0
      }));
    options.unshift({
      key: 'all',
      name: '全部数据',
      label: '全部数据',
      count: total
    });
    this.setData({ clearOptions: options });
  },

  // picker 选择清空范围后二次确认
  onClearScopeChange(e) {
    const options = this.data.clearOptions || [];
    const opt = options[e.detail.value];
    if (!opt) return;

    if (!opt.count) {
      wx.showToast({ title: '该范围暂无数据', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '确认清空',
      content: `将删除「${opt.name}」共 ${opt.count} 条打卡记录，此操作不可恢复，是否继续？`,
      confirmText: '清空',
      cancelText: '取消',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          this.doClear(opt.key);
        }
      }
    });
  },

  doClear(scope) {
    wx.showLoading({ title: '清除中...' });

    setTimeout(() => {
      try {
        if (!scope || scope === 'all') {
          // 使用 clearAllCheckins 清除主 key + 所有分片 key
          checkin.clearAllCheckins();
          wx.removeStorageSync(checkin.DEFAULT_REMARK_KEY);
          wx.removeStorageSync(checkin.READ_COUNT_KEY);
          // 清空后回到初始未设置态：移除当前阶段与已完成名单（与首启引导一致）
          wx.removeStorageSync(checkin.CURRENT_STAGE_KEY);
          checkin.setCompletedStages([]);
        } else {
          // 按阶段清除：仅删除该阶段的记录与已读次数
          const removed = checkin.clearCheckinsByStage(scope);
          if (!removed) {
            wx.hideLoading();
            wx.showToast({ title: '该范围暂无数据', icon: 'none' });
            return;
          }
        }

        wx.hideLoading();
        this.loadStats();
        this.loadCurrentStage();

        wx.showToast({
          title: '已清空',
          icon: 'success'
        });

      } catch (e) {
        wx.hideLoading();
        wx.showToast({
          title: '清除失败',
          icon: 'none'
        });
      }
    }, 300);
  },

  // ===== 压力测试 =====
  onStressTest() {
    wx.showModal({
      title: '压力测试',
      content: '将生成模拟打卡数据（每阶段累计约80-90小时，每日15-60分钟，含缺卡日），会覆盖现有数据，是否继续？',
      confirmText: '生成',
      cancelText: '取消',
      confirmColor: '#4a90d9',
      success: (res) => {
        if (res.confirm) {
          this.doStressTest();
        }
      }
    });
  },

  doStressTest() {
    wx.showLoading({ title: '生成中...', mask: true });

    // 分步执行，避免阻塞 UI
    setTimeout(() => {
      try {
        const result = generateStressData((current, total, msg) => {
          wx.showLoading({ title: `${current}/${total}`, mask: true });
        });

        wx.hideLoading();

        // 构建结果摘要
        let stageSummary = '';
        for (const name in result.stageStats) {
          const s = result.stageStats[name];
          stageSummary += `${name}: ${s.days}天 ${s.records}条 ${s.hours}h(目标${s.targetHours}h)\n`;
        }

        wx.showModal({
          title: '生成完成',
          content: `打卡: ${result.totalDays}天 / 跨度: ${result.spanDays}天\n总记录: ${result.totalRecords}条\n总时长: ${result.totalHours}h\n已读完: ${result.totalReadCounts}次\n\n${stageSummary}`,
          showCancel: false,
          confirmText: '确定'
        });

        this.loadStats();
        this.loadCurrentStage();

        const app = getApp();
        if (app) {
          app.globalData.checkinDirty = true;
        }
      } catch (e) {
        wx.hideLoading();
        console.error('压力测试失败', e);
        wx.showModal({
          title: '生成失败',
          content: e.message || '未知错误',
          showCancel: false
        });
      }
    }, 100);
  }
});
