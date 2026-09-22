// 大循环路线数据（源自根目录 qingba_big_loop_route.json 官方存档，仅作溯源；
// 本文件为格式化终稿，与存档结构不同、无需同步）
// 与常规路线 data.js 同构：数据即运行时终稿——
//   1) 官方 sub_stages 已拍平为 9 个独立阶段（前置→一→调整牛1-3→标准牛4-6→三阶段），
//      二阶段 tips 已按内容归属拆到各小段（切入方法各归牛1/2/3，小段摘要归牛4-6）
//   2) resources 直用标准分组 key：分组顺序（GROUP_ORDER）、名称（resourceLabels）、
//      阶段页色点（rg-dot-<key>）与常规路线完全同源
//   3) 素材 id = 素材名（历史存储兼容，勿改 id）
// tips 文案中「**…**」为行内高亮标记（对应官方素材红字标注），由 toKeyPoints 解析为片段

// 「**…**」→ 行内片段 [{t, hi}]：split 交替产生普通/高亮段（奇数位为高亮）
function parseHiSegments(text) {
  const segs = []
  String(text).split('**').forEach((part, i) => {
    if (part) segs.push({ t: part, hi: i % 2 === 1 })
  })
  return segs
}

// tips [{text, children?}] → key_points 条目（children 展平；text 保留去标记纯文本兜底）
function toKeyPoints(tips) {
  const out = []
  ;(tips || []).forEach(t => {
    const raw = String(t.text || '')
    out.push({ text: raw.replace(/\*\*/g, ''), segments: parseHiSegments(raw) })
    ;(t.children || []).forEach(c => {
      const ctext = String(c)
      out.push({ text: ctext.replace(/\*\*/g, ''), segments: parseHiSegments(ctext) })
    })
  })
  return out
}

// 历史 key 归一字典：「中文标准名→标准 key」，resources.js 迁移历史自定义资源用；
// 表外 key（含第一阶段原名）直通
const GROUP_KEY_ALIAS = {
  '主线绘本': 'main_picture_books',
  '主线分级': 'main_graded_readers',
  '主线动画': 'main_animations',
  '辅线分级': 'sub_graded_readers',
  '辅线动画': 'sub_animations',
  '趣味拓展': 'fun_extensions',
  '融合App': 'fusion_apps'
}

module.exports = {
  id: 'bigloop',
  GROUP_KEY_ALIAS,
  name: '大循环路线',
  // 首页欢迎卡文案：起点 = 前置阶段，终点 = 主线末段三阶段（与常规路线 journeyText 同构）
  journeyText: '记录每天的英语听力投入，陪孩子从前置阶段一路走到第三阶段（牛7-9）',
  stages: [
    // ===== 前置阶段 =====
    {
      "stage_id": "big_loop_pre",
      "stage_name": "前置阶段",
      "vocabulary_target": "200-300词",
      "time_investment": "50-60H",
      "target_phase": "phase5",
      "entry_requirement": "零基础",
      "promotion_standard": "时间满足且小小优趣稳定新版phase5",
      "optional": false,
      "prev_stage_ids": [],
      "resources": {
        "main_animations": [
          { "id": "Wow English（S1-3）", "name": "Wow English（S1-3）" },
          { "id": "Muzzy（第1-6集）", "name": "Muzzy（第1-6集）" },
          { "id": "动物王国大冒险", "name": "动物王国大冒险" },
          { "id": "亚克迪", "name": "亚克迪" },
          { "id": "清华幼儿英语启蒙", "name": "清华幼儿英语启蒙" }
        ],
        "main_picture_books": [
          { "id": "古力小超人", "name": "古力小超人" },
          { "id": "古力与朋友们", "name": "古力与朋友们" },
          { "id": "QPlay奇问妙想国", "name": "QPlay奇问妙想国" },
          { "id": "WPlay词汇妙趣国", "name": "WPlay词汇妙趣国" }
        ],
        "main_graded_readers": [
          { "id": "培生启明星L1", "name": "培生启明星L1" },
          { "id": "培生词汇妙趣屋L1-2", "name": "培生词汇妙趣屋L1-2" },
          { "id": "Super hammy A-B", "name": "Super hammy A-B" },
          { "id": "Buddy Reader A-B", "name": "Buddy Reader A-B" }
        ],
        "sub_graded_readers": [
          { "id": "大猫L1（虚构）", "name": "大猫L1（虚构）" },
          { "id": "RAZ AA-A（虚构）", "name": "RAZ AA-A（虚构）" },
          { "id": "小书虫L1", "name": "小书虫L1" }
        ],
        "sub_animations": [
          { "id": "Wow学练机（喜欢Wow动画优选）", "name": "Wow学练机（喜欢Wow动画优选）" },
          { "id": "Muzzy大橙盒（喜欢Muzzy动画可选）", "name": "Muzzy大橙盒（喜欢Muzzy动画可选）" }
        ],
        "fusion_apps": [
          { "id": "小小优趣成长计划Phase1-4", "name": "小小优趣成长计划Phase1-4" }
        ]
      },
      "key_points": toKeyPoints([
        { "text": "大循环前置阶段非常关键，**如果孩子是0基础**，庆爸提醒家长们，**一定不能跳过前置阶段**。" },
        { "text": "前置阶段其实和常规路径的第一阶段**素材一样**，都是以入门级别为主。" },
        { "text": "前置阶段可用**汪培珽亲子共读法**，可缓解中文强势。" },
        { "text": "庆爸建议，前置阶段投入时长**至少50-60小时**，如果用了汪培珽的亲子共读法（一句英文，一句中文），以投入**60小时**以上为最佳，但也不用超过**80小时**。" },
        { "text": "其中亲子共读和看动画，**孩子只要相对专注，且素材不超难度，可按照1:1**的时间统计；该阶段**听音频效率低，可尝试听，但不计入时间**。（为确保效果，亲子共读用时占比建议**不低于50%**）" },
        { "text": "**零基础动画一定要选**，4-6岁优先尝试Wow，7岁+优先尝试Muzzy，如果都切不进去，可试试其他推荐！动画是最容易切入的形式！若喜欢Wow，建议搭配官方学练机，有效巩固基础词！若喜欢Muzzy，也可考虑官方台词本（muzzy大橙盒）！" },
        { "text": "4-6岁，**优先尝试古力小超人1**（试错成本低）！风格和Super Hammy及Buddy Reader里的Super Chick小系列类似，如果古力1能成功切入，小分级和古力其他系列也容易，分步加入风险低。" },
        { "text": "7岁+，也可先尝试第二步，或直接从分级切入，除了以上推荐，还可试试家里已有其他入门分级。" }
      ])
    },
    // ===== 第一阶段 =====
    {
      "stage_id": "big_loop_1",
      "stage_name": "第一阶段",
      "vocabulary_target": "800+词",
      "time_investment": "60-80H",
      "target_phase": "phase12",
      "entry_requirement": "phase5",
      "promotion_standard": "牛1-6三遍亲子共读完成后且小小优趣稳定新版phase12",
      "optional": false,
      "prev_stage_ids": ["big_loop_pre"],
      "resources": {
        "main_animations": [
          { "id": "Wow English（S1-5）", "name": "Wow English（S1-5）" },
          { "id": "Muzzy（第1-12集）", "name": "Muzzy（第1-12集）" },
          { "id": "动物王国大冒险", "name": "动物王国大冒险" },
          { "id": "亚克迪", "name": "亚克迪" },
          { "id": "清华幼儿英语启蒙", "name": "清华幼儿英语启蒙" }
        ],
        "main_graded_readers": [
          { "id": "牛津树L1-6", "name": "牛津树L1-6" }
        ],
        "sub_graded_readers": [
          { "id": "典范英语1a-5b（合订本正版）", "name": "典范英语1a-5b（合订本正版）" }
        ],
        "fun_extensions": [
          { "id": "Muzzy大橙盒（喜欢Muzzy动画可选）", "name": "Muzzy大橙盒（喜欢Muzzy动画可选）" },
          { "id": "蓝色小考拉", "name": "蓝色小考拉" },
          { "id": "绿森林", "name": "绿森林" }
        ],
        "fusion_apps": [
          { "id": "小小优趣成长计划Phase1-4", "name": "小小优趣成长计划Phase1-4" }
        ]
      },
      "key_points": toKeyPoints([
        { "text": "大循环第一阶段**只需一套素材**，就是牛津树校园拓展版的牛1-6，**需整体亲子共读3遍**，这个是第一阶段的绝对核心。" },
        { "text": "如果买不到毛毛虫版本的牛津树，可以考虑用典范英语替代，可剔除里面的家庭版和DD部分。" },
        { "text": "如果家长**想加入其他素材，优先推荐动画**，和大循环的亲子共读没有冲突，动画选择可参考一阶段的素材，当然不加动画也完全没有问题。" },
        { "text": "**不建议加入其他纸质类素材**，因为会占用牛津树的三遍时间，不如抓紧时间将大循环三遍做完。" },
        { "text": "大循环一阶段，孩子听音频能力较弱，所以可不听音频，如果一定要听，建议听动画音频。" }
      ])
    },
    // ===== 第二阶段·调整支线（切入补救，可选；互相不构成链，prev 均指一阶段）=====
    {
      "stage_id": "big_loop_2_adjust_niu1",
      "stage_name": "第二阶段（调整·牛1）",
      "vocabulary_target": "",
      "time_investment": "",
      "target_phase": "phase7-8",
      "entry_requirement": "phase2-6",
      "promotion_standard": "小小优趣稳定新版phase7-8，牛1：(调整用时/7)*1，牛2：(调整用时/7)*2，牛3：(调整用时/7)*4",
      "optional": true,
      "prev_stage_ids": ["big_loop_1"],
      "resources": {
        "main_picture_books": [
          { "id": "古力小超人", "name": "古力小超人" },
          { "id": "古力与朋友们", "name": "古力与朋友们" },
          { "id": "QPlay奇问妙想国", "name": "QPlay奇问妙想国" }
        ],
        "main_graded_readers": [
          { "id": "培生启明星L1", "name": "培生启明星L1" },
          { "id": "培生词汇妙趣屋L1-2", "name": "培生词汇妙趣屋L1-2" },
          { "id": "Super hammy A-B", "name": "Super hammy A-B" },
          { "id": "Buddy Reader A-B", "name": "Buddy Reader A-B" }
        ],
        "main_animations": [
          { "id": "Wow English（S1-3）", "name": "Wow English（S1-3）" },
          { "id": "Muzzy（第1-6集）", "name": "Muzzy（第1-6集）" }
        ],
        "sub_graded_readers": [
          { "id": "大猫L1（虚构）", "name": "大猫L1（虚构）" },
          { "id": "RAZ AA-A（虚构）", "name": "RAZ AA-A（虚构）" }
        ],
        "sub_animations": [
          { "id": "Wow学练机（喜欢Wow动画优选）", "name": "Wow学练机（喜欢Wow动画优选）" },
          { "id": "动物王国大冒险", "name": "动物王国大冒险" },
          { "id": "清华幼儿英语", "name": "清华幼儿英语" },
          { "id": "3S动画儿歌", "name": "3S动画儿歌" },
          { "id": "Muzzy大橙盒", "name": "Muzzy大橙盒" }
        ],
        "fun_extensions": [
          { "id": "小书虫L1", "name": "小书虫L1" }
        ],
        "fusion_apps": [
          { "id": "小小优趣成长计划Phase1-4（非测试级别）", "name": "小小优趣成长计划Phase1-4（非测试级别）" }
        ]
      },
      "key_points": toKeyPoints([
        { "text": "大循环第二阶段调整策略并非所有孩子都需用到，恰恰相反，如果前置阶段基础很扎实，95%的孩子是用不到这个阶段的，或者只需要用**牛3小段**进行短时微调整！" },
        { "text": "如果一阶段结束，小小优趣测试结果在新版phase12+，直接跳过page8-12的内容！" },
        { "text": "调整策略时间计算公式：**大循环二阶段调整策略用时=120小时-前置阶段用时-大循环一阶段用时**" },
        {
          "text": "大循环二阶段调整策略切入方法：",
          "children": [
            "情况1：**小小优趣新版Phase2-6** → 从牛1小段切入；其中牛1小段投入时间：（调整策略用时/7）*1；牛2小段投入时间：（调整策略用时/7）*2；牛3小段投入时间：（调整策略用时/7）*4"
          ]
        },
        { "text": "二阶段调整策略思路很简单，如果前置阶段+大循环第一阶段，总时间不够120小时，那么测试结果不达标就是时间不足引起的，将时间补上，大概率就达标了。若有进步但仍不达标，可再增加牛3小段时间。" },
        { "text": "如果本身已经够120小时或已经补足了120小时，但孩子的测试结果依旧没有进步，庆爸建议转常规，很可能孩子是那种无法跨难度内化的类型，这类孩子比较少见！" }
      ])
    },
    {
      "stage_id": "big_loop_2_adjust_niu2",
      "stage_name": "第二阶段（调整·牛2）",
      "vocabulary_target": "",
      "time_investment": "",
      "target_phase": "phase9-10",
      "entry_requirement": "phase7-8",
      "promotion_standard": "小小优趣稳定新版phase9-10，牛2：(调整用时/3)*1，牛3：(调整用时/3)*2",
      "optional": true,
      "prev_stage_ids": ["big_loop_1"],
      "resources": {
        "main_picture_books": [
          { "id": "WPlay词汇妙趣国", "name": "WPlay词汇妙趣国" }
        ],
        "main_graded_readers": [
          { "id": "牛津树L1-2", "name": "牛津树L1-2" },
          { "id": "培生启明星L2", "name": "培生启明星L2" },
          { "id": "培生词汇妙趣屋L3", "name": "培生词汇妙趣屋L3" },
          { "id": "Super hammy C-D", "name": "Super hammy C-D" },
          { "id": "Buddy Reader C-D", "name": "Buddy Reader C-D" }
        ],
        "main_animations": [
          { "id": "Wow English（S4-5）", "name": "Wow English（S4-5）" },
          { "id": "Muzzy（第7-12集）", "name": "Muzzy（第7-12集）" }
        ],
        "sub_graded_readers": [
          { "id": "大猫L2（虚构）", "name": "大猫L2（虚构）" },
          { "id": "RAZ B（虚构）", "name": "RAZ B（虚构）" }
        ],
        "sub_animations": [
          { "id": "Wow学练机（喜欢Wow动画优选）", "name": "Wow学练机（喜欢Wow动画优选）" },
          { "id": "动物王国大冒险", "name": "动物王国大冒险" },
          { "id": "趣趣知知鸟", "name": "趣趣知知鸟" },
          { "id": "Muzzy大橙盒", "name": "Muzzy大橙盒" }
        ],
        "fun_extensions": [
          { "id": "小书虫L2", "name": "小书虫L2" }
        ],
        "fusion_apps": [
          { "id": "小小优趣成长计划Phase 5-7（非测试级别）", "name": "小小优趣成长计划Phase 5-7（非测试级别）" }
        ]
      },
      "key_points": toKeyPoints([
        {
          "text": "情况2：**小小优趣新版Phase7-8**",
          "children": [
            "从牛2小段切入；牛2小段投入时间：（调整策略用时/3）*1；牛3小段投入时间：（调整策略用时/3）*2"
          ]
        }
      ])
    },
    {
      "stage_id": "big_loop_2_adjust_niu3",
      "stage_name": "第二阶段（调整·牛3）",
      "vocabulary_target": "",
      "time_investment": "",
      "target_phase": "phase12",
      "entry_requirement": "phase9-10",
      "promotion_standard": "小小优趣稳定新版phase12，牛3：(调整用时/1)*1",
      "optional": true,
      "prev_stage_ids": ["big_loop_1"],
      "resources": {
        "main_picture_books": [
          { "id": "饼干狗", "name": "饼干狗" },
          { "id": "小猪小象（简单部分）", "name": "小猪小象（简单部分）" }
        ],
        "main_graded_readers": [
          { "id": "牛津树L3", "name": "牛津树L3" },
          { "id": "培生启明星L3", "name": "培生启明星L3" },
          { "id": "Super hammy E-F", "name": "Super hammy E-F" },
          { "id": "Buddy Reader E-F", "name": "Buddy Reader E-F" },
          { "id": "大猫L3（虚构）", "name": "大猫L3（虚构）" }
        ],
        "main_animations": [
          { "id": "Little Fox L1 绿森林", "name": "Little Fox L1 绿森林" },
          { "id": "The Blobs", "name": "The Blobs" },
          { "id": "3S动画儿歌（小小优趣版L1-3）", "name": "3S动画儿歌（小小优趣版L1-3）" }
        ],
        "sub_graded_readers": [
          { "id": "RAZ C-D（虚构）", "name": "RAZ C-D（虚构）" },
          { "id": "口语剧场（Part 1）", "name": "口语剧场（Part 1）" }
        ],
        "sub_animations": [
          { "id": "蓝色小考拉", "name": "蓝色小考拉" },
          { "id": "小鼠波波", "name": "小鼠波波" },
          { "id": "小羊提米", "name": "小羊提米" }
        ],
        "fun_extensions": [
          { "id": "小书虫L3", "name": "小书虫L3" },
          { "id": "培生儿童L3", "name": "培生儿童L3" },
          { "id": "培生400句上", "name": "培生400句上" },
          { "id": "Best Buddies（学乐橡子系列）", "name": "Best Buddies（学乐橡子系列）" }
        ],
        "fusion_apps": [
          { "id": "小小优趣成长计划Phase 8-9（非测试级别）", "name": "小小优趣成长计划Phase 8-9（非测试级别）" }
        ]
      },
      "key_points": toKeyPoints([
        {
          "text": "情况3：**小小优趣新版Phase9-10**",
          "children": [
            "从牛3小段切入；牛3小段投入时间=调整策略用时"
          ]
        }
      ])
    },
    // ===== 第二阶段·标准主线（必经，牛4→5→6 成链）=====
    {
      "stage_id": "big_loop_2_standard_niu4",
      "stage_name": "第二阶段（标准·牛4）",
      "vocabulary_target": "1000词",
      "time_investment": "90H",
      "target_phase": "phase14",
      "entry_requirement": "phase12",
      "promotion_standard": "时间满足且小小优趣稳定新版phase14",
      "optional": false,
      "prev_stage_ids": ["big_loop_1"],
      "resources": {
        "main_picture_books": [
          { "id": "小猪小象（难的部分）", "name": "小猪小象（难的部分）" },
          { "id": "波西与皮普", "name": "波西与皮普" },
          { "id": "佩奇高频词绘本L1-3", "name": "佩奇高频词绘本L1-3" }
        ],
        "main_graded_readers": [
          { "id": "牛津树L4", "name": "牛津树L4" },
          { "id": "培生启明星L4", "name": "培生启明星L4" },
          { "id": "快乐瓢虫L1", "name": "快乐瓢虫L1" }
        ],
        "main_animations": [
          { "id": "Little Fox L1选2-3部（Bat | Dino | Tire）", "name": "Little Fox L1选2-3部（Bat | Dino | Tire）" }
        ],
        "sub_graded_readers": [
          { "id": "大猫L4（虚构）", "name": "大猫L4（虚构）" },
          { "id": "RAZ E-F（虚构）", "name": "RAZ E-F（虚构）" },
          { "id": "I can read预备级（挑选）", "name": "I can read预备级（挑选）" },
          { "id": "口语剧场（Part 2）", "name": "口语剧场（Part 2）" }
        ],
        "sub_animations": [
          { "id": "道奇", "name": "道奇" }
        ],
        "fun_extensions": [
          { "id": "小书虫L4（虚构）", "name": "小书虫L4（虚构）" },
          { "id": "培生儿童L4", "name": "培生儿童L4" },
          { "id": "培生400句下", "name": "培生400句下" }
        ],
        "fusion_apps": [
          { "id": "小小优趣成长计划Phase 10-11（非测试级别）", "name": "小小优趣成长计划Phase 10-11（非测试级别）" }
        ]
      },
      "key_points": toKeyPoints([
        { "text": "大循环二阶段标准策略其实和常规路径4-6阶段的素材一模一样，但需要投入的时间更多，主要原因是大循环前置+一阶段投入的时间比较少，所以为了确保后续进阶顺利，需在大循环二阶段标准策略补回来。" }
      ])
    },
    {
      "stage_id": "big_loop_2_standard_niu5",
      "stage_name": "第二阶段（标准·牛5）",
      "vocabulary_target": "1200词",
      "time_investment": "80H",
      "target_phase": "phase16",
      "entry_requirement": "phase14",
      "promotion_standard": "时间满足且小小优趣稳定新版phase16",
      "optional": false,
      "prev_stage_ids": ["big_loop_2_standard_niu4"],
      "resources": {
        "main_picture_books": [
          { "id": "皮特猫（My First）", "name": "皮特猫（My First）" },
          { "id": "小毛人（My First）", "name": "小毛人（My First）" },
          { "id": "佩奇高频词绘本L4-5", "name": "佩奇高频词绘本L4-5" }
        ],
        "main_graded_readers": [
          { "id": "牛津树L5", "name": "牛津树L5" },
          { "id": "培生启明星L5", "name": "培生启明星L5" },
          { "id": "快乐瓢虫L2", "name": "快乐瓢虫L2" }
        ],
        "main_animations": [
          { "id": "Little Fox L2任选2部（Bird | 彼得兔 | 马克笔）", "name": "Little Fox L2任选2部（Bird | 彼得兔 | 马克笔）" },
          { "id": "小猪佩奇S1-2（也可加在牛6小段）", "name": "小猪佩奇S1-2（也可加在牛6小段）" }
        ],
        "sub_graded_readers": [
          { "id": "大猫L5（虚构）", "name": "大猫L5（虚构）" },
          { "id": "RAZ G-H（虚构）", "name": "RAZ G-H（虚构）" },
          { "id": "I can read基础级（挑选）", "name": "I can read基础级（挑选）" }
        ],
        "fun_extensions": [
          { "id": "小书虫L5（虚构）", "name": "小书虫L5（虚构）" },
          { "id": "培生儿童L5", "name": "培生儿童L5" },
          { "id": "外星人猎手（漫画）", "name": "外星人猎手（漫画）" },
          { "id": "魔幻历险记（漫画）", "name": "魔幻历险记（漫画）" }
        ],
        "fusion_apps": [
          { "id": "小小优趣成长计划Phase 12（非测试级别）", "name": "小小优趣成长计划Phase 12（非测试级别）" }
        ]
      },
      "key_points": toKeyPoints([
        { "text": "大循环二阶段标准策略其实和常规路径4-6阶段的素材一模一样，但需要投入的时间更多，主要原因是大循环前置+一阶段投入的时间比较少，所以为了确保后续进阶顺利，需在大循环二阶段标准策略补回来。" }
      ])
    },
    {
      "stage_id": "big_loop_2_standard_niu6",
      "stage_name": "第二阶段（标准·牛6）",
      "vocabulary_target": "1500词",
      "time_investment": "80H",
      "target_phase": "phase18",
      "entry_requirement": "phase16",
      "promotion_standard": "时间满足且小小优趣稳定新版phase18",
      "optional": false,
      "prev_stage_ids": ["big_loop_2_standard_niu5"],
      "resources": {
        "main_picture_books": [
          { "id": "汪培珽一段Syd Hoff系列", "name": "汪培珽一段Syd Hoff系列" },
          { "id": "小猪佩奇（红黄蓝）盒", "name": "小猪佩奇（红黄蓝）盒" }
        ],
        "main_graded_readers": [
          { "id": "牛津树L6", "name": "牛津树L6" },
          { "id": "培生启明星L6", "name": "培生启明星L6" },
          { "id": "快乐瓢虫L3", "name": "快乐瓢虫L3" }
        ],
        "main_animations": [
          { "id": "小猪佩奇S3-5（S1-2没看的话，可从S1开始，S3开始尝试裸听+回看+复听）", "name": "小猪佩奇S3-5（S1-2没看的话，可从S1开始，S3开始尝试裸听+回看+复听）" }
        ],
        "sub_graded_readers": [
          { "id": "大猫L6（虚构）", "name": "大猫L6（虚构）" },
          { "id": "RAZ I-J（虚构）", "name": "RAZ I-J（虚构）" },
          { "id": "I can read基础", "name": "I can read基础" }
        ],
        "sub_animations": [
          { "id": "Little Fox L3经典故事", "name": "Little Fox L3经典故事" }
        ],
        "fun_extensions": [
          { "id": "小书虫L6（虚构）", "name": "小书虫L6（虚构）" },
          { "id": "培生儿童L6", "name": "培生儿童L6" },
          { "id": "丽声冒险岛L1-3", "name": "丽声冒险岛L1-3" },
          { "id": "Fly guy", "name": "Fly guy" }
        ],
        "fusion_apps": [
          { "id": "小小优趣成长计划Phase 13（非测试级别）", "name": "小小优趣成长计划Phase 13（非测试级别）" }
        ]
      },
      "key_points": toKeyPoints([
        { "text": "大循环二阶段标准策略其实和常规路径4-6阶段的素材一模一样，但需要投入的时间更多，主要原因是大循环前置+一阶段投入的时间比较少，所以为了确保后续进阶顺利，需在大循环二阶段标准策略补回来。" }
      ])
    },
    // ===== 第三阶段 =====
    {
      "stage_id": "big_loop_3",
      "stage_name": "第三阶段（牛7-9）",
      "vocabulary_target": "",
      "time_investment": "80H+",
      "target_phase": "phase18",
      "entry_requirement": "phase18，最好可裸听佩奇",
      "promotion_standard": "时间满足且佩奇可裸听",
      "optional": false,
      "prev_stage_ids": ["big_loop_2_standard_niu6"],
      "resources": {
        "main_picture_books": [
          { "id": "大红狗", "name": "大红狗" },
          { "id": "胖龙蓝蓝", "name": "胖龙蓝蓝" },
          { "id": "青蛙蟾蜍", "name": "青蛙蟾蜍" },
          { "id": "Frog and Friends", "name": "Frog and Friends" },
          { "id": "女巫温妮（绘本版）", "name": "女巫温妮（绘本版）" }
        ],
        "main_graded_readers": [
          { "id": "牛津树L7-9", "name": "牛津树L7-9" },
          { "id": "培生启明星L7-8", "name": "培生启明星L7-8" },
          { "id": "快乐瓢虫L4", "name": "快乐瓢虫L4" }
        ],
        "main_animations": [
          { "id": "小猪佩奇S4-5（裸听）", "name": "小猪佩奇S4-5（裸听）" }
        ],
        "sub_graded_readers": [
          { "id": "大猫L7-9（虚构）", "name": "大猫L7-9（虚构）" },
          { "id": "RAZ K-M（虚构）", "name": "RAZ K-M（虚构）" }
        ],
        "sub_animations": [
          { "id": "Little Fox L3（魔法师和猫 | 柳林风声）", "name": "Little Fox L3（魔法师和猫 | 柳林风声）" },
          { "id": "卡由", "name": "卡由" },
          { "id": "本霍丽", "name": "本霍丽" },
          { "id": "天才宝贝熊", "name": "天才宝贝熊" },
          { "id": "64动物街", "name": "64动物街" },
          { "id": "鸣米123", "name": "鸣米123" }
        ],
        "fun_extensions": [
          { "id": "小书虫L7-10（虚构）", "name": "小书虫L7-10（虚构）" },
          { "id": "丽声冒险岛L4-7", "name": "丽声冒险岛L4-7" }
        ]
      },
      "key_points": []
    }
  ]
}
