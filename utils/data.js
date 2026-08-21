// 听力训练路线数据，源自 qingba_listening_route.json
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
      ],
      "time_calculation": {
        "parent_child_reading_and_animation": "按1:1计算",
        "audio_before_niu3": "乘以0.5",
        "audio_after_niu4": "乘以0.8",
        "invalid": "难度超两级则直接无效不计入"
      }
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
        "main_picture_books": ["古力小超人", "古力与朋友们", "巴塔木口语书", "QPlay奇问妙想国"],
        "main_graded_readers": ["培生启明星L1", "培生词汇妙趣屋L1-2", "Super hammy A-B", "Buddy Reader A-B"],
        "main_animations": ["Wow English（S1-3）", "Muzzy（1-6集）"],
        "sub_graded_readers": ["大猫L1（虚构）", "RAZ AA-A（虚构）"],
        "sub_animations": ["Wow学练机（喜欢Wow选）", "动物国王大冒险", "清华幼儿英语启蒙动画"],
        "fun_extensions": ["小书虫L1"],
        "fusion_apps": ["小小优趣成长计划Phase1-4"]
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
        "main_picture_books": ["WPlay词汇妙趣国"],
        "main_graded_readers": ["牛津树L1-2", "培生启明星L2", "培生词汇妙趣屋L3", "Super hammy C-D", "Buddy Reader C-D"],
        "main_animations": ["Wow English（S4-5）", "Muzzy（7-12集）"],
        "sub_graded_readers": ["大猫L2（虚构）", "RAZ B（虚构）"],
        "sub_animations": ["Wow学练机（喜欢Wow选）", "动物国王大冒险", "趣趣知知鸟", "Muzzy橙盒（喜欢Muzzy动画选）"],
        "fun_extensions": ["小书虫L2"],
        "fusion_apps": ["小小优趣成长计划Phase5-7"]
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
        "main_picture_books": ["饼干狗", "小猪小象（简单）"],
        "main_graded_readers": ["牛津树L3", "培生启明星L3", "Super hammy E-F", "Buddy Reader E-F", "大猫L3（虚构）"],
        "main_animations": ["Little Fox L1（绿森林）", "The Blobs", "SSS动画儿歌（小小优趣版L1-3）"],
        "sub_graded_readers": ["RAZ C-D（虚构）", "口语剧场（Part1）"],
        "sub_animations": ["蓝色小考拉", "小鼠波波", "小羊提米"],
        "fun_extensions": ["小书虫L3", "培生儿童L3", "培生400句上", "Best Buddies（学乐橡子系列）"],
        "fusion_apps": ["小小优趣成长计划Phase8-9"]
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
        "main_picture_books": ["小猪小象（难的部分）", "波西与皮普", "佩奇高频词绘本（L1-3）", "小猪和狐狸（4册点读）"],
        "main_graded_readers": ["牛津树L4", "培生启明星L4", "大猫L4（虚构）"],
        "main_animations": ["Little Fox L1选2-3部（Bat、Dino、Tire）"],
        "sub_graded_readers": ["快乐瓢虫L1", "RAZ E-F（虚构）", "I can read预备级（挑选）", "口语剧场（Part2）"],
        "sub_animations": ["道奇（难度不低，尽量优先Little Fox）"],
        "fun_extensions": ["小书虫L4（虚构）", "培生儿童L4", "培生400句下", "银盒号阅读全解码L1-3", "学乐橡子点读系列（你好，小刺猬、你好，小螃蟹、独角兽与雪人）"],
        "fusion_apps": ["小小优趣成长计划Phase10-11（非测试级别）"]
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
        "main_picture_books": ["皮特猫（My First）", "小毛人（My First）", "佩奇高频词绘本（L4-5）"],
        "main_graded_readers": ["牛津树L5", "培生启明星L5", "大猫L5（虚构）"],
        "main_animations": ["Little Fox L2任选2部（Bird、彼得兔、马克笔）"],
        "sub_graded_readers": ["快乐瓢虫L2", "RAZ G-H（虚构）", "I can read基础级（挑选）"],
        "sub_animations": ["小猪佩奇S1-2（建议phase15再加）"],
        "fun_extensions": ["小书虫L5", "培生儿童L5", "银盒号阅读全解码L4-5", "丽声冒险岛L1-3（背面L3-5）", "淘气兔子（点读版）", "脏脏书（科普）"],
        "fusion_apps": ["小小优趣成长计划Phase12（非测试级别）"]
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
        "main_picture_books": ["汪培珽一段Syd Hoff系列", "佩奇（红黄蓝）盒"],
        "main_graded_readers": ["牛津树L6", "培生启明星L6", "大猫L6（虚构）"],
        "main_animations": ["小猪佩奇S1-3（可接着常规5往后）"],
        "sub_graded_readers": ["快乐瓢虫L3", "RAZ I-J（虚构）", "I can read基础"],
        "sub_animations": ["Little Fox L3经典故事"],
        "fun_extensions": ["小书虫L6（虚构）", "培生儿童L6", "银河号阅读全解码L6", "丽声冒险岛L4（背面L6）"],
        "science_extensions": ["水先生", "Baby why（生物化学）", "Baby all（物理、艺术）", "心智麦田轻科普绘本（11本）"],
        "fusion_apps": ["小小优趣成长计划Phase13（非测试级别）"]
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
      "promotion_standard": "佩奇可裸听且常规1累计总投入不低于480H（小小优趣可不测，因为有科普词汇）",
      "resources": {
        "main_picture_books": ["大红狗", "胖龙蓝蓝", "青蛙蟾蜍", "Frog and Friends", "女巫温妮（绘本版）", "心智麦田（庆爸精选35本）"],
        "main_graded_readers": ["牛津树L7", "培生启明星L7-8", "快乐瓢虫L4"],
        "main_animations": ["小猪佩奇S4-5（裸听）"],
        "sub_graded_readers": ["大猫L7-9（虚构）", "RAZ K-M（虚构）"],
        "sub_animations": ["Little Fox L3（魔法师和猫、柳林风声）", "卡由", "本霍丽", "天才宝贝熊", "64动物街", "呜米123"],
        "fun_extensions": ["小书虫L7-10（虚构）", "银河号阅读全解码L7-9", "丽声冒险岛L5-7", "布鲁伊绘本"],
        "science_extensions": ["神奇校车红蓝盒（20册）"],
        "fusion_apps": ["本级别不推荐"]
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

module.exports = {
  routeData,
  resourceLabels,
  methodList
}
