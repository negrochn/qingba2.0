const checkin = require('../../utils/checkin.js');
const wxCharts = require('../../utils/wxcharts-min.js');

Page({
  data: {
    currentIndex: 0,
    periodTypes: ['week', 'month', 'year', 'all'],
    periodOffsets: [0, 0, 0, 0],
    periodLabel: '',
    totalLabel: '',
    avgLabel: '',
    totalHours: '0',
    avgHours: '0',
    hasData: false
  },

  chart: null,

  onLoad(options) {
    if (options && options.tab !== undefined) {
      const tabIndex = parseInt(options.tab);
      if (tabIndex >= 0 && tabIndex < this.data.periodTypes.length) {
        this.setData({ currentIndex: tabIndex });
      }
    }
    this._loadDataOnly();
  },

  onReady() {
    this._renderFromCache();
  },

  onShow() {
    if (this._canvasReady) {
      this._loadDataOnly();
    }
  },

  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (index !== this.data.currentIndex) {
      this.setData({ currentIndex: index });
      this._loadDataOnly();
    }
  },

  onPrevPeriod() {
    const periodType = this.data.periodTypes[this.data.currentIndex];
    if (periodType === 'all') return;
    const offsets = [...this.data.periodOffsets];
    offsets[this.data.currentIndex] += 1;
    this.setData({ periodOffsets: offsets });
    this._loadDataOnly();
  },

  onNextPeriod() {
    const periodType = this.data.periodTypes[this.data.currentIndex];
    if (periodType === 'all') return;
    const offsets = [...this.data.periodOffsets];
    offsets[this.data.currentIndex] -= 1;
    if (offsets[this.data.currentIndex] < 0) {
      offsets[this.data.currentIndex] = 0;
      wx.showToast({ title: '已是当前周期', icon: 'none' });
      return;
    }
    this.setData({ periodOffsets: offsets });
    this._loadDataOnly();
  },

  onChartTouchStart(e) {
    if (this.chart && this.chart.scrollStart) {
      this.chart.scrollStart(e);
    }
  },

  onChartTouchMove(e) {
    if (this.chart && this.chart.scroll) {
      this.chart.scroll(e);
    }
  },

  onChartTouchEnd(e) {
    if (this.chart && this.chart.scrollEnd) {
      this.chart.scrollEnd(e);
    }
  },

  _loadDataOnly() {
    const periodType = this.data.periodTypes[this.data.currentIndex];
    const offset = this.data.periodOffsets[this.data.currentIndex];
    const data = this._getPeriodData(periodType, offset);

    // 计算摘要
    const totalMinutes = data.reduce((sum, d) => sum + d.minutes, 0);
    const count = data.filter(d => d.minutes > 0).length || 1;
    const avgMinutes = totalMinutes / count;

    // 设置标签
    let periodLabel, totalLabel, avgLabel;
    const now = new Date();

    if (periodType === 'week') {
      const startDate = this._getMonday(now, offset);
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);
      const fmt = d => `${d.getMonth() + 1}/${d.getDate()}`;
      periodLabel = `${fmt(startDate)}-${fmt(endDate)}`;
      totalLabel = '本周';
      avgLabel = '日均';
    } else if (periodType === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      periodLabel = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      totalLabel = '本月';
      avgLabel = '日均';
    } else if (periodType === 'year') {
      const year = now.getFullYear() - offset;
      periodLabel = `${year}`;
      totalLabel = '本年';
      avgLabel = '月均';
    } else if (periodType === 'all') {
      periodLabel = '年度时长';
      totalLabel = '累计';
      avgLabel = '年均';
    }

    const hasData = totalMinutes > 0;

    // 缓存数据用于渲染
    this._cachedData = data;
    this._cachedPeriodType = periodType;

    this.setData({
      periodLabel,
      totalLabel,
      avgLabel,
      totalHours: this._formatHours(totalMinutes),
      avgHours: this._formatHours(avgMinutes),
      hasData
    }, () => {
      // canvas 已就绪时渲染
      if (this._canvasReady && hasData) {
        this._renderChart(data, periodType);
      }
    });
  },

  _renderFromCache() {
    this._canvasReady = true;
    if (this._cachedData && this.data.hasData) {
      this._renderChart(this._cachedData, this._cachedPeriodType);
    }
  },

  _renderChart(data, periodType) {
    // 获取 canvas 真实显示尺寸（受卡片 margin/padding 影响，小于 windowWidth）
    // 必须按实际尺寸渲染，否则右侧被裁剪，最后一根柱子显示不全
    const query = wx.createSelectorQuery().in(this);
    query.select('.chart-canvas').boundingClientRect(rect => {
      const chartWidth = (rect && rect.width) || wx.getWindowInfo().windowWidth;
      const chartHeight = (rect && rect.height) || 200;

      // 如果已存在图表实例，先销毁
      this.chart = null;

      this.chart = new wxCharts({
        canvasId: 'statsChart',
        type: 'column',
        categories: data.map(d => d.label),
        series: [{
          name: '时长',
          data: data.map(d => +(d.minutes / 60).toFixed(2)),
          color: '#4a90d9'
        }],
        yAxis: {
          format: function (val) {
            return val.toFixed(1) + 'h';
          }
        },
        xAxis: {
          disableGrid: true
        },
        enableScroll: periodType !== 'week',
        extra: {
          column: {
            width: 28
          }
        },
        width: chartWidth,
        height: chartHeight,
        dataLabel: true,
        legend: false,
        animation: true
      });
    }).exec();
  },

  _getMonday(now, offset) {
    const dayOfWeek = now.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday);
    return new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - offset * 7);
  },

  _getPeriodData(periodType, offset) {
    const now = new Date();
    const all = checkin.getAll();
    const result = [];

    if (periodType === 'week') {
      const startDate = this._getMonday(now, offset);
      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
        const day = this._dayStr(d);
        const list = all[day] || [];
        const minutes = list.reduce((s, c) => s + c.durationMinutes, 0);
        const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
        result.push({
          id: day,
          label: weekday,
          minutes,
          isToday: offset === 0 && i === (now.getDay() === 0 ? 6 : now.getDay() - 1)
        });
      }
    } else if (periodType === 'month') {
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const year = d.getFullYear();
      const month = d.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const day = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const list = all[day] || [];
        const minutes = list.reduce((s, c) => s + c.durationMinutes, 0);
        result.push({
          id: day,
          label: `${i}日`,
          minutes,
          isToday: offset === 0 && i === now.getDate()
        });
      }
    } else if (periodType === 'year') {
      const year = now.getFullYear() - offset;
      for (let m = 0; m < 12; m++) {
        const ym = `${year}-${String(m + 1).padStart(2, '0')}`;
        let minutes = 0;
        for (const day in all) {
          if (day.startsWith(ym)) {
            minutes += all[day].reduce((s, c) => s + c.durationMinutes, 0);
          }
        }
        result.push({
          id: ym,
          label: `${m + 1}月`,
          minutes,
          isToday: offset === 0 && m === now.getMonth()
        });
      }
    } else if (periodType === 'all') {
      // 按年统计：收集所有有数据的年份
      const yearsSet = new Set();
      for (const day in all) {
        if (all[day].length > 0) {
          yearsSet.add(day.substring(0, 4));
        }
      }
      const years = Array.from(yearsSet).sort();
      for (const year of years) {
        let minutes = 0;
        for (const day in all) {
          if (day.startsWith(year) && all[day].length > 0) {
            minutes += all[day].reduce((s, c) => s + c.durationMinutes, 0);
          }
        }
        result.push({
          id: year,
          label: `${year}年`,
          minutes,
          isToday: year === String(now.getFullYear())
        });
      }
    }

    return result;
  },

  _formatHours(minutes) {
    if (minutes === 0) return '0';
    const hours = minutes / 60;
    return hours.toFixed(2).replace(/\.?0+$/, '');
  },

  _dayStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
});
