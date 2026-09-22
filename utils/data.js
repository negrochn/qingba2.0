// 听力训练路线数据，源自 qingba_listening_route.json
// 注意：运行时只读取本文件（该 JSON 已被打包排除），
// 若修改路线数据，请同步更新根目录的 qingba_listening_route.json，避免两份数据漂移
//
// 多路线结构：本文件 routeData = 常规路线（含 methods/timeCalculation 等全局方法论）；
// 大循环路线在 ./bigloop_route.js（拍平后 9 阶段）。两者经下方 ROUTES 注册表统一，
// 页面通过 checkin.getCurrentRoute() 取当前路线（存储读取收敛在 checkin，避免循环依赖）。
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

// ===== 路线注册表 =====
// 「常规路线」= 上方 routeData；「大循环路线」= bigloop_route.js 拍平后的 9 个阶段。
// routeData 上的 methods / timeCalculation / overview 属全局方法论，不随路线切换。
const bigloopRoute = require('./bigloop_route.js')

const ROUTES = {
  // journeyText：首页欢迎卡文案，起终点取真实阶段名（与大循环同构）。常规路线是纯链、
  // 末位即终点，直接取数组首末；大循环因支线排序混入数组，终点须按 id 显式定位
  regular: {
    id: 'regular',
    name: '常规路线',
    journeyText: (function () {
      const stages = routeData.stages || []
      const first = stages[0] ? stages[0].stage_name : ''
      const last = stages[stages.length - 1]
      return '记录每天的英语听力投入，陪孩子从' + first + '一路走到' + (last ? last.stage_name : '')
    })(),
    stages: routeData.stages
  },
  bigloop: bigloopRoute
}

// 纯函数：按路线 id 取路线对象，未知 id 兜底常规（老用户零感知）
function getRoute(routeId) {
  return ROUTES[routeId] || ROUTES.regular
}

// ===== 熏听分组与折算系数 =====
// 「熏听」= about 页的方式三（听音频）。官方数据里不含任何素材，它只是个占位分组：
// 家长在「我的资源」里挂自己的音频素材，打卡时按阶段系数折算为有效时长（见 LISTENING_FACTORS）。
// 全路线阶段统一补空数组（「是数组」即分组存在，这也是 getStageGroupKeys 的判定条件）。
// 注：该分组属于程序占位、不属于路线内容，故无需同步根目录 json。
const LISTENING_GROUP_KEY = 'listening_audio'

// 常规路线补 prev_stage_ids（= 数组前序）。大循环的晋级链在 bigloop_route.js 内显式声明
// （分叉结构：调整支线小段互相不构成链）。声明统一后，stagePicker 的链式标记逻辑
// 全路线同一套代码，无「常规走数组、大循环走链」的分支。
;(routeData.stages || []).forEach((stage, i, arr) => {
  stage.prev_stage_ids = arr.slice(0, i).map(s => s.stage_id)
})

Object.keys(ROUTES).forEach(rid => {
  ;(ROUTES[rid].stages || []).forEach(stage => {
    if (!stage.resources) stage.resources = {}
    if (!Array.isArray(stage.resources[LISTENING_GROUP_KEY])) stage.resources[LISTENING_GROUP_KEY] = []
  })
})

// 熏听折算系数：按「打卡所属阶段」唯一确定，家长无需选难度。依据两处：
//   1) about 页的时间计算：牛1-2 可听但不计入；牛3 ×0.5；牛4 及以后 ×0.8
//   2) 各阶段主线里的牛津树素材（实测）：常规2 = L1-2、常规3 = L3、…、常规6 = L6、准桥梁 = L7
//      → 常规N 对应牛N；常规1 无牛津树素材，落在「牛1-2」档
// 大循环直接按小段牛N 对同一张档位表映射（牛N 是两条路线共享的难度度量），
// 系数与调整/标准轨道无关。两路线 stage_id 命名空间不撞，合并一张表，无需感知路线。
// ⚠️ factor 为打卡时固化快照：调整系数只影响新记录，历史记录口径不变。
const LISTENING_FACTORS = {
  regular_1: 0,     // 牛1-2 档：可听，但不计入有效时长
  regular_2: 0,     // 牛1-2（主线素材为「牛津树L1-2」）
  regular_3: 0.5,   // 牛3
  regular_4: 0.8,   // 牛4 及以后
  regular_5: 0.8,
  regular_6: 0.8,
  pre_bridge: 0.8,
  // 大循环：前置/一阶段依据 JSON 原文（「不计入时间」「可不听音频」，均已拍板为 0）
  big_loop_pre: 0,                  // JSON 原文「听音频效率低，可尝试听，但不计入时间」
  big_loop_1: 0,                    // JSON 原文「听音频能力较弱，所以可不听音频」
  big_loop_2_adjust_niu1: 0,        // 牛1-2 档
  big_loop_2_adjust_niu2: 0,        // 牛1-2 档
  big_loop_2_adjust_niu3: 0.5,      // 牛3 档
  big_loop_2_standard_niu4: 0.8,    // 牛4+ 档
  big_loop_2_standard_niu5: 0.8,    // 牛4+ 档
  big_loop_2_standard_niu6: 0.8,    // 牛4+ 档
  big_loop_3: 0.8                   // 牛7-9，与常规准桥梁同档
}

// 记录的折算系数：仅熏听分组打折，其余分组恒为 1
// ⚠️ 0 是合法系数（常规1/2 不计入），调用方判断缺省值时不能用 `||`
function listeningFactor(stageId, groupKey) {
  if (groupKey !== LISTENING_GROUP_KEY) return 1
  const f = LISTENING_FACTORS[stageId]
  return typeof f === 'number' ? f : 1
}

// 熏听折算提示文案（打卡弹窗 / 补录 / 编辑页共用，避免三处各写一份）
// minutes 传 0 时只说明系数；大于 0 时给出「X 分钟计 Y 分钟」的具体换算
function listeningTip(stageId, groupKey, minutes) {
  if (groupKey !== LISTENING_GROUP_KEY) return ''
  const f = LISTENING_FACTORS[stageId]
  if (typeof f !== 'number') return ''
  // 通用表述：大循环前置/第一阶段没有牛N 档位，不能写「牛1-2 档」
  if (f === 0) return '本阶段听音频可记录，但不计入有效时长'
  const pct = `×${f}`
  const m = Math.round(Number(minutes) || 0)
  return m > 0
    ? `熏听按 ${pct} 折算：${m} 分钟计 ${Math.round(m * f)} 分钟有效时长`
    : `本阶段熏听按 ${pct} 折算后计入有效时长`
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
  fusion_apps: '融合APP',
  listening_audio: '熏听'
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
//
// 【口径】所有阶段一律按「当前阶段自身的投入时长」评估晋级，不采用「从常规1累计投入」的口径。
//   常规6（time_investment 60H）与准桥梁（80-100H）的 promotion_standard 里虽然写有
//   「常规1-6累计投入不低于400H」「从常规1累计总投入不低于480H」，但这里显式把这两个阶段
//   排除在累计匹配之外，改按各自 time_investment 判定 —— 这是产品既定口径，勿改成累计。
//
// 【为何不能用累计】用户可以选择任意阶段作为起点（stagePicker 任选起点，前序仅标记 completed、
//   不补时长），因此记录里「常规1 起的完整前序时长」并不保证存在。对中途起步的用户，累计
//   400H / 480H 是结构性不可达（不是难达成，而是永远差着起步前那部分）。故凡依赖跨阶段累计的
//   口径都不可用 —— 这与用户是从常规几开始无关，是数据完整性本身的限制。
//
// 【保留的累计分支】下面两段正则为将来新增阶段留口：若某阶段的 promotion_standard 明确写了
//   「…累计投入…不低于 XH」，会返回 type='accumulated'，调用方（route / stage / home）随即
//   改用 getAccumulatedMinutes() 统计跨阶段累计时长。当前全部阶段都不会命中这两段。
//
// 【目标档位 / 逐阶段覆盖】opt = { mode: 'lower' | 'upper', custom: number }
//   - mode 缺省按 'upper'（建议区间上限）：60-80H 取 80、80-100H 取 100
//   - custom 为该阶段单独设置的目标小时数，优先级高于 mode（只对 type='stage' 生效 ——
//     accumulated 的 hours 是跨阶段累计量，拿它当「本阶段目标」覆盖语义不通）
//   - 取值由 utils/checkin 的 getTargetOption(stageId) 从本地设置读出后传入；
//     不传 opt 时行为 = 'upper'，与设置页的默认档位一致
function getRequiredHours(stage, opt) {
  const o = opt || {}
  const standard = stage.promotion_standard || ''

  // 常规6 / 准桥梁：进度按“当前阶段自身时长”评估，不按跨阶段累计投入（见上方口径说明）
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

  // 阶段自身的时长目标：逐阶段自定义 > 档位（下限 / 上限）
  // ⚠️ 不能用 `o.custom || ...` 兜底：0 是非法值而非缺省值，会被误判成缺省（同 effectiveMinutes 的 factor 坑）
  const custom = Number(o.custom)
  if (isFinite(custom) && custom > 0) {
    return { type: 'stage', hours: custom }
  }
  const target = parseTargetHours(stage.time_investment)
  if (target) {
    return { type: 'stage', hours: o.mode === 'lower' ? target.min : target.max }
  }
  return { type: 'stage', hours: 0 }
}

module.exports = {
  routeData,
  ROUTES,
  getRoute,
  resourceLabels,
  LISTENING_GROUP_KEY,
  LISTENING_FACTORS,
  listeningFactor,
  listeningTip,
  methodList,
  timeCalculation,
  parseTargetHours,
  getRequiredHours
}
