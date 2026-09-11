// 听力训练路线数据，源自 qingba_listening_route.json
// 注意：运行时只读取本文件（该 JSON 已被打包排除），
// 若修改路线数据，请同步更新根目录的 qingba_listening_route.json，避免两份数据漂移
const routeData = {
  "route_name": "庆爸听力线 常规路径（2.0版）",
  "age_group": "3-4岁",
  "total_stages": 7,
  "overview": {
    "description": "3-4岁孩子英语听力训练常规路线，共7个阶段（常规1-6 + 准桥梁）",
    "key_principles": [
      "把握住孩子的听力水平",
      "匹配好符合孩子水平的素材",
      "在方法对用的前提下，将时间投入到位"
    ],
    "core_standard": "时间投入是最核心的标准，甚至可当作唯一晋级标准。若时间投入不够，即使测试结果达标也需谨慎晋级；若时间投入到位且测试结果达标，则可放心晋级。"
  },
  "methods": {
    "method_1_parent_child_reading": {
      "name": "亲子共读",
      "standard_operation": "孩子专注看图听音，家长读英文（或用点读笔）",
      "warnings": [
        "不能让孩子跟读、指读、复述，也不要问孩子问题",
        "如果孩子认字，必须把文字遮住",
        "尽量选择放松场景，保持无压+高兴趣+高专注度"
      ],
      "notes": {
        "v2_update": "不再强制某一素材重复3遍，只要孩子喜欢就可多重复（不设上限）；若孩子腻了，可横向同级别更换其他素材",
        "wang_pei_ting_method": "若使用汪培珽亲子共读法，每阶段时间需按80H计算"
      }
    },
    "method_2_watching_animation": {
      "name": "看动画",
      "standard_operation": "选择与难度贴近的动画，每天20-30分钟。常规4之前可只看不听或少量听；鼓励孩子重复观看喜欢的素材，不限制遍数",
      "warnings": [
        "若孩子对文字敏感，必须选无字幕版本，或物理遮挡字幕",
        "观看时不要打断、逐句翻译或考察孩子是否听懂"
      ],
      "notes": {
        "xiaoxiao_youqu_growth_plan": "phase13及以前的可以参考推荐级别，phase13以后难度拔高太多需谨慎",
        "audio_difficulty": "若听音频觉得难，可先看动画台词本建立画面联想"
      }
    },
    "method_3_listening_audio": {
      "name": "听音频",
      "standard_operation": "将读过的分级、看过的动画音频让孩子听（动画音频切入成功率更高）",
      "warnings": [
        "听音频需脱离画面、靠声音回忆，牛4前孩子语法未通有难度",
        "孩子不必完全专注，环境安静且无频繁动脑事件即可算有效输入"
      ]
    }
  },
  "stages": [
    {
      "stage_id": "regular_1",
      "stage_name": "常规1",
      "vocabulary_target": "200-300词",
      "time_investment": "60-80H",
      "target_phase": "phase5",
      "entry_requirement": "零基础",
      "promotion_standard": "时间满足且小小优趣稳定新版phase5",
      "resources": {
        "main_picture_books": [
          { "id": "o_r1_mpb_01", "name": "古力小超人" },
          { "id": "o_r1_mpb_02", "name": "古力与朋友们" },
          { "id": "o_r1_mpb_03", "name": "巴塔木口语书" },
          { "id": "o_r1_mpb_04", "name": "QPlay奇问妙想国" }
        ],
        "main_graded_readers": [
          { "id": "o_r1_mgr_01", "name": "培生启明星L1" },
          { "id": "o_r1_mgr_02", "name": "培生词汇妙趣屋L1-2" },
          { "id": "o_r1_mgr_03", "name": "Super hammy A-B" },
          { "id": "o_r1_mgr_04", "name": "Buddy Reader A-B" }
        ],
        "main_animations": [
          { "id": "o_r1_ma_01", "name": "Wow English（S1-3）" },
          { "id": "o_r1_ma_02", "name": "Muzzy（1-6集）" }
        ],
        "sub_graded_readers": [
          { "id": "o_r1_sgr_01", "name": "大猫L1（虚构）" },
          { "id": "o_r1_sgr_02", "name": "RAZ AA-A（虚构）" }
        ],
        "sub_animations": [
          { "id": "o_r1_sa_01", "name": "Wow学练机（喜欢Wow选）" },
          { "id": "o_r1_sa_02", "name": "动物国王大冒险" },
          { "id": "o_r1_sa_03", "name": "清华幼儿英语启蒙动画" }
        ],
        "fun_extensions": [
          { "id": "o_r1_fe_01", "name": "小书虫L1" }
        ],
        "fusion_apps": [
          { "id": "o_r1_fa_01", "name": "小小优趣成长计划Phase1-4" }
        ]
      },
      "key_points": [
        { "text": "动画为零基础无门槛，若有小小优趣SVIP建议从phase1开始", "highlighted": false },
        { "text": "3-4岁孩子建议优先尝试从古力小超人切入", "highlighted": true },
        { "text": "若觉得幼稚，可直接从培生词汇妙趣屋切入（句型重复度高，虚构类故事易接受）", "highlighted": false },
        { "text": "Super Hammy和Buddy Reader作为英雄题材也可成功切入", "highlighted": true },
        { "text": "培生启明星L1作为经典分级推荐加入", "highlighted": false }
      ]
    },
    {
      "stage_id": "regular_2",
      "stage_name": "常规2",
      "vocabulary_target": "300-500词",
      "time_investment": "60-80H",
      "target_phase": "phase8",
      "entry_requirement": "phase5",
      "promotion_standard": "时间满足且小小优趣稳定新版phase8",
      "resources": {
        "main_picture_books": [
          { "id": "o_r2_mpb_01", "name": "WPlay词汇妙趣国" }
        ],
        "main_graded_readers": [
          { "id": "o_r2_mgr_01", "name": "牛津树L1-2" },
          { "id": "o_r2_mgr_02", "name": "培生启明星L2" },
          { "id": "o_r2_mgr_03", "name": "培生词汇妙趣屋L3" },
          { "id": "o_r2_mgr_04", "name": "Super hammy C-D" },
          { "id": "o_r2_mgr_05", "name": "Buddy Reader C-D" }
        ],
        "main_animations": [
          { "id": "o_r2_ma_01", "name": "Wow English（S4-5）" },
          { "id": "o_r2_ma_02", "name": "Muzzy（7-12集）" }
        ],
        "sub_graded_readers": [
          { "id": "o_r2_sgr_01", "name": "大猫L2（虚构）" },
          { "id": "o_r2_sgr_02", "name": "RAZ B（虚构）" }
        ],
        "sub_animations": [
          { "id": "o_r2_sa_01", "name": "Wow学练机（喜欢Wow选）" },
          { "id": "o_r2_sa_02", "name": "动物国王大冒险" },
          { "id": "o_r2_sa_03", "name": "趣趣知知鸟" },
          { "id": "o_r2_sa_04", "name": "Muzzy橙盒（喜欢Muzzy动画选）" }
        ],
        "fun_extensions": [
          { "id": "o_r2_fe_01", "name": "小书虫L2" }
        ],
        "fusion_apps": [
          { "id": "o_r2_fa_01", "name": "小小优趣成长计划Phase5-7" }
        ]
      },
      "key_points": [
        { "text": "动画接续上一阶段，继续推进", "highlighted": false },
        { "text": "古力系列可继续用WPlay推进", "highlighted": true },
        { "text": "分级阅读以牛津树和培生词汇妙趣屋搭配为主", "highlighted": false }
      ]
    },
    {
      "stage_id": "regular_3",
      "stage_name": "常规3",
      "vocabulary_target": "500-800词",
      "time_investment": "60-80H",
      "target_phase": "phase12",
      "entry_requirement": "phase8",
      "promotion_standard": "时间满足且小小优趣稳定新版phase12",
      "resources": {
        "main_picture_books": [
          { "id": "o_r3_mpb_01", "name": "饼干狗" },
          { "id": "o_r3_mpb_02", "name": "小猪小象（简单）" }
        ],
        "main_graded_readers": [
          { "id": "o_r3_mgr_01", "name": "牛津树L3" },
          { "id": "o_r3_mgr_02", "name": "培生启明星L3" },
          { "id": "o_r3_mgr_03", "name": "Super hammy E-F" },
          { "id": "o_r3_mgr_04", "name": "Buddy Reader E-F" },
          { "id": "o_r3_mgr_05", "name": "大猫L3（虚构）" }
        ],
        "main_animations": [
          { "id": "o_r3_ma_01", "name": "Little Fox L1（绿森林）" },
          { "id": "o_r3_ma_02", "name": "The Blobs" },
          { "id": "o_r3_ma_03", "name": "SSS动画儿歌（小小优趣版L1-3）" }
        ],
        "sub_graded_readers": [
          { "id": "o_r3_sgr_01", "name": "RAZ C-D（虚构）" },
          { "id": "o_r3_sgr_02", "name": "口语剧场（Part1）" }
        ],
        "sub_animations": [
          { "id": "o_r3_sa_01", "name": "蓝色小考拉" },
          { "id": "o_r3_sa_02", "name": "小鼠波波" },
          { "id": "o_r3_sa_03", "name": "小羊提米" }
        ],
        "fun_extensions": [
          { "id": "o_r3_fe_01", "name": "小书虫L3" },
          { "id": "o_r3_fe_02", "name": "培生儿童L3" },
          { "id": "o_r3_fe_03", "name": "培生400句上" },
          { "id": "o_r3_fe_04", "name": "Best Buddies（学乐橡子系列）" }
        ],
        "fusion_apps": [
          { "id": "o_r3_fa_01", "name": "小小优趣成长计划Phase8-9" }
        ]
      },
      "key_points": [
        { "text": "小鼠波波、蓝色小考拉调至辅线", "highlighted": false },
        { "text": "Little Fox L1的绿森林、The Blobs及SSS动画儿歌纳入主线或再利用", "highlighted": true },
        { "text": "以亲子共读效率最高，其次看动画、听音频，目的是培养听音频习惯", "highlighted": true }
      ]
    },
    {
      "stage_id": "regular_4",
      "stage_name": "常规4",
      "vocabulary_target": "800-1000词",
      "time_investment": "60H",
      "target_phase": "phase14",
      "entry_requirement": "phase12",
      "promotion_standard": "时间满足且小小优趣稳定新版phase14",
      "resources": {
        "main_picture_books": [
          { "id": "o_r4_mpb_01", "name": "小猪小象（难的部分）" },
          { "id": "o_r4_mpb_02", "name": "波西与皮普" },
          { "id": "o_r4_mpb_03", "name": "佩奇高频词绘本（L1-3）" },
          { "id": "o_r4_mpb_04", "name": "小猪和狐狸（4册点读）" }
        ],
        "main_graded_readers": [
          { "id": "o_r4_mgr_01", "name": "牛津树L4" },
          { "id": "o_r4_mgr_02", "name": "培生启明星L4" },
          { "id": "o_r4_mgr_03", "name": "大猫L4（虚构）" }
        ],
        "main_animations": [
          { "id": "o_r4_ma_01", "name": "Little Fox L1选2-3部（Bat、Dino、Tire）" }
        ],
        "sub_graded_readers": [
          { "id": "o_r4_sgr_01", "name": "快乐瓢虫L1" },
          { "id": "o_r4_sgr_02", "name": "RAZ E-F（虚构）" },
          { "id": "o_r4_sgr_03", "name": "I can read预备级（挑选）" },
          { "id": "o_r4_sgr_04", "name": "口语剧场（Part2）" }
        ],
        "sub_animations": [
          { "id": "o_r4_sa_01", "name": "道奇（难度不低，尽量优先Little Fox）" }
        ],
        "fun_extensions": [
          { "id": "o_r4_fe_01", "name": "小书虫L4（虚构）" },
          { "id": "o_r4_fe_02", "name": "培生儿童L4" },
          { "id": "o_r4_fe_03", "name": "培生400句下" },
          { "id": "o_r4_fe_04", "name": "银盒号阅读全解码L1-3" },
          { "id": "o_r4_fe_05", "name": "学乐橡子点读系列（你好，小刺猬、你好，小螃蟹、独角兽与雪人）" }
        ],
        "fusion_apps": [
          { "id": "o_r4_fa_01", "name": "小小优趣成长计划Phase10-11（非测试级别）" }
        ]
      },
      "key_points": [
        { "text": "道奇尽量优先Little Fox", "highlighted": false }
      ]
    },
    {
      "stage_id": "regular_5",
      "stage_name": "常规5",
      "vocabulary_target": "1000-1200词",
      "time_investment": "60H",
      "target_phase": "phase16",
      "entry_requirement": "phase14",
      "promotion_standard": "时间满足且小小优趣稳定新版phase16",
      "resources": {
        "main_picture_books": [
          { "id": "o_r5_mpb_01", "name": "皮特猫（My First）" },
          { "id": "o_r5_mpb_02", "name": "小毛人（My First）" },
          { "id": "o_r5_mpb_03", "name": "佩奇高频词绘本（L4-5）" }
        ],
        "main_graded_readers": [
          { "id": "o_r5_mgr_01", "name": "牛津树L5" },
          { "id": "o_r5_mgr_02", "name": "培生启明星L5" },
          { "id": "o_r5_mgr_03", "name": "大猫L5（虚构）" }
        ],
        "main_animations": [
          { "id": "o_r5_ma_01", "name": "Little Fox L2任选2部（Bird、彼得兔、马克笔）" }
        ],
        "sub_graded_readers": [
          { "id": "o_r5_sgr_01", "name": "快乐瓢虫L2" },
          { "id": "o_r5_sgr_02", "name": "RAZ G-H（虚构）" },
          { "id": "o_r5_sgr_03", "name": "I can read基础级（挑选）" }
        ],
        "sub_animations": [
          { "id": "o_r5_sa_01", "name": "小猪佩奇S1-2（建议phase15再加）" }
        ],
        "fun_extensions": [
          { "id": "o_r5_fe_01", "name": "小书虫L5" },
          { "id": "o_r5_fe_02", "name": "培生儿童L5" },
          { "id": "o_r5_fe_03", "name": "银盒号阅读全解码L4-5" },
          { "id": "o_r5_fe_04", "name": "丽声冒险岛L1-3（背面L3-5）" },
          { "id": "o_r5_fe_05", "name": "淘气兔子（点读版）" },
          { "id": "o_r5_fe_06", "name": "脏脏书（科普）" }
        ],
        "fusion_apps": [
          { "id": "o_r5_fa_01", "name": "小小优趣成长计划Phase12（非测试级别）" }
        ]
      },
      "key_points": []
    },
    {
      "stage_id": "regular_6",
      "stage_name": "常规6",
      "vocabulary_target": "1200-1500词",
      "time_investment": "60H",
      "target_phase": "phase18",
      "entry_requirement": "phase16",
      "promotion_standard": "佩奇可初步裸听且常规1-6累计投入不低于400H（最好测试稳定phase18）",
      "resources": {
        "main_picture_books": [
          { "id": "o_r6_mpb_01", "name": "汪培珽一段Syd Hoff系列" },
          { "id": "o_r6_mpb_02", "name": "佩奇（红黄蓝）盒" }
        ],
        "main_graded_readers": [
          { "id": "o_r6_mgr_01", "name": "牛津树L6" },
          { "id": "o_r6_mgr_02", "name": "培生启明星L6" },
          { "id": "o_r6_mgr_03", "name": "大猫L6（虚构）" }
        ],
        "main_animations": [
          { "id": "o_r6_ma_01", "name": "小猪佩奇S1-3（可接着常规5往后）" }
        ],
        "sub_graded_readers": [
          { "id": "o_r6_sgr_01", "name": "快乐瓢虫L3" },
          { "id": "o_r6_sgr_02", "name": "RAZ I-J（虚构）" },
          { "id": "o_r6_sgr_03", "name": "I can read基础" }
        ],
        "sub_animations": [
          { "id": "o_r6_sa_01", "name": "Little Fox L3经典故事" }
        ],
        "fun_extensions": [
          { "id": "o_r6_fe_01", "name": "小书虫L6（虚构）" },
          { "id": "o_r6_fe_02", "name": "培生儿童L6" },
          { "id": "o_r6_fe_03", "name": "银河号阅读全解码L6" },
          { "id": "o_r6_fe_04", "name": "丽声冒险岛L4（背面L6）" }
        ],
        "science_extensions": [
          { "id": "o_r6_se_01", "name": "水先生" },
          { "id": "o_r6_se_02", "name": "Baby why（生物化学）" },
          { "id": "o_r6_se_03", "name": "Baby all（物理、艺术）" },
          { "id": "o_r6_se_04", "name": "心智麦田轻科普绘本（11本）" }
        ],
        "fusion_apps": [
          { "id": "o_r6_fa_01", "name": "小小优趣成长计划Phase13（非测试级别）" }
        ]
      },
      "key_points": []
    },
    {
      "stage_id": "pre_bridge",
      "stage_name": "准桥梁",
      "vocabulary_target": "1500-2000词",
      "time_investment": "80-100H",
      "target_phase": "phase18+",
      "entry_requirement": "佩奇可初步裸听且常规1-6累计不低于400H",
      "promotion_standard": "佩奇可裸听且从常规1累计总投入不低于480H（小小优趣可不测，因为有科普词汇）",
      "resources": {
        "main_picture_books": [
          { "id": "o_pb_mpb_01", "name": "大红狗" },
          { "id": "o_pb_mpb_02", "name": "胖龙蓝蓝" },
          { "id": "o_pb_mpb_03", "name": "青蛙蟾蜍" },
          { "id": "o_pb_mpb_04", "name": "Frog and Friends" },
          { "id": "o_pb_mpb_05", "name": "女巫温妮（绘本版）" },
          { "id": "o_pb_mpb_06", "name": "心智麦田（庆爸精选35本）" }
        ],
        "main_graded_readers": [
          { "id": "o_pb_mgr_01", "name": "牛津树L7" },
          { "id": "o_pb_mgr_02", "name": "培生启明星L7-8" },
          { "id": "o_pb_mgr_03", "name": "快乐瓢虫L4" }
        ],
        "main_animations": [
          { "id": "o_pb_ma_01", "name": "小猪佩奇S4-5（裸听）" }
        ],
        "sub_graded_readers": [
          { "id": "o_pb_sgr_01", "name": "大猫L7-9（虚构）" },
          { "id": "o_pb_sgr_02", "name": "RAZ K-M（虚构）" }
        ],
        "sub_animations": [
          { "id": "o_pb_sa_01", "name": "Little Fox L3（魔法师和猫、柳林风声）" },
          { "id": "o_pb_sa_02", "name": "卡由" },
          { "id": "o_pb_sa_03", "name": "本霍丽" },
          { "id": "o_pb_sa_04", "name": "天才宝贝熊" },
          { "id": "o_pb_sa_05", "name": "64动物街" },
          { "id": "o_pb_sa_06", "name": "呜米123" }
        ],
        "fun_extensions": [
          { "id": "o_pb_fe_01", "name": "小书虫L7-10（虚构）" },
          { "id": "o_pb_fe_02", "name": "银河号阅读全解码L7-9" },
          { "id": "o_pb_fe_03", "name": "丽声冒险岛L5-7" },
          { "id": "o_pb_fe_04", "name": "布鲁伊绘本" }
        ],
        "science_extensions": [
          { "id": "o_pb_se_01", "name": "神奇校车红蓝盒（20册）" }
        ],
        "fusion_apps": [
          { "id": "o_pb_fa_01", "name": "本级别不推荐" }
        ]
      },
      "key_points": []
    }
  ]
}

// 资源分组的中文名称映射
const resourceLabels = {
  main_picture_books: '主线绘本',
  main_graded_readers: '主线分级',
  main_animations: '主线动画',
  sub_graded_readers: '辅线分级',
  sub_animations: '辅线动画',
  fun_extensions: '趣味拓展',
  science_extensions: '科普拓展',
  fusion_apps: '融合APP'
}

// 三大方法数组化（便于渲染）
const methodList = [
  {
    key: 'method_1_parent_child_reading',
    ...routeData.methods.method_1_parent_child_reading
  },
  {
    key: 'method_2_watching_animation',
    ...routeData.methods.method_2_watching_animation
  },
  {
    key: 'method_3_listening_audio',
    ...routeData.methods.method_3_listening_audio
  }
]

// 时间计算（与三大方法同级独立模块）
const timeCalculation = {
  formula: '亲子共读×1 + 动画×1 + 音频×(0.5或0.8)',
  rules: [
    { label: '亲子共读 / 看动画', value: '按 1:1 计算' },
    { label: '牛1-2 阶段', value: '可听音频但不计入' },
    { label: '牛3 阶段', value: '× 0.5' },
    { label: '牛4 阶段及以后', value: '× 0.8' },
    { label: '难度超 2 级', value: '无效不计入' }
  ]
}

// 解析目标时长: '60-80H' -> {min:60,max:80}，'60H' -> {min:60,max:60}
// 晋级判定与路线页高亮卡统一取 min（下限）
function parseTargetHours(text) {
  if (!text) return null
  const range = text.match(/(\d+)\s*-\s*(\d+)/)
  if (range) return { min: +range[1], max: +range[2] }
  const single = text.match(/(\d+)/)
  if (single) return { min: +single[1], max: +single[1] }
  return null
}

// 解析阶段晋级所需时长（小时）
// 优先从 promotion_standard 中提取；涉及“累计”时返回累计小时
function getRequiredHours(stage) {
  const standard = stage.promotion_standard || ''

  // 常规6 / 准桥梁：进度按“当前阶段自身时长”评估，不按跨阶段累计投入
  if (stage.stage_id !== 'regular_6' && stage.stage_id !== 'pre_bridge') {
    // 累计投入时间，如“常规1-6累计投入时间不低于400H”
    const accumulated = standard.match(/累计.*?投入.*?不低于\s*(\d+)\s*[Hh]/)
    if (accumulated) {
      return { type: 'accumulated', hours: +accumulated[1] }
    }
    // 累计总投入时间，如“从常规1累计总投入不低于480H”
    const total = standard.match(/累计总投入.*?不低于\s*(\d+)\s*[Hh]/)
    if (total) {
      return { type: 'accumulated', hours: +total[1] }
    }
  }

  // 普通时间要求，回退到 time_investment（当前阶段自身时长）
  const target = parseTargetHours(stage.time_investment)
  if (target) {
    return { type: 'stage', hours: target.min }
  }
  return { type: 'stage', hours: 0 }
}

module.exports = {
  routeData,
  resourceLabels,
  methodList,
  timeCalculation,
  parseTargetHours,
  getRequiredHours
}
