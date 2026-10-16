#!/usr/bin/env node
// 邀请码生成脚本（本地运行，无第三方依赖）
// 产出两份文件到 scripts/out/：
//   redeem-codes-<时间戳>.json → 云开发控制台导入用（JSON Lines：每行一个文档）
//   redeem-codes-<时间戳>.txt  → 纯文本清单，直接复制发给朋友
//
// 用法（在项目根目录）：
//   node scripts/gen-redeem-codes.js --count 5 --note "内测福利"
//   node scripts/gen-redeem-codes.js --count 10 --note "送张三" --prefix QB
//
// 参数：
//   --count N     生成数量（默认 5，单次上限 500）
//   --note 文本   备注，记录用途/送谁（两份产出文件均携带；控制台导入后可在库中看到）
//   --prefix XX   码前缀（默认 QB，2 个字母）
//
// 码格式：QB-XXXX-XXXX-XXXX（展示）；库内 code 存纯码 QBXXXXXXXXXXXX（去横线大写，
// 与云函数 _normalizeCode 口径一致）。字符表剔除 0/O、1/I/L 易混淆字符，
// 随机空间 31^12 ≈ 7.9×10^17，无法枚举。
//
// 导入步骤：云开发控制台 → 数据库 → 新建集合 redeem_codes → 导入上面的 .json
// （冲突处理选 insert，权限默认「仅创建者可读写」即可——云函数写入的文档无 _openid，
// 小程序端直连读不到任何码，兑换只能走 cloudBackup 云函数）

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ' // 31 位：剔除 0/O、1/I/L
const GROUPS = 3
const GROUP_LEN = 4

function parseArgs(argv) {
  const args = { count: 5, note: '', prefix: 'QB' }
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--count') args.count = parseInt(argv[++i], 10)
    else if (k === '--note') args.note = argv[++i] || ''
    else if (k === '--prefix') args.prefix = String(argv[++i] || 'QB').toUpperCase()
  }
  if (!Number.isInteger(args.count) || args.count < 1) args.count = 5
  if (args.count > 500) args.count = 500
  if (!/^[A-Z]{2,4}$/.test(args.prefix)) args.prefix = 'QB'
  return args
}

// crypto 随机取字符表下标（无模偏差：拒绝采样超出 256/31*31 的余数区间）
function randIndex() {
  const max = Math.floor(256 / ALPHABET.length) * ALPHABET.length
  let b
  do { b = crypto.randomBytes(1)[0] } while (b >= max)
  return b % ALPHABET.length
}

function genPlainCode(prefix) {
  const groups = []
  for (let g = 0; g < GROUPS; g++) {
    let s = ''
    for (let i = 0; i < GROUP_LEN; i++) s += ALPHABET[randIndex()]
    groups.push(s)
  }
  return prefix + groups.join('') // 纯码：QB + 12 位
}

function toDisplay(code) {
  return code.slice(0, 2) + '-' + code.slice(2, 6) + '-' + code.slice(6, 10) + '-' + code.slice(10)
}

function main() {
  const args = parseArgs(process.argv)
  const seen = new Set()
  while (seen.size < args.count) seen.add(genPlainCode(args.prefix))
  const codes = Array.from(seen)
  const createdAt = Date.now()

  // JSON Lines：每行一个文档（云开发控制台导入格式）；type/durationMonths 为预留字段，
  // 当前只发永久码（lifetime），未来支持时限码时无需改表结构
  const ndjson = codes.map((code) => JSON.stringify({
    code,
    type: 'lifetime',
    durationMonths: null,
    status: 'unused',
    usedBy: null,
    usedAt: null,
    note: args.note,
    createdAt
  })).join('\n') + '\n'

  const stamp = new Date(createdAt)
    .toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const header = `# 邀请码清单  用途：${args.note || '（未填写）'}  数量：${codes.length}  生成：${new Date(createdAt).toLocaleString()}\n# 库内纯码为去横线大写格式，输入时横线可有可无\n`
  const txt = header + codes.map(toDisplay).join('\n') + '\n'

  const outDir = path.join(__dirname, 'out')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  const jsonPath = path.join(outDir, `redeem-codes-${stamp}.json`)
  const txtPath = path.join(outDir, `redeem-codes-${stamp}.txt`)
  fs.writeFileSync(jsonPath, ndjson, 'utf8')
  fs.writeFileSync(txtPath, txt, 'utf8')

  console.log(`已生成 ${codes.length} 个邀请码（用途：${args.note || '未填写'}）`)
  console.log(`导入用 JSON Lines：${jsonPath}`)
  console.log(`发码用清单：${txtPath}`)
  console.log()
  process.stdout.write(txt)
}

main()
