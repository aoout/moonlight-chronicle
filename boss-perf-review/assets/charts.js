/* Trae Work · ECharts 图表 — Boss 技能特效性能审查报告 */
(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var accent3 = style.getPropertyValue('--accent3').trim();
  var green = style.getPropertyValue('--green').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var bg3 = style.getPropertyValue('--bg3').trim();

  /* 图表 1: 各文件 shadowBlur 消除前后对比 (堆叠柱状图) */
  var chart1 = echarts.init(document.getElementById('chart-comparison'));
  chart1.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(10,14,26,0.9)',
      borderColor: 'rgba(212,168,67,0.3)',
      textStyle: { color: '#d0d8e8', fontSize: 12 }
    },
    legend: {
      data: ['优化前', '优化后'],
      textStyle: { color: muted, fontSize: 12 },
      top: 0
    },
    grid: {
      left: 60,
      right: 30,
      top: 40,
      bottom: 30
    },
    xAxis: {
      type: 'category',
      data: ['projectiles.ts\n(Boss 弹头)', 'particles.ts\n(复杂粒子)', 'enemies.ts\n(召唤小兵)'],
      axisLabel: {
        color: muted,
        fontSize: 11,
        interval: 0
      },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      name: 'shadowBlur 实例数',
      nameTextStyle: { color: muted, fontSize: 11 },
      axisLabel: { color: muted, fontSize: 11 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } },
      axisLine: { show: false },
      axisTick: { show: false },
      min: 0,
      max: 12
    },
    series: [
      {
        name: '优化前',
        type: 'bar',
        stack: 'total',
        barWidth: 40,
        itemStyle: {
          color: accent2,
          borderRadius: [4, 0, 0, 4]
        },
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 13,
          formatter: function(p) { return p.value > 0 ? p.value : ''; }
        },
        data: [9, 6, 6]
      },
      {
        name: '优化后',
        type: 'bar',
        stack: 'total',
        barWidth: 40,
        itemStyle: {
          color: green,
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'inside',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 13,
          formatter: function(p) { return p.value > 0 ? p.value : ''; }
        },
        data: [0, 0, 0]
      }
    ]
  });

  /* 响应式 */
  window.addEventListener('resize', function() {
    chart1.resize();
  });
})();