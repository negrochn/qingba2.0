const checkin = require('../../utils/checkin.js');
const wxCharts = require('../../utils/wxcharts-min.js');
const data = require('../../utils/data.js');

Page({
  data: {
    totalHours: '0',
    avgHours: '0',
    hasData: false
  },

  chart: null,

  onLoad() {
    this._loadData();
  },

  onShow() {
    if (this._canvasReady) {
      this._loadData();
    }
  },

  _loadData() {
    const all = checkin.getAll();
    const stages = data.routeData.stages;
    const curStage = checkin.getCurrentStage();

    const result = [];
    for (const stage of stages) {
      let minutes = 0;
      for (const day in all) {
        if (all[day].length > 0) {
          for (const c of all[day]) {
            if (c.stageId === stage.stage_id) {
              minutes += c.durationMinutes;
            }
          }
        }
      }
      result.push({
        id: stage.stage_id,
        label: stage.stage_name,
        minutes,
        isCurrent: curStage && curStage.stage_id === stage.stage_id
      });
    }

    const totalMinutes = result.reduce((sum, d) => sum + d.minutes, 0);
    const count = result.filter(d => d.minutes > 0).length || 1;
    const avgMinutes = totalMinutes / count;

    const hasData = totalMinutes > 0;

    this._cachedData = result;

    this.setData({
      totalHours: this._formatHours(totalMinutes),
      avgHours: this._formatHours(avgMinutes),
      hasData
    }, () => {
      if (this._canvasReady && hasData) {
        this._renderChart(result);
      }
    });
  },

  onReady() {
    this._canvasReady = true;
    if (this._cachedData && this.data.hasData) {
      this._renderChart(this._cachedData);
    }
  },

  _renderChart(data) {
    const sysInfo = wx.getSystemInfoSync();
    const windowWidth = sysInfo.windowWidth;
    const chartHeight = 250;

    const categories = data.map(d => d.label);
    const seriesData = data.map(d => +(d.minutes / 60).toFixed(2));

    this.chart = null;

    this.chart = new wxCharts({
      canvasId: 'stageChart',
      type: 'column',
      categories: categories,
      series: [{
        name: '时长',
        data: seriesData,
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
      enableScroll: true,
      extra: {
        column: {
          width: 40
        }
      },
      width: windowWidth,
      height: chartHeight,
      dataLabel: true,
      legend: false,
      animation: true
    });
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

  _formatHours(minutes) {
    if (minutes === 0) return '0';
    const hours = minutes / 60;
    return hours.toFixed(2).replace(/\.?0+$/, '');
  }
});