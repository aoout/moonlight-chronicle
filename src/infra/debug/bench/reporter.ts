/* =========================================================
   蚀月远征 · 基准测试：报告生成与对比工具
   ========================================================= */
import type { BenchReport, BenchResult, BenchComparison, DeltaRow, EntityCounts, Stats } from './types.js';

/** 格式化毫秒 */
function ms(v: number): string {
  return v.toFixed(2) + 'ms';
}

/** 格式化百分比变化 */
function pct(v: number | null): string {
  if (v === null) return 'N/A';
  const sign = v > 0 ? '+' : '';
  return sign + v.toFixed(1) + '%';
}

/** 分隔线 */
function sep(char: string = '=', len: number = 72): string {
  return char.repeat(len);
}

/** 格式化单元格（右对齐，固定宽度 8 字符） */
function cell(v: number): string {
  return ms(v).padStart(8);
}

/** 格式化实体数量 */
function fmtEntities(ec: EntityCounts): string {
  const parts: string[] = [];
  if (ec.enemies) parts.push(`敌${ec.enemies}`);
  if (ec.projectiles) parts.push(`弹${ec.projectiles}`);
  if (ec.particles) parts.push(`粒${ec.particles}`);
  if (ec.drops) parts.push(`落${ec.drops}`);
  if (ec.phantoms) parts.push(`影${ec.phantoms}`);
  return parts.join(' ') || '空';
}

function topSystems(r: BenchResult, limit: number = 6): [string, Stats][] {
  return Object.entries(r.systems || {})
    .sort((a, b) => b[1].avg - a[1].avg)
    .slice(0, limit);
}

function fmtMode(mode: BenchResult['mode']): string {
  return mode === 'simulation' ? '真实模拟' : '固定负载';
}

/* ========== 报告生成 ========== */

/** 生成可读报告文本 */
export function generateReportText(report: BenchReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(sep('='));
  lines.push('  蚀月远征 · 基准测试报告');
  lines.push('  ' + sep('-', 66));
  lines.push(`  标签：${report.label}`);
  lines.push(`  时间：${new Date(report.timestamp).toLocaleString()}`);
  lines.push(`  环境：${report.env.userAgent}`);
  lines.push(`  画布：${report.env.canvasSize} | DPR: ${report.env.devicePixelRatio}`);
  lines.push(`  设置：${report.env.settings}`);
  lines.push(sep('='));

  for (const r of report.results) {
    const fpsMin = (1000 / r.total.max).toFixed(1);
    const fpsAvg = (1000 / r.total.avg).toFixed(1);
    const fpsP95 = (1000 / r.total.p95).toFixed(1);
    const fpsP99 = (1000 / r.total.p99).toFixed(1);

    lines.push('');
    lines.push(`  [${r.name}]  ${fmtMode(r.mode)}  ${r.frameCount} 帧 / ${r.duration}s 采样`);
    lines.push(`  掉帧：${r.droppedFrames}  |  实体：${fmtEntities(r.entities)}`);
    lines.push('  ' + sep('-', 66));
    lines.push('  ' + [
      '指标'.padEnd(10),
      '平均'.padStart(8),
      '最小'.padStart(8),
      '最大'.padStart(8),
      'P95'.padStart(8),
      'P99'.padStart(8),
    ].join(' '));
    lines.push('  ' + sep('-', 66));
    lines.push('  ' + [
      '帧总耗时'.padEnd(10),
      cell(r.total.avg),
      cell(r.total.min),
      cell(r.total.max),
      cell(r.total.p95),
      cell(r.total.p99),
    ].join(' '));
    if (r.update) {
      lines.push('  ' + [
        '逻辑耗时'.padEnd(10),
        cell(r.update.avg),
        cell(r.update.min),
        cell(r.update.max),
        cell(r.update.p95),
        cell(r.update.p99),
      ].join(' '));
    }
    lines.push('  ' + [
      '渲染耗时'.padEnd(10),
      cell(r.render.avg),
      cell(r.render.min),
      cell(r.render.max),
      cell(r.render.p95),
      cell(r.render.p99),
    ].join(' '));
    lines.push('  ' + [
      '等效 FPS'.padEnd(10),
      fpsAvg.padStart(8),
      fpsMin.padStart(8),
      fpsP95.padStart(8),
      fpsP99.padStart(8),
    ].join(' '));

    const systems = topSystems(r);
    if (systems.length > 0) {
      lines.push('');
      lines.push('  系统耗时 Top（update 平均）');
      for (const [name, stat] of systems) {
        lines.push(`    ${name.padEnd(20)} ${ms(stat.avg).padStart(8)}  P95 ${ms(stat.p95).padStart(8)}  Max ${ms(stat.max).padStart(8)}`);
      }
    }
  }

  lines.push('');
  lines.push(sep('='));
  lines.push('  报告结束');
  lines.push(sep('='));
  return lines.join('\n');
}

/* ========== 对比分析 ========== */

/** 计算百分比变化（正值 = 当前比基线更好：帧时间越小越好） */
function deltaPct(baseline: number, current: number): number {
  if (baseline === 0) return current === 0 ? 0 : 100;
  return ((baseline - current) / baseline) * 100;
}

/** 对比两次报告 */
export function compareReports(baseline: BenchReport, current: BenchReport): BenchComparison {
  const baselineMap = new Map(baseline.results.map(r => [r.name, r]));
  const deltas: DeltaRow[] = [];

  for (const cur of current.results) {
    const base = baselineMap.get(cur.name);
    if (!base) {
      deltas.push({
        scenario: cur.name,
        totalAvg: null, totalP95: null,
        renderAvg: null, renderP95: null,
        droppedFramesDelta: null,
      });
      continue;
    }
    deltas.push({
      scenario: cur.name,
      totalAvg: deltaPct(base.total.avg, cur.total.avg),
      totalP95: deltaPct(base.total.p95, cur.total.p95),
      renderAvg: deltaPct(base.render.avg, cur.render.avg),
      renderP95: deltaPct(base.render.p95, cur.render.p95),
      droppedFramesDelta: cur.droppedFrames - base.droppedFrames,
    });
  }

  return { baseline, current, deltas };
}

/** 生成对比报告文本 */
export function generateComparisonText(cmp: BenchComparison): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(sep('='));
  lines.push('  蚀月远征 · 性能对比报告');
  lines.push('  ' + sep('-', 66));
  lines.push(`  基线：${cmp.baseline.label} (${new Date(cmp.baseline.timestamp).toLocaleString()})`);
  lines.push(`  当前：${cmp.current.label} (${new Date(cmp.current.timestamp).toLocaleString()})`);
  lines.push(sep('='));
  lines.push('  说明：正数(↑) 表示性能提升，负数(↓) 表示性能回退');
  lines.push(sep('-'));

  // 自动评级
  let totalImprovement = 0;
  let regressedScenarios = 0;

  for (const d of cmp.deltas) {
    const avgStr = pct(d.totalAvg);
    const p95Str = pct(d.totalP95);
    const rAvgStr = pct(d.renderAvg);
    const dropStr = d.droppedFramesDelta !== null
      ? (d.droppedFramesDelta > 0 ? `+${d.droppedFramesDelta}` : `${d.droppedFramesDelta}`)
      : 'N/A';

    if (d.totalAvg !== null) totalImprovement += d.totalAvg;
    if (d.totalAvg !== null && d.totalAvg < 0) regressedScenarios++;

    lines.push('');
    lines.push(`  [${d.scenario}]`);
    lines.push(`    帧总耗时：平均 ${avgStr}  |  P95 ${p95Str}`);
    lines.push(`    渲染耗时：平均 ${rAvgStr}  |  P95 ${pct(d.renderP95)}`);
    lines.push(`    掉帧变化：${dropStr}`);
  }

  // 总体评价
  lines.push('');
  lines.push(sep('-'));
  const avgImprov = cmp.deltas.filter(d => d.totalAvg !== null).length > 0
    ? (totalImprovement / cmp.deltas.filter(d => d.totalAvg !== null).length).toFixed(1)
    : 'N/A';
  lines.push(`  平均变化：${avgImprov}%  |  回退场景：${regressedScenarios}/${cmp.deltas.length}`);
  lines.push(sep('='));
  lines.push('  对比结束');
  lines.push(sep('='));
  return lines.join('\n');
}

/* ========== HTML 报告 ========== */

/** 生成 HTML 报告 */
export function generateReportHTML(report: BenchReport): string {
  const rows = report.results.map(r => {
    const fpsAvg = (1000 / r.total.avg).toFixed(1);
    const fpsP95 = (1000 / r.total.p95).toFixed(1);
    const isGood = r.total.avg < 16.67;
    const isWarn = r.total.avg < 33.33;
    const status = isGood ? '流畅' : isWarn ? '可玩' : '卡顿';
    const statusCls = isGood ? 'good' : isWarn ? 'warn' : 'bad';
    return `<tr>
      <td>${r.name}</td>
      <td>${fmtMode(r.mode)}</td>
      <td>${r.frameCount}</td>
      <td class="${r.droppedFrames > 0 ? 'bad' : ''}">${r.droppedFrames}</td>
      <td>${r.total.avg.toFixed(2)}</td>
      <td>${r.total.p95.toFixed(2)}</td>
      <td>${r.total.p99.toFixed(2)}</td>
      <td>${r.update ? r.update.avg.toFixed(2) : '-'}</td>
      <td>${r.work ? r.work.avg.toFixed(2) : '-'}</td>
      <td>${r.render.avg.toFixed(2)}</td>
      <td>${r.render.p95.toFixed(2)}</td>
      <td>${fpsAvg}</td>
      <td>${fpsP95}</td>
      <td class="entities">${fmtEntities(r.entities)}</td>
      <td class="${statusCls}">${status}</td>
    </tr>`;
  }).join('\n      ');
  const systemRows = report.results.map(r => {
    const rows = topSystems(r, 10).map(([name, stat]) => `<tr>
      <td>${name}</td>
      <td>${stat.avg.toFixed(3)}</td>
      <td>${stat.p95.toFixed(3)}</td>
      <td>${stat.max.toFixed(3)}</td>
      <td>${stat.stdDev.toFixed(3)}</td>
    </tr>`).join('\n          ');
    return `<section class="system-section">
  <h2>${r.name} · 系统耗时分解</h2>
  <table>
    <thead><tr><th>System</th><th>平均(ms)</th><th>P95(ms)</th><th>最大(ms)</th><th>标准差</th></tr></thead>
    <tbody>
          ${rows || '<tr><td colspan="5">无系统耗时数据</td></tr>'}
    </tbody>
  </table>
</section>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>蚀月远征 · 基准测试报告</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: #0a0e1a; color: #c8d0e0; padding: 24px; line-height: 1.6;
  }
  h1 { color: #e8d48b; font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  h2 { color: #e8d48b; font-size: 16px; font-weight: 600; margin: 22px 0 8px; }
  .subtitle { color: #6a6e8a; font-size: 13px; margin-bottom: 20px; }
  .meta { background: #101426; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; color: #8890a8; }
  .meta div { margin: 2px 0; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th {
    background: #12162a; color: #e8d48b; font-weight: 600;
    padding: 10px 12px; text-align: right; border-bottom: 2px solid #1a1e3a;
    white-space: nowrap;
  }
  th:first-child, td:first-child { text-align: left; }
  td {
    padding: 8px 12px; text-align: right; border-bottom: 1px solid #14182a;
    font-variant-numeric: tabular-nums;
  }
  tr:hover td { background: #0e1226; }
  .good { color: #7fd6a4; }
  .warn { color: #f6e3b8; }
  .bad { color: #e2546a; }
  .entities { color: #6a7e9a; font-size: 12px; }
  .system-section { margin-top: 22px; }
  .footer { margin-top: 16px; color: #4a4e6a; font-size: 12px; }
  @media (prefers-color-scheme: light) {
    body { background: #f4f4f8; color: #2a2e3a; }
    .meta { background: #e8e8f0; }
    th { background: #d8d8e4; color: #5a3e1a; }
    td { border-bottom-color: #d0d0dc; }
    tr:hover td { background: #ececf4; }
    .entities { color: #6a7a8a; }
    .footer { color: #8a8a9a; }
  }
</style>
</head>
<body>
<h1>蚀月远征 · 基准测试报告</h1>
<div class="subtitle">${report.label} &mdash; ${new Date(report.timestamp).toLocaleString()}</div>
<div class="meta">
  <div>环境：${report.env.userAgent}</div>
  <div>画布：${report.env.canvasSize} | DPR：${report.env.devicePixelRatio} | 设置：${report.env.settings}</div>
</div>
<table>
  <thead>
    <tr>
      <th>场景</th>
      <th>模式</th>
      <th>帧数</th>
      <th>掉帧</th>
      <th>平均(ms)</th>
      <th>P95(ms)</th>
      <th>P99(ms)</th>
      <th>逻辑(ms)</th>
      <th>工作(ms)</th>
      <th>渲染(ms)</th>
      <th>渲染P95</th>
      <th>FPS</th>
      <th>FPS P95</th>
      <th>实体</th>
      <th>状态</th>
    </tr>
  </thead>
  <tbody>
      ${rows}
  </tbody>
</table>
${systemRows}
<div class="footer">
  固定负载=稳定实体数用于对比优化影响 | 真实模拟=保留敌人技能/命中/衍生实体用于观察实战表现 | 流畅=≤60fps(16.67ms) | 可玩=30-60fps(16.67-33.33ms) | 卡顿=&lt;30fps(33.33ms+) | 逻辑=update 耗时 | 工作=update+render 实测耗时
</div>
</body>
</html>`;
}

/** 生成对比 HTML 报告 */
export function generateComparisonHTML(cmp: BenchComparison): string {
  const rows = cmp.deltas.map(d => {
    const avgStr = pct(d.totalAvg);
    const p95Str = pct(d.totalP95);
    const rAvgStr = pct(d.renderAvg);
    const rP95Str = pct(d.renderP95);
    return `<tr>
      <td>${d.scenario}</td>
      <td class="${d.totalAvg !== null ? (d.totalAvg > 0 ? 'good' : d.totalAvg < -3 ? 'bad' : 'warn') : ''}">${avgStr}</td>
      <td class="${d.totalP95 !== null ? (d.totalP95 > 0 ? 'good' : d.totalP95 < -3 ? 'bad' : 'warn') : ''}">${p95Str}</td>
      <td class="${d.renderAvg !== null ? (d.renderAvg > 0 ? 'good' : d.renderAvg < -3 ? 'bad' : 'warn') : ''}">${rAvgStr}</td>
      <td class="${d.renderP95 !== null ? (d.renderP95 > 0 ? 'good' : d.renderP95 < -3 ? 'bad' : 'warn') : ''}">${rP95Str}</td>
      <td class="${d.droppedFramesDelta !== null ? (d.droppedFramesDelta > 0 ? 'bad' : d.droppedFramesDelta < 0 ? 'good' : '') : ''}">
        ${d.droppedFramesDelta !== null ? (d.droppedFramesDelta > 0 ? '+' : '') + d.droppedFramesDelta : 'N/A'}
      </td>
    </tr>`;
  }).join('\n      ');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>蚀月远征 · 性能对比报告</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    background: #0a0e1a; color: #c8d0e0; padding: 24px; line-height: 1.6;
  }
  h1 { color: #e8d48b; font-size: 22px; font-weight: 600; margin-bottom: 4px; }
  .subtitle { color: #6a6e8a; font-size: 13px; margin-bottom: 20px; }
  .meta { background: #101426; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: #8890a8; }
  .note { color: #5a5e7a; font-size: 12px; margin-bottom: 16px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th {
    background: #12162a; color: #e8d48b; font-weight: 600;
    padding: 10px 12px; text-align: right; border-bottom: 2px solid #1a1e3a;
    white-space: nowrap;
  }
  th:first-child, td:first-child { text-align: left; }
  td {
    padding: 8px 12px; text-align: right; border-bottom: 1px solid #14182a;
    font-variant-numeric: tabular-nums;
  }
  tr:hover td { background: #0e1226; }
  .good { color: #7fd6a4; }
  .warn { color: #f6e3b8; }
  .bad { color: #e2546a; }
  @media (prefers-color-scheme: light) {
    body { background: #f4f4f8; color: #2a2e3a; }
    .meta, th { background: #e8e8f0; }
    th { color: #5a3e1a; }
    td { border-bottom-color: #d0d0dc; }
    tr:hover td { background: #ececf4; }
  }
</style>
</head>
<body>
<h1>蚀月远征 · 性能对比报告</h1>
<div class="subtitle">基线 vs 当前</div>
<div class="meta">
  <div>基线：${cmp.baseline.label} (${new Date(cmp.baseline.timestamp).toLocaleString()})</div>
  <div>当前：${cmp.current.label} (${new Date(cmp.current.timestamp).toLocaleString()})</div>
</div>
<div class="note">正值(↑) 表示性能提升，负值(↓) 表示性能回退。帧时间越小越好。</div>
<table>
  <thead>
    <tr>
      <th>场景</th>
      <th>帧总耗时<br>平均变化</th>
      <th>帧总耗时<br>P95变化</th>
      <th>渲染耗时<br>平均变化</th>
      <th>渲染耗时<br>P95变化</th>
      <th>掉帧变化</th>
    </tr>
  </thead>
  <tbody>
      ${rows}
  </tbody>
</table>
</body>
</html>`;
}
