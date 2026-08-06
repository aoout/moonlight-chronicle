(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var warn = style.getPropertyValue('--warn').trim();

  var scenes = ['空闲', '轻负载', '中等负载', '高负载', 'Boss 战', '弹幕风暴', '粒子狂欢'];
  var beforeTotal = [16.67, 16.67, 18.12, 28.30, 16.67, 49.83, 21.10];
  var afterTotal = [16.67, 16.67, 18.18, 28.57, 16.67, 50.00, 20.51];
  var beforeRender = [0.15, 3.22, 6.32, 15.24, 1.39, 1.19, 1.11];
  var afterRender = [0.15, 3.35, 6.73, 15.58, 1.50, 1.31, 0.98];
  var droppedDelta = [0, 0, 1, 13, 0, -2, -1];
  var improvement = beforeTotal.map(function (v, i) {
    return +(((v - afterTotal[i]) / v) * 100).toFixed(2);
  });

  function axisBase() {
    return {
      axisLabel: { color: muted },
      axisLine: { lineStyle: { color: rule } },
      splitLine: { lineStyle: { color: rule } }
    };
  }

  function makeChart(id, option) {
    var el = document.getElementById(id);
    if (!el) return;
    var chart = echarts.init(el, null, { renderer: 'svg' });
    chart.setOption(option);
    window.addEventListener('resize', function () { chart.resize(); });
  }

  makeChart('chart-total-avg', {
    animation: false,
    color: [muted, accent],
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: { top: 0, textStyle: { color: muted } },
    grid: { left: 42, right: 18, top: 48, bottom: 74 },
    xAxis: Object.assign({ type: 'category', data: scenes, axisLabel: { rotate: 32, color: muted } }, axisBase()),
    yAxis: Object.assign({ type: 'value', name: 'ms', nameTextStyle: { color: muted } }, axisBase()),
    series: [
      { name: '优化前', type: 'bar', data: beforeTotal, barMaxWidth: 24 },
      { name: '优化后', type: 'bar', data: afterTotal, barMaxWidth: 24 }
    ]
  });

  makeChart('chart-render-avg', {
    animation: false,
    color: [muted, warn],
    tooltip: { trigger: 'axis', appendToBody: true },
    legend: { top: 0, textStyle: { color: muted } },
    grid: { left: 42, right: 18, top: 48, bottom: 74 },
    xAxis: Object.assign({ type: 'category', data: scenes, axisLabel: { rotate: 32, color: muted } }, axisBase()),
    yAxis: Object.assign({ type: 'value', name: 'ms', nameTextStyle: { color: muted } }, axisBase()),
    series: [
      { name: '优化前', type: 'bar', data: beforeRender, barMaxWidth: 24 },
      { name: '优化后', type: 'bar', data: afterRender, barMaxWidth: 24 }
    ]
  });

  makeChart('chart-dropped-delta', {
    animation: false,
    tooltip: { trigger: 'axis', appendToBody: true },
    grid: { left: 42, right: 18, top: 28, bottom: 74 },
    xAxis: Object.assign({ type: 'category', data: scenes, axisLabel: { rotate: 32, color: muted } }, axisBase()),
    yAxis: Object.assign({ type: 'value', name: '帧', nameTextStyle: { color: muted } }, axisBase()),
    series: [{
      name: '掉帧变化',
      type: 'bar',
      data: droppedDelta,
      barMaxWidth: 28,
      itemStyle: {
        color: function (params) {
          return params.value <= 0 ? accent : accent2;
        }
      },
      label: {
        show: true,
        position: 'top',
        color: ink,
        formatter: function (p) { return p.value > 0 ? '+' + p.value : String(p.value); }
      }
    }]
  });

  makeChart('chart-improvement', {
    animation: false,
    tooltip: {
      trigger: 'axis',
      appendToBody: true,
      valueFormatter: function (v) { return v + '%'; }
    },
    grid: { left: 52, right: 18, top: 28, bottom: 74 },
    xAxis: Object.assign({ type: 'category', data: scenes, axisLabel: { rotate: 32, color: muted } }, axisBase()),
    yAxis: Object.assign({ type: 'value', name: '%', nameTextStyle: { color: muted } }, axisBase()),
    visualMap: {
      show: false,
      min: -1,
      max: 3,
      inRange: { color: [accent2, bg2, accent] }
    },
    series: [{
      name: '平均帧耗时收益',
      type: 'bar',
      data: improvement,
      barMaxWidth: 28,
      itemStyle: {
        color: function (params) {
          return params.value >= 0 ? accent : accent2;
        }
      },
      label: {
        show: true,
        position: 'top',
        color: ink,
        formatter: function (p) { return (p.value > 0 ? '+' : '') + p.value + '%'; }
      }
    }]
  });
})();
