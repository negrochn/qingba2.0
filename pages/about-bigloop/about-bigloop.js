const share = require('../../utils/share.js')
const bigloopRoute = require('../../utils/bigloop_route.js')
const { buildStageVms } = require('../../utils/routeIntro.js')

// 「逐阶段素材与要点」静态成文：按官方《庆爸大循环听力路线-大循环素材汇总2.0》整理，
// 与路线数据层（bigloop_route.js）解耦——文档内容更新只改这里的 DOC_STAGES；
// 「阶段参考」一节仍由路线数据直出，两节互不影响。
// points 沿用文档的「**」加粗标记，渲染前经 toSegs 解析为行内高亮片段（通道同阶段页）。
function toSegs(text) {
  const segs = []
  String(text).split('**').forEach((t, i) => {
    if (t) segs.push({ t, hi: i % 2 === 1 })
  })
  return segs
}

const DOC_STAGES = [
  {
    name: '前置阶段',
    groups: [
      { label: '零基础动画', items: 'Wow English S1-3、Muzzy 1-6集、动物王国大冒险、雅克迪、清华幼儿英语启蒙等' },
      { label: '入门绘本', items: '古力小超人（古力1）、古力和朋友们（古力2）、古力Qplay、古力Wplay' },
      { label: '入门分级', items: '培生启明星1、培生词汇妙趣屋1-2、Super Hammy A-B、Buddy Reader A-B' },
      { label: '其他素材', items: '大猫1（虚构）、RAZ AA-A（虚构）、小书虫1' },
      { label: '其他动画拓展', items: 'Wow学练机（喜欢Wow动画优选）、Muzzy大橙盒（喜欢Muzzy动画可选）' },
      { label: '融合App（可替代动画）', items: '小小优趣成长计划 Phase 1-4' }
    ],
    points: [
      '大循环前置阶段非常关键，**如果孩子是0基础**，庆爸提醒家长们，一定不能跳过前置阶段。',
      '前置阶段其实和常规路径的第一阶段**素材一样**，都是以入门级别为主。',
      '前置阶段可用**汪培珽亲子共读法**，可缓解中文强势。',
      '庆爸建议，前置阶段投入时长**至少50-60小时**；如果用了汪培珽的亲子共读法（一句英文，一句中文），以投入**60小时**以上为最佳，但也不用超过**80小时**。',
      '其中亲子共读和看动画，**孩子只要相对专注、且素材不超难度，可按照 1:1** 的时间统计；该阶段**听音频效率低，可尝试听，但不计入时间**。（为确保效果，亲子共读用时占比建议**不低于50%**）',
      '**零基础动画一定要选**，4-6岁优先尝试Wow，7岁+优先尝试Muzzy；如果都切不进去，可试试其他推荐。动画是最容易切入的形式！若喜欢Wow，建议搭配官方学练机，有效巩固基础词；若喜欢Muzzy，也可考虑官方台词本（Muzzy大橙盒）。',
      '4-6岁，**优先尝试古力小超人1**（试错成本低）！风格和Super Hammy及Buddy Reader里的Super Chick小系列类似，如果古力1能成功切入，小分级和古力其他系列也容易，分步加入风险低。',
      '7岁+，也可先尝试第二步，或直接从分级切入，除了以上推荐，还可试试家里已有的其他入门分级。',
      '**提示：素材选用原则，就看时间花够没有？时间没够，要么继续重复喜欢的素材，要么横向换同级别其他素材！**'
    ]
  },
  {
    name: '第一阶段',
    groups: [
      { label: '入门动画（非必须）', items: 'Wow English S1-5、Muzzy 1-12集、动物王国大冒险、雅克迪、清华幼儿英语启蒙等' },
      { label: '核心素材主版本', items: '牛津树校园拓展 牛1-6（目前单本正版为奇奇学版）' },
      { label: '核心素材替补版本', items: '典范英语 1a-5b（合订本正版）' },
      { label: '其他动画拓展（非必须）', items: 'Muzzy大橙盒（喜欢Muzzy动画可选）、蓝色小考拉、绿森林' },
      { label: '融合App（可替代动画）（非必须）', items: '小小优趣成长计划 Phase 1-4' }
    ],
    points: [
      '大循环第一阶段**只需一套素材**，就是牛津树校园拓展版的牛1-6，**需整体亲子共读3遍**，这个是第一阶段的**绝对核心**。',
      '如果买不到毛毛虫版本的牛津树，可以考虑用典范英语替代，可剔除里面的家庭版和DD部分。',
      '如果家长**想加入其他素材，优先推荐动画**，和大循环的亲子共读没有冲突，动画选择可参考一阶段的素材；当然不加动画也完全没有问题。',
      '**不建议加入其他纸质类素材**，因为会占用牛津树的三遍时间，不如抓紧时间将大循环三遍做完。',
      '大循环一阶段，孩子听音频能力较弱，所以可不听音频；如果一定要听，建议听动画音频。'
    ]
  },
  {
    name: '调整策略 · 牛1小段',
    tag: '非必须',
    groups: [
      { label: '入门绘本', items: '古力小超人1、古力小超人2、QPlay奇问妙想国' },
      { label: '优选分级', items: '培生启明星1、培生词汇妙趣屋1-2、Super Hammy A-B、Buddy Reader A-B' },
      { label: '优选动画', items: 'Wow English（S1-3）、Muzzy（1-6集）' },
      { label: '辅助分级', items: '大猫1（虚构部分）、RAZ AA-A（虚构部分）' },
      { label: '辅助动画', items: 'Wow学练机（喜欢Wow动画优选）、动物王国大冒险、清华幼儿英语、3S动画儿歌、Muzzy大橙盒' },
      { label: '趣味拓展', items: '小书虫1' },
      { label: '融合App（可替代动画）', items: '小小优趣成长计划 Phase 1-4（非测试级别）' }
    ]
  },
  {
    name: '调整策略 · 牛2小段',
    tag: '非必须',
    groups: [
      { label: '优选绘本', items: 'WPlay词汇妙趣国' },
      { label: '优选分级', items: '牛1-2、培生启明星2、培生词汇妙趣屋3、Super Hammy C-D、Buddy Reader C-D' },
      { label: '优选动画', items: 'Wow English（S4-5）、Muzzy（7-12集）' },
      { label: '辅助分级', items: '大猫2（虚构部分）、RAZ B（虚构部分）' },
      { label: '辅助动画', items: 'Wow学练机（喜欢Wow动画优选）、动物王国大冒险、趣趣知知鸟、Muzzy大橙盒' },
      { label: '趣味拓展', items: '小书虫2' },
      { label: '融合App（可替代动画）', items: '小小优趣成长计划 Phase 5-7（非测试级别）' }
    ]
  },
  {
    name: '调整策略 · 牛3小段',
    tag: '非必须',
    groups: [
      { label: '主线绘本', items: '饼干狗、小猪小象（简单部分）' },
      { label: '主线分级', items: '牛3、培生启明星3、Super Hammy E-F、Buddy Reader E-F、大猫3（虚构部分）' },
      { label: '主线动画', items: 'Little Fox L1 绿森林、The Blobs、3S动画儿歌（小小优趣版L1-3）' },
      { label: '辅线分级', items: 'RAZ C-D（虚构部分）、口语剧场（Part 1）' },
      { label: '辅线动画（原版-语速略快）', items: '蓝色小考拉、小鼠波波、小羊提米' },
      { label: '趣味拓展', items: '小书虫3、培生儿童L3、培生400句上、Best Buddies（学乐橡子系列）' },
      { label: '融合App（可替代动画）', items: '小小优趣成长计划 Phase 8-9（非测试级别）' }
    ]
  },
  {
    name: '调整策略 · 要点提示',
    pointsTitle: '',
    points: [
      '大循环第二阶段调整策略并非所有孩子都需用到。恰恰相反，如果前置阶段基础很扎实，95%的孩子是用不到这个阶段的，或者只需要用**牛3小段**进行短时微调整！',
      '**如果一阶段结束，小小优趣测试结果在旧版P8+ 或 新版Phase12+，直接跳过调整策略（牛1-3小段）的内容！**',
      '**调整策略时间计算公式：**',
      '**大循环二阶段调整策略用时 = 120小时 - 前置阶段用时 - 大循环一阶段用时**',
      '**切入方法：**',
      '**情况1：小小优趣旧版P2-3 ｜ 新版Phase2-6**：从牛1小段切入；牛1小段投入时间：（调整策略用时 ÷ 7）× 1；牛2小段投入时间：（调整策略用时 ÷ 7）× 2；牛3小段投入时间：（调整策略用时 ÷ 7）× 4。',
      '**情况2：小小优趣旧版P4-5 ｜ 新版Phase7-8**：从牛2小段切入；牛2小段投入时间：（调整策略用时 ÷ 3）× 1；牛3小段投入时间：（调整策略用时 ÷ 3）× 2。',
      '**情况3：小小优趣旧版P6-7 ｜ 新版Phase9-10**：从牛3小段切入；牛3小段投入时间 = 调整策略用时。',
      '二阶段调整策略思路很简单：**如果前置阶段+大循环第一阶段总时间不够120小时**，那么测试结果不达标就是时间不足引起的，**将时间补上，大概率就达标了。** 若有进步但仍不达标，可再增加牛3小段时间。',
      '如果本身已经够120小时、或已经补足了120小时，但孩子的测试结果**依旧没有进步，庆爸建议转常规**——很可能孩子是那种无法跨难度内化的类型，**这类孩子比较少见**！'
    ]
  },
  {
    name: '标准策略 · 牛4小段',
    tag: '必须',
    intro: '切入标准：小小优趣旧版P8 ｜ 新版Phase12 ｜ 目标：1000词 ｜ 时间投入：建议90小时',
    groups: [
      { label: '优选绘本', items: '小猪小象（难的部分）、波西与皮普、佩奇高频词绘本（L1-3）' },
      { label: '优选分级', items: '牛4、培生启明星4、快乐瓢虫L1' },
      { label: '优选动画', items: 'Little Fox L1 选2-3部（Bat、Dino、Tire）' },
      { label: '辅助分级', items: '大猫4（虚构）、RAZ E-F（虚构）、I Can Read 预备级（挑选）、口语剧场（Part 2）' },
      { label: '辅助动画', items: '道奇' },
      { label: '趣味拓展', items: '小书虫4（虚构）、培生儿童L4、培生400句下' },
      { label: '融合App（可替代动画）', items: '小小优趣成长计划 Phase 10-11（非测试级别）' }
    ]
  },
  {
    name: '标准策略 · 牛5小段',
    tag: '必须',
    intro: '切入标准：小小优趣旧版P10 ｜ 新版Phase14 ｜ 目标：1200词 ｜ 时间投入：建议80小时',
    groups: [
      { label: '优选绘本', items: '皮特猫（My First）、小毛人（My First）、佩奇高频词绘本（L4-5）' },
      { label: '优选分级', items: '牛5、培生启明星5、快乐瓢虫L2' },
      { label: '优选动画', items: 'Little Fox L2 任选2部（Bird、彼得兔、马克笔）、佩奇S1-2（也可加在牛6小段）' },
      { label: '辅助分级', items: '大猫5（虚构）、RAZ G-H（虚构）、I Can Read 基础级（挑选）' },
      { label: '趣味拓展', items: '小书虫5（虚构）、培生儿童L5、外星人猎手（漫画）、魔幻历险记（漫画）' },
      { label: '融合App（可替代动画）', items: '小小优趣成长计划 Phase 12（非测试级别）' }
    ]
  },
  {
    name: '标准策略 · 牛6小段',
    tag: '必须',
    intro: '切入标准：小小优趣旧版P12 ｜ 新版Phase16 ｜ 目标：1500词 ｜ 时间投入：建议80小时',
    groups: [
      { label: '优选绘本', items: '汪培珽一段 Syd Hoff 系列、佩奇（红黄蓝）盒' },
      { label: '优选分级', items: '牛6、培生启明星6、快乐瓢虫L3' },
      { label: '优选动画', items: '小猪佩奇S3-5（S1-2没看的话，可从S1开始；S3开始尝试裸听+回看+复听）' },
      { label: '辅助分级', items: '大猫6（虚构）、RAZ I-J（虚构）、I Can Read 基础' },
      { label: '辅助动画', items: 'Little Fox L3 经典故事' },
      { label: '趣味拓展', items: '小书虫6（虚构）、培生儿童L6、丽声冒险岛1-3、Fly Guy' },
      { label: '融合App（可替代动画）', items: '小小优趣成长计划 Phase 13（非测试级别）' }
    ]
  },
  {
    name: '标准策略 · 要点提示',
    pointsTitle: '',
    points: [
      '大循环二阶段标准策略其实和常规路径4-6阶段的素材一模一样，但需要投入的时间更多——主要原因是大循环前置+一阶段投入的时间比较少，所以为了确保后续进阶顺利，需在大循环二阶段标准策略把时间补回来。',
      '**牛4小段**：相当于1.0版本的「大循环二阶段第一小段」。**切入标准：小小优趣旧版P8 ｜ 新版Phase12**；目标：积累到1000词；**时间投入：建议90小时**。',
      '**牛5小段**：相当于1.0版本的「大循环二阶段第二小段」。**切入标准：小小优趣旧版P10 ｜ 新版Phase14**；目标：积累到1200词；**时间投入：建议80小时**。',
      '**牛6小段**：相当于1.0版本的「大循环二阶段第三小段」。**切入标准：小小优趣旧版P12 ｜ 新版Phase16**；目标：积累到1500词；**时间投入：建议80小时**。'
    ]
  },
  {
    name: '第三阶段（牛7-9小段）',
    intro: '切入标准：二阶段完成（最好可裸听佩奇，小小优趣旧版P15 ｜ 新版Phase18）｜ 时间投入：80小时+',
    groups: [
      { label: '优选绘本｜准桥梁', items: '大红狗、胖龙蓝蓝、青蛙蟾蜍、Frog and Friends、女巫温妮（绘本版）' },
      { label: '优选分级', items: '牛7-9、培生启明星7-8、快乐瓢虫L4' },
      { label: '优选动画', items: '小猪佩奇S4-5（裸听）' },
      { label: '辅助分级', items: '大猫7-9（虚构）、RAZ K-M（虚构）' },
      { label: '辅助动画', items: 'Little Fox L3（魔法师和猫、柳林风声）、卡由、本霍丽、天才宝贝熊、64动物街、呜米123' },
      { label: '趣味拓展', items: '小书虫7-10（虚构）、丽声冒险岛4-7' }
    ]
  }
]

Page({
  data: {
    fontClass: '',
    darkClass: '',
    // 阶段参考：路线数据直出
    stages: [],
    // 逐阶段素材与要点：官方文档静态数据（points 已解析为行内高亮片段）
    docStages: []
  },

  onLoad() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
    const docStages = DOC_STAGES.map(s => ({
      name: s.name,
      tag: s.tag || '',
      intro: s.intro || '',
      pointsTitle: s.pointsTitle === undefined ? '要点' : s.pointsTitle,
      groups: s.groups || [],
      points: (s.points || []).map((text, i) => ({ key: 'p' + i, segs: toSegs(text) }))
    }))
    this.setData({
      stages: buildStageVms(bigloopRoute.stages),
      docStages
    })
  },

  onShow() {
    const app = getApp()
    if (app && app.applyFontLevel) app.applyFontLevel(this)
  },

  // 转发给好友：只走右上角菜单「转发」（页内不放 open-type="share" 按钮，同 about 页约定）
  onShareAppMessage() {
    return share.appMessage('aboutBigloop')
  },

  // 分享到朋友圈：纯内容页允许单页模式打开（同 about 页约定）
  onShareTimeline() {
    return share.timeline('aboutBigloop')
  }
})
