#!/usr/bin/env node
/* =========================================================
   蚀月远征 · Headless 压测 CLI
   ---------------------------------------------------------
   用法：
     node scripts/bench/run.mjs                       跑全部场景
     node scripts/bench/run.mjs --tags=late           只跑后期高压场景
     node scripts/bench/run.mjs --scenarios=late_150
     node scripts/bench/run.mjs --out=perf/base.json  存基线
     node scripts/bench/run.mjs --baseline=perf/base.json --html=perf/report.html
     node scripts/bench/run.mjs --list                列出场景
     node scripts/bench/run.mjs --no-render           只测逻辑层

   退出码：
     0  正常 / 无回归
     1  运行失败
     2  检出统计显著的性能回归（--gate 时启用）
   ========================================================= */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { installHost } from './host.mjs';
import { loadGame } from './load.mjs';
import { buildScenarios } from './scenarios.mjs';
import { createRunner } from './runner.mjs';
import { compareSamples } from './stats.mjs';
import { renderHtmlReport } from './report.mjs';

/* ---------- 参数解析 ---------- */
function parseArgs(argv) {
  const o = {
    scenarios: null, tags: null, out: null, baseline: null, html: null,
    render: true, list: false, gate: false, label: '', gateThreshold: 5,
  };
  for (const a of argv.slice(2)) {
    const [k, v] = a.includes('=') ? a.split(/=(.*)/s) : [a, ''];
    switch (k) {
      case '--scenarios': o.scenarios = v.split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--tags': o.tags = v.split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--out': o.out = v; break;
      case '--baseline': o.baseline = v; break;
      case '--html': o.html = v; break;
      case '--label': o.label = v; break;
      case '--no-render': o.render = false; break;
      case '--list': o.list = true; break;
      case '--gate': o.gate = true; break;
      case '--threshold': o.gateThreshold = Number(v) || 5; break;
      default:
        if (k.startsWith('--')) console.warn(`忽略未知参数: ${k}`);
    }
  }
  return o;
}

/* ---------- 控制台输出 ---------- */
const C = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

const fx = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '-');
const pad = (s, w, right = true) => {
  // 中文占两列宽，按显示宽度对齐而非字符数
  const width = [...String(s)].reduce((n, ch) => n + (/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch) ? 2 : 1), 0);
  const fill = ' '.repeat(Math.max(0, w - width));
  return right ? s + fill : fill + s;
};

function printScenarioLine(r) {
  const budget = 1000 / 60;
  const p95 = r.total.p95;
  const mark = p95 > budget ? C.red('■') : p95 > budget * 0.5 ? C.yellow('▲') : C.green('●');
  console.log(
    `  ${mark} ${pad(r.label, 18)}` +
    `${pad(`${r.entities.enemies}敌`, 8, false)} ` +
    `${pad(`${fx(r.total.median)}ms`, 10, false)} ` +
    `${pad(`p95 ${fx(p95)}`, 12, false)} ` +
    `${pad(`upd ${fx(r.update.median)}`, 11, false)} ` +
    `${pad(`rnd ${fx(r.render.median)}`, 11, false)} ` +
    `${pad(`${Math.round(r.draw.ops.median)} ops`, 11, false)} ` +
    `${pad(`${Math.round(r.draw.canvasRealloc.median)} realloc`, 14, false)}`,
  );
}

/* ---------- 主流程 ---------- */
async function main() {
  const opts = parseArgs(process.argv);
  const t0 = Date.now();

  const host = installHost();
  console.log(C.dim('› 启动 Vite SSR 并加载游戏模块…'));
  const m = await loadGame({ host });

  let scenarios = buildScenarios(m);

  if (opts.list) {
    console.log(C.bold('\n可用场景:\n'));
    for (const s of scenarios) {
      console.log(`  ${C.cyan(pad(s.id, 16))}${pad(s.label, 16)}${C.dim(s.desc)}`);
      console.log(`  ${' '.repeat(16)}${C.dim(`mode=${s.mode} frames=${s.frames} tags=[${(s.tags || []).join(',')}]`)}`);
    }
    await m.close();
    return 0;
  }

  if (opts.scenarios) scenarios = scenarios.filter((s) => opts.scenarios.includes(s.id));
  if (opts.tags) scenarios = scenarios.filter((s) => (s.tags || []).some((t) => opts.tags.includes(t)));
  if (scenarios.length === 0) {
    console.error(C.red('没有匹配的场景'));
    await m.close();
    return 1;
  }

  const runner = createRunner(m, host);

  console.log(C.bold(`\n蚀月远征 · Headless 性能压测`));
  console.log(C.dim(`  场景 ${scenarios.length} 个 · 渲染 ${opts.render ? '开' : '关'} · 分辨率 1280×720`));
  console.log(C.dim('  ' + '─'.repeat(78)));

  const results = [];
  const tty = process.stdout.isTTY;
  for (const sc of scenarios) {
    if (tty) process.stdout.write(C.dim(`  跑 ${sc.id}…`));
    const r = runner.runScenario(sc, { renderEnabled: opts.render });
    results.push(r);
    if (tty) process.stdout.write(`\r${' '.repeat(40)}\r`);
    printScenarioLine(r);
  }

  console.log(C.dim('  ' + '─'.repeat(78)));

  /* ----- 帧预算告警 ----- */
  const over = results.filter((r) => r.overBudgetPct > 1);
  if (over.length) {
    console.log(C.yellow('\n⚠ 超出 16.67ms 帧预算的场景（JS 侧已吃满，GPU 还没算）:'));
    for (const r of over) {
      console.log(`    ${r.label}: ${fx(r.overBudgetPct, 1)}% 的帧超预算 (${r.overBudgetFrames}/${r.frames})`);
    }
  }

  /* ----- 与基线对比 ----- */
  let comparison = null;
  if (opts.baseline && existsSync(opts.baseline)) {
    const base = JSON.parse(readFileSync(opts.baseline, 'utf8'));
    comparison = compareRuns(base, { results });
    printComparison(comparison, opts.gateThreshold);
  } else if (opts.baseline) {
    console.log(C.yellow(`\n基线文件不存在，跳过对比: ${opts.baseline}`));
  }

  /* ----- 落盘 ----- */
  const payload = {
    schema: 1,
    label: opts.label || (opts.baseline ? 'current' : 'baseline'),
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - t0,
    env: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpus: (await import('node:os')).cpus()[0]?.model ?? 'unknown',
    },
    renderEnabled: opts.render,
    results,
  };

  if (opts.out) {
    mkdirSync(dirname(resolve(opts.out)), { recursive: true });
    writeFileSync(opts.out, JSON.stringify(payload, roundReplacer, 1));
    console.log(C.dim(`\n› 结果已写入 ${opts.out}`));
  }

  if (opts.html) {
    mkdirSync(dirname(resolve(opts.html)), { recursive: true });
    const baseData = opts.baseline && existsSync(opts.baseline)
      ? JSON.parse(readFileSync(opts.baseline, 'utf8'))
      : null;
    writeFileSync(opts.html, renderHtmlReport(payload, baseData, comparison));
    console.log(C.dim(`› 报告已生成 ${opts.html}`));
  }

  console.log(C.dim(`› 总耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s\n`));

  await m.close();

  if (opts.gate && comparison) {
    const regressions = comparison.filter((c) => c.significant && c.improvePct < -opts.gateThreshold);
    if (regressions.length) {
      console.error(C.red(`✗ 检出 ${regressions.length} 处显著性能回归，门禁未通过`));
      return 2;
    }
    console.log(C.green('✓ 无显著性能回归，门禁通过'));
  }
  return 0;
}

/** JSON 序列化时压缩浮点位数，避免基线文件被 17 位小数撑爆 */
function roundReplacer(_k, v) {
  return typeof v === 'number' && !Number.isInteger(v) ? Number(v.toFixed(4)) : v;
}

function compareRuns(base, cur) {
  const byId = new Map(base.results.map((r) => [r.id, r]));
  const out = [];
  for (const r of cur.results) {
    const b = byId.get(r.id);
    if (!b || !b.raw?.total) continue;
    const cmp = compareSamples(b.raw.total, r.raw.total, 'median');
    out.push({
      id: r.id,
      label: r.label,
      ...cmp,
      baselineP95: b.total.p95,
      currentP95: r.total.p95,
      baselineOps: b.draw?.ops?.median ?? 0,
      currentOps: r.draw?.ops?.median ?? 0,
      baselineRealloc: b.draw?.canvasRealloc?.median ?? 0,
      currentRealloc: r.draw?.canvasRealloc?.median ?? 0,
    });
  }
  return out;
}

function printComparison(cmp, threshold) {
  console.log(C.bold('\n对比基线:'));
  for (const c of cmp) {
    const p = c.improvePct;
    const tag = !c.significant
      ? C.dim('噪声内')
      : p > 0 ? C.green(`↑ 快 ${fx(p, 1)}%`) : C.red(`↓ 慢 ${fx(-p, 1)}%`);
    const ci = C.dim(`[${fx(c.ci95[0], 1)}%, ${fx(c.ci95[1], 1)}%]`);
    const opsDelta = c.currentOps - c.baselineOps;
    const opsTag = opsDelta !== 0 ? C.dim(` ops ${opsDelta > 0 ? '+' : ''}${Math.round(opsDelta)}`) : '';
    console.log(
      `    ${pad(c.label, 18)}${pad(`${fx(c.baselineStat)}→${fx(c.currentStat)}ms`, 18)}${pad(tag, 24)}${ci}${opsTag}`,
    );
  }
  console.log(C.dim(`    显著性判据: 改进率 95% 置信区间不跨 0；门禁阈值 ±${threshold}%`));
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(C.red('压测失败:'), e);
    process.exit(1);
  });
