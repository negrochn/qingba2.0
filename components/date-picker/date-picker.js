/**
 * 日期选择器（自绘三列滚轮，底部半屏弹层）
 *
 * 为什么不用原生 <picker mode="date">：原生弹层是系统 UI，不跟随项目的
 * dm-* 深色方案，也不跟随 --fs 字号档位。自绘后两者都能跟随，
 * 且与月份 / 阶段选择器（原语 19）视觉统一。
 *
 * 用法：
 *   <date-picker
 *     show="{{datePickerOpen}}" value="{{dateStr}}" max="{{todayStr}}"
 *     font-class="{{fontClass}}" dark-class="{{darkClass}}"
 *     bind:confirm="onDateConfirm" bind:close="onDateClose" />
 *
 * 输出：confirm → { value: 'YYYY-MM-DD' }
 */
const MIN_YEAR_BACK = 20 // min 缺省时：从上限往前 20 年

function _pad(n) {
  return String(n).padStart(2, '0')
}

function _ymd(y, m, d) {
  return `${y}-${_pad(m)}-${_pad(d)}`
}

// 严格解析 'YYYY-MM-DD'，非法或越界（如 2026-02-30）返回 null
function _parts(day) {
  const s = String(day || '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const arr = s.split('-').map(Number)
  const dt = new Date(arr[0], arr[1] - 1, arr[2])
  const ok = dt.getFullYear() === arr[0] && dt.getMonth() === arr[1] - 1 && dt.getDate() === arr[2]
  return ok ? { y: arr[0], m: arr[1], d: arr[2] } : null
}

function _today() {
  const d = new Date()
  return _ymd(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

// 某年某月的天数（下个月第 0 天 = 本月最后一天，闰年自动正确）
function _daysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}

function _range(lo, hi) {
  const arr = []
  for (let i = lo; i <= hi; i++) arr.push(i)
  return arr
}

function _clamp(v, lo, hi) {
  if (v < lo) return lo
  if (v > hi) return hi
  return v
}

Component({
  // picker-view 的内置蒙层 / 选中框由基础库渲染，需要「组件样式能作用到它内部」，
  // 因此关闭样式隔离。与 date-picker.json 里的 styleIsolation 同名同值，两处都写
  // 以兼容不同基础库版本对配置位置的差异。
  options: {
    styleIsolation: 'shared'
  },

  properties: {
    show: { type: Boolean, value: false },
    value: { type: String, value: '' }, // 'YYYY-MM-DD'
    min: { type: String, value: '' },
    max: { type: String, value: '' },   // 缺省 = 今天（未来不可选）
    title: { type: String, value: '选择日期' },
    // 浮层在 .container 之外拿不到 dm-* / fs-* 变量，必须由页面显式传入
    fontClass: { type: String, value: '' },
    darkClass: { type: String, value: '' }
  },

  data: {
    years: [],
    months: [],
    days: [],
    pickerValue: [0, 0, 0]
  },

  lifetimes: {
    attached() {
      this._init()
    }
  },

  observers: {
    show(v) {
      if (v) this._init()
    },
    // 同一批 setData 里 value 可能与 show 一起变，补一次同步
    value() {
      if (this.data.show) this._init()
    }
  },

  methods: {
    noop() {},

    _init() {
      const maxP = _parts(this.data.max) || _parts(_today())
      let minP = _parts(this.data.min) || { y: maxP.y - MIN_YEAR_BACK, m: 1, d: 1 }

      // 兜底：传入的 value 早于下限时把下限下探过去，
      // 否则编辑一条很早的记录会被夹到今天，保存后把日期改坏
      const valP = _parts(this.data.value)
      if (valP && _ymd(valP.y, valP.m, valP.d) < _ymd(minP.y, minP.m, minP.d)) {
        minP = { y: valP.y, m: valP.m, d: valP.d }
      }

      this._min = minP
      this._max = maxP

      const t = valP || maxP
      this._sync(t.y, t.m, t.d)
    },

    // 某年的可选月份范围（上限同年时截断）
    _monthRange(y) {
      const lo = y === this._min.y ? this._min.m : 1
      const hi = y === this._max.y ? this._max.m : 12
      return { lo: _clamp(lo, 1, 12), hi: _clamp(hi, 1, 12) }
    },

    // 某年某月的可选日期范围（上限同年同月时截断）
    _dayRange(y, m) {
      const dim = _daysInMonth(y, m)
      let lo = 1
      let hi = dim
      if (y === this._min.y && m === this._min.m) lo = _clamp(this._min.d, 1, dim)
      if (y === this._max.y && m === this._max.m) hi = _clamp(this._max.d, 1, dim)
      return { lo, hi: _clamp(hi, lo, dim) }
    },

    // 把年月日夹到合法范围，重算三列并同步 picker-view 的索引
    _sync(y, m, d) {
      const y2 = _clamp(y, this._min.y, this._max.y)
      const mr = this._monthRange(y2)
      const m2 = _clamp(m, mr.lo, mr.hi)
      const dr = this._dayRange(y2, m2)
      const d2 = _clamp(d, dr.lo, dr.hi)

      this._cur = { y: y2, m: m2, d: d2 }

      this.setData({
        years: _range(this._min.y, this._max.y),
        months: _range(mr.lo, mr.hi),
        days: _range(dr.lo, dr.hi),
        pickerValue: [y2 - this._min.y, m2 - mr.lo, d2 - dr.lo]
      })
    },

    // 任一列滚动停止：索引 → 年月日 → 夹紧 → 回写索引
    // （列长度会随年月变化，索引可能错位，统一交给 _sync 兜住）
    onColumnChange(e) {
      if (!this._min) return
      const val = (e.detail.value || []).map(Number)
      const y = this._min.y + (val[0] || 0)
      const mr = this._monthRange(y)
      const m = mr.lo + (val[1] || 0)
      const dr = this._dayRange(y, m)
      const d = dr.lo + (val[2] || 0)
      this._sync(y, m, d)
    },

    onCancel() {
      this.triggerEvent('close')
    },

    onConfirm() {
      if (!this._cur) {
        this.triggerEvent('close')
        return
      }
      this.triggerEvent('confirm', {
        value: _ymd(this._cur.y, this._cur.m, this._cur.d)
      })
    }
  }
})
