// 备份与恢复工具
// 职责：
//  1. 备份提醒与一次性引导状态（lastBackupTime / 关闭冷却 / 引导 flag，均为家庭级不分孩）
//  2. 备份文件生成（v3 多孩 JSON → 伪 docx）与分享（shareFileMessage，PC 降级 openDocument）
//  3. 备份文件读取解析（txt / json / docx，docx 快路径失败时 unzip 兜底）与导入落库
// 页面层（settings / dataBackup / home）只做 UI 与流程胶水，数据与判断都收口在本文件。
//
// 备份成功口径：
//  shareFileMessage success = 文件已发出（主口径）；openDocument success = 已打开预览
//  可转发/存文件（降级口径，宁可宽裕）。用户取消转发不记录。

const checkin = require('./checkin.js')
const children = require('./children.js')
const customResources = require('./customResources.js')
const theme = require('./theme.js')
const docx = require('./docx.js')
const timeText = require('./timeText.js')

// ===== 存储 key（家庭级，不分孩：备份文件本身含全部孩子）=====
const LAST_BACKUP_KEY = 'qingba_last_backup_time'            // 上次备份成功时间戳
const REMINDER_DISMISS_KEY = 'qingba_backup_reminder_dismissed_at' // 首页轻条关闭时间
const GUIDE_SHOWN_KEY = 'qingba_backup_guide_shown'          // 一次性引导已展示

// ===== 提醒阈值 =====
const REMIND_MIN_RECORDS = 7            // 累计记录达到该量才开始提醒（新用户攒够一周再打扰）
const REMIND_INTERVAL_DAYS = 30         // 距上次备份超过该天数则提醒
const DISMISS_COOLDOWN_DAYS = 30        // 首页轻条关闭后的冷却期（设置页红点不受冷却影响）

function _get(key) {
  try { return wx.getStorageSync(key) } catch (e) { return '' }
}

function _set(key, value) {
  try { wx.setStorageSync(key, value) } catch (e) {}
}

// ===== 提醒 / 引导状态 =====

function getLastBackupTime() {
  // 「上次备份」= 已留存备份中最新的一份的时间。留存物有两类且并列：
  //   文件备份（本地时间戳）与云端快照（cloudBackup 状态缓存）。
  // 取两者较大者：删除云端快照后云端项自然消失，回落到文件备份时间或「从未备份」；
  // 换手机后本地时间戳丢失，则只剩云端项（refreshCloudState 拉回 meta 后生效）
  let cloudTs = 0
  try {
    // 延迟 require：cloudBackup.js 顶层依赖本文件，此处反向调用须避开模块加载环
    const s = require('./cloudBackup.js').getCachedState()
    if (s && Number(s.updatedAt) > 0) cloudTs = Number(s.updatedAt)
  } catch (e) {}
  const local = Number(_get(LAST_BACKUP_KEY))
  return Math.max(local > 0 ? local : 0, cloudTs)
}

// 备份成功落时间戳（shareFileMessage / openDocument 成功回调调用）
function markBackedUp() {
  _set(LAST_BACKUP_KEY, Date.now())
}

// 存量兼容：旧版本云备份会把时间戳写入本 key（污染文件备份口径），导致删除云端
// 快照后「上次备份」无法回落。删除云端时传入云端快照时间，相等即视为云备份写入
// 的，一并清掉；不等则说明是文件备份时间，不能动
function clearLastBackupIf(cloudTs) {
  const last = Number(_get(LAST_BACKUP_KEY))
  if (last > 0 && last === Number(cloudTs)) {
    try { wx.removeStorageSync(LAST_BACKUP_KEY) } catch (e) {}
  }
}

// 「今天 14:11 / 昨天 22:30 / 10月8日 20:35 / 2025年12月3日」（智能格式，口径见 timeText.js）
// 从未备份返回 ''
function getLastBackupText() {
  const ts = getLastBackupTime()
  return ts ? timeText.formatSmart(ts) : ''
}

// 当前是否需要提醒（纯条件，不含冷却）：设置页红点直接用它（常驻直至备份）
function shouldRemind() {
  return getRemindText() !== ''
}

// 提醒文案；不满足提醒条件返回 ''
//  1. 从未备份且累计记录 ≥ REMIND_MIN_RECORDS
//  2. 距上次备份超过 REMIND_INTERVAL_DAYS 且累计记录 > 0
function getRemindText() {
  let total = 0
  try { total = checkin.totalCountAll() } catch (e) { return '' }
  if (total < REMIND_MIN_RECORDS) return ''
  const last = getLastBackupTime()
  if (!last) return '还没有备份记录，建议尽快备份'
  const days = Math.floor((Date.now() - last) / 86400000)
  if (days < REMIND_INTERVAL_DAYS) return ''
  return `距上次备份已 ${days} 天，建议备份`
}

// 首页轻条：提醒条件 + 不在关闭冷却期
function shouldShowHomeTip() {
  if (!shouldRemind()) return false
  const dismissed = Number(_get(REMINDER_DISMISS_KEY)) || 0
  return Date.now() - dismissed >= DISMISS_COOLDOWN_DAYS * 86400000
}

// 首页轻条关闭：记时间戳，冷却期内不再打扰
function dismissReminder() {
  _set(REMINDER_DISMISS_KEY, Date.now())
}

// 一次性引导：累计记录 ≥ REMIND_MIN_RECORDS 且未展示过
// 老用户升级后首启大多已达标（立即引导），新用户攒满一周后引导，统一口径无需版本标记
function shouldShowGuide() {
  if (_get(GUIDE_SHOWN_KEY)) return false
  try { return checkin.totalCountAll() >= REMIND_MIN_RECORDS } catch (e) { return false }
}

function markGuideShown() {
  _set(GUIDE_SHOWN_KEY, true)
}

// ===== 导出 =====

// 收集全部数据（v3 多孩格式：含全部孩子；全局设置在顶层）→ JSON 字符串。
// 收集过程同步执行，任一步异常由调用方兜底
function collectBackupJson() {
  const data = {}

  // 各孩子数据：临时切换收集，finally 恢复原当前孩子（中间不会有 onShow 打断）
  const prevActiveId = children.getActiveChildId()
  const childrenOut = []
  try {
    children.getChildren().forEach((c) => {
      children.switchChild(c.id)
      const one = { name: c.name, color: c.color }

      // 打卡记录（扁平化处理，方便导入）
      const all = checkin.getAll()
      const records = []
      for (const day in all) {
        for (const rec of all[day]) {
          records.push(rec)
        }
      }
      if (records.length) one.checkin_records = records

      // 已读次数
      const readCounts = checkin.getReadCounts()
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
  const remarks = wx.getStorageSync(checkin.DEFAULT_REMARK_KEY);
  if (remarks) {
    data.checkin_default_remark = remarks;
  }

  // 熏听分组开关
  data.listening_enabled = checkin.isListeningEnabled();

  // 字体大小档位（已跟随微信设置，字段保留以兼容旧版导入侧）
  data.font_level = theme.getFontLevel();

  // 版本信息
  data.__backup_meta = {
    version: '3.0',
    timestamp: Date.now(),
    date: new Date().toLocaleString('zh-CN'),
    storageFormat: 'multi_child',  // 标识数据格式（含全部孩子）
    child_count: childrenOut.length
  };

  // 紧凑序列化：云端快照受数据库单文档 512KB 限制，缩进空白约占 20-25% 体积，一律去除
  // （旧备份文件为带缩进格式，导入侧 JSON.parse 两种通吃，无兼容问题）
  return JSON.stringify(data);
}

// 生成备份文件并回调 (filePath, fileName)
// 全程同步（writeFileSync）：wx.shareFileMessage 要求在用户点击手势链内同步调用，
// 若经异步 writeFile 的 success 回调再调用会稳定报
// 「can only be invoked by user TAP gesture」，真机上被降级成 openDocument 预览。
// 本地写文件为毫秒级，同步不会造成可感知卡顿；失败走异常分支统一提示
function generateBackupFile(callback) {
  try {
    const json = collectBackupJson();

    // 生成文件名
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fileName = `qingba_backup_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.docx`;

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
    fs.writeFileSync(filePath, docx.createDocx(json));

    if (typeof callback === 'function') {
      callback(filePath, fileName);
    }
  } catch (e) {
    console.error('备份失败', e);
    wx.showToast({
      title: '备份失败',
      icon: 'none'
    });
  }
}

// 手机端直接拉起转发面板（引导发给「文件传输助手」）；
// 必须保持「点击 → generateBackupFile → 本函数」同步调用链（手势要求，见上）；
// 用户取消不算备份；平台/环境不支持时降级 openDocument 预览
function shareBackupFile(filePath, fileName) {
  if (typeof wx.shareFileMessage !== 'function') {
    openBackupFile(filePath);
    return;
  }
  wx.shareFileMessage({
    filePath,
    fileName,
    success: () => {
      markBackedUp();
      wx.showToast({ title: '已发送', icon: 'success' });
    },
    fail: (err) => {
      const msg = (err && err.errMsg) || '';
      if (msg.indexOf('cancel') >= 0) return;   // 用户取消转发
      console.error('shareFileMessage fail，降级 openDocument', err);
      openBackupFile(filePath);
    }
  });
}

// openDocument 预览（iPhone 可「存储到文件」，预览页菜单可转发）；
// 打开成功即视为完成一次备份（降级口径）
function openBackupFile(filePath) {
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
      markBackedUp();
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
}

// ===== 导入：文件读取与解析 =====

// 把备份文件统一转为 JSON 文本后回调 onText；失败提示并回调 onError
// docx：二进制读取 → 快路径解析，失败降级官方 unzip（覆盖被微信/iOS/Word 重打包的 DEFLATE）
function readBackupFile(filePath, fileName, onText, onError) {
  wx.showLoading({ title: '读取中...' });

  const fs = wx.getFileSystemManager();
  if (docx.isDocxName(fileName)) {
    fs.readFile({
      filePath,
      success: (res) => {
        wx.hideLoading();
        let text = null;
        try {
          text = docx.parseDocx(res.data);
        } catch (e) {
          console.error('docx 快速解析失败，尝试 unzip 兜底', e);
        }
        if (text !== null) {
          onText(text);
          return;
        }
        _parseDocxViaUnzip(filePath, onText, onError);
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('读取文件失败', err);
        wx.showToast({ title: '读取文件失败', icon: 'none' });
        if (typeof onError === 'function') onError();
      }
    });
  } else {
    // txt / json：直接按文本读取
    fs.readFile({
      filePath,
      encoding: 'utf8',
      success: (res) => {
        wx.hideLoading();
        onText(res.data);
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('读取文件失败', err);
        wx.showToast({ title: '读取文件失败', icon: 'none' });
        if (typeof onError === 'function') onError();
      }
    });
  }
}

// docx 兜底解析：官方 unzip 支持 DEFLATE，解压后读 word/document.xml 提取文本
function _parseDocxViaUnzip(filePath, onText, onError) {
  const fs = wx.getFileSystemManager();
  const dir = `${wx.env.USER_DATA_PATH}/backup_unzip`;
  try { fs.rmdirSync(dir, true); } catch (e) { /* 目录不存在，忽略 */ }
  fs.unzip({
    zipFilePath: filePath,
    targetPath: dir,
    success: () => {
      try {
        const xml = fs.readFileSync(`${dir}/word/document.xml`, 'utf8');
        onText(docx.docxXmlToText(xml));
      } catch (e) {
        console.error('unzip 兜底解析失败', e);
        _showDocxParseError();
        if (typeof onError === 'function') onError();
      } finally {
        try { fs.rmdirSync(dir, true); } catch (e2) { /* 清理失败，忽略 */ }
      }
    },
    fail: (err) => {
      console.error('unzip 失败', err);
      _showDocxParseError();
      if (typeof onError === 'function') onError();
    }
  });
}

function _showDocxParseError() {
  wx.showModal({
    title: '解析失败',
    content: '备份文件解析失败，请使用本小程序导出的、未修改过的备份文件。',
    showCancel: false
  });
}

// 解析备份文本 → { ok, data }；失败弹提示并返回 { ok: false }
function parseBackupText(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    wx.showModal({
      title: '解析失败',
      content: 'JSON格式错误，请检查文件内容是否正确',
      showCancel: false
    });
    return { ok: false };
  }

  const isMulti = Array.isArray(data.children) && data.children.length > 0;
  const isV2 = !!(data.checkin_records && Array.isArray(data.checkin_records));
  if (!isMulti && !isV2) {
    wx.showToast({ title: '备份格式无效', icon: 'none' });
    return { ok: false };
  }

  return { ok: true, data, isMulti };
}

// 备份概要（确认框文案用）
function summarizeBackup(data) {
  const isMulti = Array.isArray(data.children) && data.children.length > 0;
  const childCount = isMulti ? data.children.length : 1;
  const recordCount = isMulti
    ? data.children.reduce(
        (n, c) => n + (Array.isArray(c.checkin_records) ? c.checkin_records.length : 0), 0)
    : (Array.isArray(data.checkin_records) ? data.checkin_records.length : 0);
  return { childCount, recordCount };
}

// v2 单孩格式的「导入到哪个孩子」弹层数据
function buildChildPickItems() {
  const list = children.getChildren();
  const activeId = children.getActiveChildId();
  return {
    activeId,
    items: list.map(c => ({
      id: c.id,
      name: c.name,
      initial: String(c.name || '').trim().charAt(0) || '·',
      color: c.color,
      active: c.id === activeId
    }))
  };
}

// ===== 导入：完整流程编排 =====

// 从聊天记录选文件 → 解析 → 确认 → 落库。
// hooks:
//   onNeedPickChild({ data, items, activeId })  v2 单孩格式：请页面弹「导入到哪个孩子」
//   onDone(result)                              流程结束（成功/取消/失败），页面刷新 UI
function startImportFlow(mode, hooks) {
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['txt', 'json', 'docx'],
    success: (res) => {
      const file = res.tempFiles[0];
      if (!file) {
        wx.showToast({ title: '未选择文件', icon: 'none' });
        if (hooks.onDone) hooks.onDone({ ok: false });
        return;
      }
      readBackupFile(file.path, file.name, (text) => {
        _confirmAndImport(text, mode, hooks);
      }, () => {
        if (hooks.onDone) hooks.onDone({ ok: false });
      });
    },
    fail: (err) => {
      if (err && err.errMsg && err.errMsg.indexOf('cancel') >= 0) return;
      wx.showToast({ title: '未选择文件', icon: 'none' });
      if (hooks.onDone) hooks.onDone({ ok: false });
    }
  });
}

function _confirmAndImport(text, mode, hooks) {
  const parsed = parseBackupText(text);
  if (!parsed.ok) {
    if (hooks.onDone) hooks.onDone({ ok: false });
    return;
  }
  const data = parsed.data;
  const modeText = mode === 'merge' ? '合并式导入' : '覆盖式导入';

  // v3 多孩格式：整体恢复（每个孩子按名字与本机合并/新建），不弹选孩子
  if (parsed.isMulti) {
    const { childCount, recordCount } = summarizeBackup(data);
    wx.showModal({
      title: '确认导入',
      content: `备份包含 ${childCount} 个孩子、${recordCount} 条打卡记录，${modeText}，是否继续？`,
      confirmText: '导入',
      cancelText: '取消',
      confirmColor: '#07C160',
      success: (modalRes) => {
        if (modalRes.confirm) {
          const skipped = importAllChildren(data.children, mode, data);
          if (hooks.onDone) hooks.onDone({ ok: true, skipped });
        }
        // 取消：视为放弃，不回调 onDone（页面无需刷新）
      }
    });
    return;
  }

  // v2 单孩格式：交给页面弹「导入到哪个孩子」
  const pick = buildChildPickItems();
  if (hooks.onNeedPickChild) {
    hooks.onNeedPickChild({ data, items: pick.items, activeId: pick.activeId });
  }
}

// 从备份文本导入（云恢复复用）：解析 → 确认弹窗 → 落库，与文件导入同一套流程
function importFromText(text, mode, hooks) {
  _confirmAndImport(text, mode, hooks)
}

// v2 单孩格式：页面弹层确认后调用，落到所选孩子名下
function confirmImportToChild(pendingData, mode, targetId, hooks) {
  if (!pendingData || !targetId) return;
  importToChild(pendingData, mode, targetId);
  const hit = children.getChildren().find(c => c.id === targetId);
  wx.showToast({
    title: `已导入到${hit ? hit.name : '所选孩子'}`,
    icon: 'success'
  });
  if (hooks && hooks.onDone) hooks.onDone({ ok: true });
}

// ===== 导入：落库（纯逻辑，无 UI） =====

// v3 整体恢复：逐个孩子按名字匹配（无则新建），临时切换导入，finally 恢复原当前孩子。
// 覆盖模式（overwrite）：孩子集合以快照为准——清空本机后恢复不能残留旧孩子
//   （如清缓存后重建的默认孩子）。导入前后各清一轮多余孩子：第一轮受「至少保留
//   一个」下限保护可能删不动，新建快照孩子后第二轮补删。
// 返回跳过的孩子数
function importAllChildren(childrenArr, mode, rawData) {
  wx.showLoading({ title: '导入中...' });
  const prevActiveId = children.getActiveChildId();
  let skipped = 0;
  let imported = 0;
  const keepNames = new Set(
    childrenArr.filter(c => c && c.name).map(c => String(c.name))
  );
  const removeExtraChildren = () => {
    if (mode !== 'overwrite' || keepNames.size === 0 || imported === 0) return;
    children.getChildren()
      .filter(x => !keepNames.has(x.name))
      .forEach(x => children.removeChild(x.id)); // 下限保护触发时内部拒绝，忽略即可
  };
  try {
    removeExtraChildren();
    childrenArr.forEach((c) => {
      if (!c || !c.name) { skipped++; return; }
      let hit = children.getChildren().find(x => x.name === c.name);
      if (!hit) {
        const res = children.addChild(c.name);
        if (!res.ok) { skipped++; return; }   // 名字非法/已达上限：跳过该孩子
        hit = res.child;
      }
      children.switchChild(hit.id);
      _applyChildData(c, mode);
      imported++;
    });
    removeExtraChildren();

    // 全局（家庭级）设置只恢复一次
    if (rawData) _applyGlobalData(rawData);
  } finally {
    if (prevActiveId && children.getChildren().some(x => x.id === prevActiveId)) {
      children.switchChild(prevActiveId);
    }
  }

  wx.hideLoading();
  wx.showToast({
    title: skipped > 0 ? `导入成功（${skipped} 个孩子跳过）` : '导入成功',
    icon: skipped > 0 ? 'none' : 'success'
  });
  return skipped;
}

// v2 单孩格式：临时切换到所选孩子执行导入，完成后切回原当前孩子
function importToChild(data, mode, targetId) {
  const prevActiveId = children.getActiveChildId();
  children.switchChild(targetId);
  try {
    _applyChildData(data, mode);
    _applyGlobalData(data);
  } finally {
    if (prevActiveId !== targetId) children.switchChild(prevActiveId);
  }
}

// 将备份中「单个孩子」的数据落到当前孩子（v2 顶层字段 / v3 children[i] 同构复用）
function _applyChildData(data, mode = 'overwrite') {
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
}

// 全局（家庭级）设置：默认备注 + 熏听开关；字体档位已跟随微信设置，旧字段有意忽略
function _applyGlobalData(data) {
  if (data.checkin_default_remark) {
    wx.setStorageSync(checkin.DEFAULT_REMARK_KEY, data.checkin_default_remark);
  }
  if (typeof data.listening_enabled === 'boolean') {
    checkin.setListeningEnabled(data.listening_enabled);
  }
}

module.exports = {
  getLastBackupTime,
  markBackedUp,
  clearLastBackupIf,
  getLastBackupText,
  shouldRemind,
  getRemindText,
  shouldShowHomeTip,
  dismissReminder,
  shouldShowGuide,
  markGuideShown,
  generateBackupFile,
  shareBackupFile,
  openBackupFile,
  startImportFlow,
  importFromText,
  collectBackupJson,
  confirmImportToChild
}
