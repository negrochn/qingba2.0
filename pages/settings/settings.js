// 设置页
const checkin = require('../../utils/checkin.js');
const children = require('../../utils/children.js');
const customResources = require('../../utils/customResources.js');
const { ROUTES } = require('../../utils/data.js');
const { generateStressData } = require('../../utils/stress-test.js');
const docx = require('../../utils/docx.js');
const theme = require('../../utils/theme.js');

// 获取「关于小程序」右侧显示文案：
// 正式版读线上版本号；开发版 / 体验版读不到版本号，只显示环境（不做假版本号兜底）
function getAppVersionText() {
  try {
    const info = wx.getAccountInfoSync();
    const version = info.miniProgram.version;
    const envVersion = info.miniProgram.envVersion; // develop | trial | release
    if (version) return `版本${version}`;
    if (envVersion === 'develop') return '开发版';
    if (envVersion === 'trial') return '体验版';
    return '未知版本';
  } catch (e) {
    return '未知版本';
  }
}

Page({
  data: {
    totalCount: 0,
    currentRouteName: '',
    childCountText: '',
    appVersionText: getAppVersionText(),
    // 开发者工具（压力测试）仅在开发版显示
    showDevTools: false,
    currentStageIndex: -1,
    currentStage: null,
    currentStageDisplay: '',
    youquEnabled: true,
    listeningEnabled: false,
    targetSummary: '',
    myResourceCount: 0,
    _importMode: 'overwrite',
    // 导入备份 · 选孩子弹层（v2 单孩格式专用）
    importPickVisible: false,
    importPickItems: [],
    importPickSelectedId: '',
    // 字号 / 深色 class（跟随微信设置，由 app.applyFontLevel 下发）
    fontClass: 'fs-normal',
    darkClass: 'dm-auto',
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

    // 各数据项统一由 onShow 加载：onLoad 后紧接着就会触发 onShow，
    // 两处都调会让 loadStats（内部 getAll 全量读存储）这类重活白做一遍
  },

  onShow() {
    const app = getApp();
    if (app && app.applyFontLevel) app.applyFontLevel(this);

    this.loadRoute();
    this.loadChildCount();
    this.loadStats();
    this.loadCurrentStage();
    this.loadYouquPlan();
    this.loadListening();
    this.loadTargetSummary();
    this.loadMyResources();
  },

  // 读取自定义资源数量（「我的资源」入口右侧展示）
  loadMyResources() {
    try {
      this.setData({ myResourceCount: customResources.countAll() });
    } catch (e) {
      console.error('读取自定义资源失败', e);
    }
  },

  // 跳转「我的资源」管理页
  goMyResources() {
    wx.navigateTo({ url: '/pages/myResources/myResources' });
  },

  // 孩子数（「孩子管理」入口右侧展示；单孩也显示「1 个」）
  loadChildCount() {
    try {
      const n = children.getChildren().length;
      this.setData({ childCountText: `${n} 个` });
    } catch (e) {
      console.error('读取孩子数失败', e);
    }
  },

  // 跳转「孩子管理」页（多孩功能唯一管理入口）
  goChildManage() {
    wx.navigateTo({ url: '/pages/childManage/childManage' });
  },

  // 读取阶段目标口径（默认档位 + 自定义阶段数），供入口行右侧展示
  loadTargetSummary() {
    try {
      const modeText = checkin.getTargetMode() === 'lower' ? '下限' : '上限';
      const count = Object.keys(checkin.getCustomTargets()).length;
      // 有覆盖时补一句，否则用户会疑惑「为什么各阶段进度口径不一致」
      this.setData({ targetSummary: count ? `${modeText} · ${count} 项自定义` : modeText });
    } catch (e) {
      console.error('读取阶段目标口径失败', e);
    }
  },

  // 跳转「阶段目标时长」设置页
  goTargetSetting() {
    wx.navigateTo({ url: '/pages/targetSetting/targetSetting' });
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
  },

  // 读取熏听分组开关
  loadListening() {
    this.setData({ listeningEnabled: checkin.isListeningEnabled() });
  },

  // 切换熏听分组开关：开 = 阶段页显示「熏听」分组并可打卡（时长按阶段系数折算）
  onListeningChange(e) {
    const enabled = !!e.detail.value;
    checkin.setListeningEnabled(enabled);
    this.setData({ listeningEnabled: enabled });
  },

  // ===== 当前路线 =====
  // 「当前路线」入口显示（具体选择在 routePicker 页进行，与「当前阶段」同款交互）。
  // 切换发生在子页，返回时本页 onShow 自动刷新：loadCurrentStage 读的是新路线的槽位
  loadRoute() {
    const rid = checkin.getCurrentRouteId();
    this.setData({ currentRouteName: ROUTES[rid] ? ROUTES[rid].name : '' });
  },

  goRoutePicker() {
    wx.navigateTo({ url: '/pages/routePicker/routePicker' });
  },

  // 加载当前阶段（读当前路线的槽位，展示字段从当前路线数据补全）
  loadCurrentStage() {
    const saved = checkin.getCurrentStage();
    const routeStages = checkin.getCurrentRoute().stages || [];
    if (saved) {
      // 从当前路线补全完整字段（兼容旧存储或默认值只有 id/name 的情况）
      const routeStage = routeStages.find(s => s.stage_id === saved.id);
      const fullData = routeStage ? {
        id: routeStage.stage_id,
        name: routeStage.stage_name,
        targetPhase: routeStage.target_phase,
        vocabularyTarget: routeStage.vocabulary_target,
        timeInvestment: routeStage.time_investment
      } : saved;

      const index = routeStages.findIndex(s => s.stage_id === saved.id);
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

  // 跳转阶段选择页（原语 3：picker-page 整页单选）
  goStagePicker() {
    wx.navigateTo({ url: '/pages/stagePicker/stagePicker' });
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
  // 点击直接生成并打开备份文件（Word 文档）
  onExport() {
    this._generateBackupFile((filePath) => {
      this.openBackupFile(filePath);
    });
  },

  // 生成 docx 备份文件，成功后回调 (filePath, fileName)
  _generateBackupFile(callback) {
    wx.showLoading({ title: '生成中...', mask: true });

    try {
      // 收集所有数据（v3 多孩格式：含全部孩子；全局设置在顶层）
      const data = {};

      // ===== 各孩子数据：临时切换收集，finally 恢复原当前孩子 =====
      // 收集过程同步执行，中间不会有 onShow 打断；任一步异常也保证切回
      const prevActiveId = children.getActiveChildId();
      const childrenOut = [];
      try {
        children.getChildren().forEach((c) => {
          children.switchChild(c.id);
          const one = { name: c.name, color: c.color };

          // 打卡记录（扁平化处理，方便导入）
          const all = checkin.getAll();
          const records = [];
          for (const day in all) {
            for (const rec of all[day]) {
              records.push(rec);
            }
          }
          if (records.length) one.checkin_records = records;

          // 已读次数
          const readCounts = checkin.getReadCounts();
          if (readCounts && Object.keys(readCounts).length) {
            one.read_count_data = readCounts;
          }

          // 自定义资源
          const customResourcesData = customResources.getAll();
          if (customResourcesData && Object.keys(customResourcesData).length > 0) {
            one.custom_resources = customResourcesData;
          }

          // 阶段进度：两路线槽位整组 + 已完成名单 + 当前路线
          const stagesMap = checkin.getCurrentStagesMap();
          if (stagesMap.regular || stagesMap.bigloop) {
            one.current_stage_map = stagesMap;
          }
          const stageDone = checkin.getCompletedStages();
          if (stageDone.length) one.stage_done = stageDone;
          one.current_route = checkin.getCurrentRouteId();

          // 目标口径与有趣计划（per-child）
          if (checkin.isYouquPlanEnabled() === false) one.youqu_plan = false;
          one.target_mode = checkin.getTargetMode();
          const customTargets = checkin.getCustomTargets();
          if (Object.keys(customTargets).length) one.target_custom = customTargets;

          childrenOut.push(one);
        });
      } finally {
        children.switchChild(prevActiveId);
      }
      data.children = childrenOut;

      // ===== 全局（家庭级）设置 =====
      // 默认备注
      const remarks = wx.getStorageSync(checkin.DEFAULT_REMARK_KEY);
      if (remarks) {
        data.checkin_default_remark = remarks;
      }

      // 熏听分组开关
      data.listening_enabled = checkin.isListeningEnabled();

      // 字体大小档位
      data.font_level = theme.getFontLevel();

      // 添加版本信息
      data.__backup_meta = {
        version: '3.0',
        timestamp: Date.now(),
        date: new Date().toLocaleString('zh-CN'),
        storageFormat: 'multi_child',  // 标识数据格式（含全部孩子）
        child_count: childrenOut.length
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



  // ===== 导入备份 =====
  // 跳转导入方式选择页（原语 3：picker-page 整页单选）
  goImportPicker() {
    wx.navigateTo({ url: '/pages/importPicker/importPicker' });
  },

  // 从 importPicker 返回后，按所选方式选择备份文件并导入
  startImport(mode) {
    this.setData({ _importMode: mode });

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['txt', 'json', 'docx'],
      success: (res) => {
        const file = res.tempFiles[0];
        if (!file) {
          wx.showToast({ title: '未选择文件', icon: 'none' });
          return;
        }
        this.readAndImport(file.path, file.name);
      },
      fail: (err) => {
        if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) return;
        wx.showToast({ title: '未选择文件', icon: 'none' });
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

  // 解析备份文本：v3 多孩格式整体恢复；v2 单孩格式先选目标孩子
  _handleImportText(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      wx.showModal({
        title: '解析失败',
        content: 'JSON格式错误，请检查文件内容是否正确',
        showCancel: false
      });
      return;
    }

    const modeText = this.data._importMode === 'merge' ? '合并式导入' : '覆盖式导入';

    // v3 多孩格式：整体恢复（每个孩子按名字与本机合并/新建），不弹选孩子
    if (Array.isArray(data.children) && data.children.length > 0) {
      const childCount = data.children.length;
      const recordCount = data.children.reduce(
        (n, c) => n + (Array.isArray(c.checkin_records) ? c.checkin_records.length : 0), 0
      );
      wx.showModal({
        title: '确认导入',
        content: `备份包含 ${childCount} 个孩子、${recordCount} 条打卡记录，${modeText}，是否继续？`,
        confirmText: '导入',
        cancelText: '取消',
        confirmColor: '#07C160',
        success: (modalRes) => {
          if (modalRes.confirm) {
            this.doImportChildren(data.children, this.data._importMode, data);
          }
        }
      });
      return;
    }

    // v2 单孩格式：验证后先选目标孩子，再导入到所选孩子名下
    if (!data.checkin_records || !Array.isArray(data.checkin_records)) {
      wx.showToast({
        title: '备份格式无效',
        icon: 'none'
      });
      return;
    }

    this._pendingImport = data;
    const list = children.getChildren();
    const activeId = children.getActiveChildId();
    this.setData({
      importPickVisible: true,
      importPickSelectedId: activeId,
      importPickItems: list.map(c => ({
        id: c.id,
        name: c.name,
        initial: String(c.name || '').trim().charAt(0) || '·',
        color: c.color,
        active: c.id === activeId
      }))
    });
  },

  // ===== 导入备份 · 选孩子弹层（v2 单孩格式专用；v3 整体恢复不经过此处） =====
  onImportPickChild(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      importPickSelectedId: id,
      importPickItems: this.data.importPickItems.map(it => ({
        ...it,
        active: it.id === id
      }))
    });
  },

  closeImportPick() {
    this.setData({ importPickVisible: false });
    this._pendingImport = null;
  },

  // 「导入到「xx」」：临时切换到所选孩子执行导入，完成后切回原当前孩子
  confirmImportPick() {
    const targetId = this.data.importPickSelectedId;
    const data = this._pendingImport;
    if (!data || !targetId) return;

    const prevActiveId = children.getActiveChildId();
    children.switchChild(targetId);
    try {
      this._applyChildData(data, this.data._importMode);
      this._applyGlobalData(data);
    } finally {
      if (prevActiveId !== targetId) children.switchChild(prevActiveId);
    }

    this.setData({ importPickVisible: false });
    this._pendingImport = null;
    this.loadStats();
    this.loadMyResources();
    this.loadChildCount();
    const hit = children.getChildren().find(c => c.id === targetId);
    wx.showToast({
      title: `已导入到${hit ? hit.name : '所选孩子'}`,
      icon: 'success'
    });
  },

  // v3 整体恢复：逐个孩子按名字匹配（无则新建），临时切换导入，finally 恢复原当前孩子
  doImportChildren(childrenArr, mode, rawData) {
    wx.showLoading({ title: '导入中...' });
    const prevActiveId = children.getActiveChildId();
    let skipped = 0;
    try {
      childrenArr.forEach((c) => {
        if (!c || !c.name) { skipped++; return; }
        let hit = children.getChildren().find(x => x.name === c.name);
        if (!hit) {
          const res = children.addChild(c.name);
          if (!res.ok) { skipped++; return; }   // 名字非法/已达上限：跳过该孩子
          hit = res.child;
        }
        children.switchChild(hit.id);
        this._applyChildData(c, mode);
      });

      // 全局（家庭级）设置只恢复一次
      if (rawData) this._applyGlobalData(rawData);
    } finally {
      if (prevActiveId && children.getChildren().some(x => x.id === prevActiveId)) {
        children.switchChild(prevActiveId);
      }
    }

    wx.hideLoading();
    this.loadStats();
    this.loadMyResources();
    this.loadChildCount();
    wx.showToast({
      title: skipped > 0 ? `导入成功（${skipped} 个孩子跳过）` : '导入成功',
      icon: skipped > 0 ? 'none' : 'success'
    });
  },

  doImport(data, mode = 'overwrite') {
    wx.showLoading({ title: '导入中...' });

    try {
      this._applyChildData(data, mode);
      this._applyGlobalData(data);

      wx.hideLoading();
      this.loadStats();
      this.loadMyResources();

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

  // 将备份中「单个孩子」的数据落到当前孩子（v2 顶层字段 / v3 children[i] 同构复用）
  _applyChildData(data, mode = 'overwrite') {
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

    // 保存已读次数（当前孩子；合并模式：本地与备份按资源累加）
    if (data.read_count_data) {
      if (mode === 'merge') {
        const mergedCounts = Object.assign({}, checkin.getReadCounts());
        for (const key in data.read_count_data) {
          mergedCounts[key] = (mergedCounts[key] || 0) + (data.read_count_data[key] || 0);
        }
        checkin.replaceReadCounts(mergedCounts);
      } else {
        checkin.replaceReadCounts(data.read_count_data);
      }
    }

    // 自定义资源：合并模式按「阶段 + 分组 + 名称」去重，覆盖模式直接替换
    if (data.custom_resources) {
      if (mode === 'merge') {
        customResources.mergeAll(data.custom_resources);
      } else {
        customResources.replaceAll(data.custom_resources);
      }
    }

    // 导入的旧备份 key 仍是资源名，需再迁移一次（force 忽略本会话已迁移标记）
    checkin.migrateResourceKeysToId(true);

    // 恢复阶段进度：v3 两路线槽位整组恢复；v2 单对象走当前路线槽位
    if (data.current_stage_map) {
      checkin.restoreCurrentStages(data.current_stage_map);
    } else if (data.current_stage) {
      // 走槽位化接口写入（按当前路线存），不再直接写旧单键
      checkin.setCurrentStage(data.current_stage);
    }

    // 恢复当前路线（v3 每孩子备份里有）
    if (data.current_route === 'regular' || data.current_route === 'bigloop') {
      checkin.setCurrentRouteId(data.current_route);
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

    // 恢复小小优趣成长计划开关（备份缺该字段时不修改，保持当前设置）
    if (typeof data.youqu_plan === 'boolean') {
      checkin.setYouquPlanEnabled(data.youqu_plan);
    }

    // 恢复阶段目标口径（同上，缺字段不覆盖；自定义表整体替换，非法项由 replaceCustomTargets 丢弃）
    if (data.target_mode === 'lower' || data.target_mode === 'upper') {
      checkin.setTargetMode(data.target_mode);
    }
    if (data.target_custom && typeof data.target_custom === 'object') {
      checkin.replaceCustomTargets(data.target_custom);
    }
  },

  // 全局（家庭级）设置：默认备注 + 熏听开关；字体档位已跟随微信设置，旧字段有意忽略
  _applyGlobalData(data) {
    if (data.checkin_default_remark) {
      wx.setStorageSync(checkin.DEFAULT_REMARK_KEY, data.checkin_default_remark);
    }
    if (typeof data.listening_enabled === 'boolean') {
      checkin.setListeningEnabled(data.listening_enabled);
    }
  },

  // 跳转清空范围选择页（原语 3：picker-page 整页单选）
  goClearPicker() {
    wx.navigateTo({ url: '/pages/clearPicker/clearPicker' });
  },

  // 从 clearPicker 返回后，二次确认并执行清空
  startClear(opt) {
    if (!opt) return;

    const content = opt.key === 'route'
      ? `将清空${opt.label}：当前路线的打卡记录与自定义资源（另一条路线不受影响），并重置该路线的阶段进度，此操作不可恢复，是否继续？`
      : `将清空「${opt.label}」的所有打卡记录与该阶段的自定义资源，此操作不可恢复，是否继续？`;

    wx.showModal({
      title: '确认清空',
      content,
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
        if (scope === 'route') {
          // 当前路线全部数据：逐阶段清记录/次数/备注与该阶段自定义资源，重置当前阶段
          // 与完成标记；另一条路线不受影响（stage_id 命名空间隔离）；清完回到未设置态
          const stages = checkin.getCurrentRoute().stages || [];
          let removedTotal = 0;
          stages.forEach(s => {
            removedTotal += checkin.clearCheckinsByStage(s.stage_id);
            customResources.clearByStage(s.stage_id);
          });
          checkin.clearCurrentStage();
          const ids = {};
          stages.forEach(s => { ids[s.stage_id] = true });
          checkin.setCompletedStages(
            checkin.getCompletedStages().filter(id => !ids[id])
          );
          if (!removedTotal) {
            wx.hideLoading();
            wx.showToast({ title: '该范围暂无数据', icon: 'none' });
            return;
          }
        } else {
          // 按阶段清除：仅删除该阶段的记录、已读次数与自定义资源
          const hasCustom = customResources.countByStage(scope) > 0;
          const removed = checkin.clearCheckinsByStage(scope);
          customResources.clearByStage(scope);
          if (!removed && !hasCustom) {
            wx.hideLoading();
            wx.showToast({ title: '该范围暂无数据', icon: 'none' });
            return;
          }
        }

        wx.hideLoading();
        this.loadStats();
        this.loadCurrentStage();
        this.loadMyResources();

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
      content: '将生成模拟打卡数据（各阶段按官方时长目标累计，调整支线按试走量，每日15-60分钟，含缺卡日），会覆盖现有数据，是否继续？',
      confirmText: '生成',
      cancelText: '取消',
      confirmColor: '#07C160',
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
