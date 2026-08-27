const checkin = require('../../utils/checkin.js');
const wxCharts = require('../../utils/wxcharts-min.js');
const data = require('../../utils/data.js');

Page({
  data: {
    totalCount: 0,
    stageCount: 0,
    hasData: false,
    readList: []
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
    const allCounts = checkin.getAllReadCounts();
    const stages = data.routeData.stages;

    const readList = [];
    const stageReadMap = {};

    for (const key in allCounts) {
      const parts = key.split('|');
      if (parts.length >= 3) {
        const stageId = parts[0];
        const groupKey = parts[1];
        const resourceName = parts[2];
        const count = allCounts[key];

        const stage = stages.find(s => s.stage_id === stageId);
        const stageName = stage ? stage.stage_name : stageId;

        readList.push({
          id: key,
          stageId,
          stageName,
          groupKey,
          resourceName,
          count
        });

        if (!stageReadMap[stageId]) {
          stageReadMap[stageId] = { stageName, count: 0 };
        }
        stageReadMap[stageId].count += count;
      }
    }

    const totalCount = checkin.totalReadCountAll();
    const stageCount = Object.keys(stageReadMap).length;
    const hasData = totalCount > 0;

    readList.sort((a, b) => b.count - a.count);

    const stageData = stages.map(s => ({
      stageId: s.stage_id,
      stageName: s.stage_name,
      count: stageReadMap[s.stage_id] ? stageReadMap[s.stage_id].count : 0
    }));

    this._cachedStageData = stageData;

    this.setData({
      totalCount,
      stageCount,
      hasData,
      readList
    }, () => {
      if (this._canvasReady && hasData) {
        this._renderChart(stageData);
      }
    });
  },

  onReady() {
    this._canvasReady = true;
    if (this._cachedStageData && this.data.hasData) {
      this._renderChart(this._cachedStageData);
    }
  },

  _renderChart(stageData) {
    // 获取 canvas 真实显示尺寸（受容器/卡片 padding 影响，小于 windowWidth）
    // 按实际尺寸渲染，避免右侧被裁剪
    const query = wx.createSelectorQuery().in(this);
    query.select('.chart-canvas').boundingClientRect(rect => {
      const chartWidth = (rect && rect.width) || wx.getWindowInfo().windowWidth;
      const chartHeight = (rect && rect.height) || 200;

      const categories = stageData.map(d => d.stageName);
      const seriesData = stageData.map(d => d.count);

      this.chart = null;

      this.chart = new wxCharts({
        canvasId: 'readChart',
        type: 'column',
        categories: categories,
        series: [{
          name: '次数',
          data: seriesData,
          color: '#4a90d9'
        }],
        yAxis: {
          format: function (val) {
            return Math.round(val) + '';
          }
        },
        xAxis: {
          disableGrid: true
        },
        enableScroll: true,
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
  }
});