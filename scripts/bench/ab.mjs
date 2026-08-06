#!/usr/bin/env node
/* =========================================================
   蚀月远征 · 性能 A/B 交替对拍
   ---------------------------------------------------------
   为什么需要这个工具：

   单次压测里 400 帧的 bootstrap 置信区间只反映「帧间抖动」。
   但同一次进程内的 400 帧共享同一段 CPU 频率、同一个 JIT 状态、
   同一份堆布局 —— 它们高度相关。真正的不确定性藏在「运行之间」：
   同一份代码、逐帧完全一致的工作量，两次运行的均值可以差 50%。

   于是帧内 CI 会窄得离谱，让任何改动看起来都「显著」，
   包括那些其实什么也没做的改动。这是性能测量里最常见的假阳性来源。

   本工具的做法：
     1. 进程隔离 —— 每次运行都是全新的 node 进程，JIT / 堆从零开始。
     2. ABBA 交替 —— 抵消运行序列上的线性漂移（睿频衰减、后台任务）。
     3. 配对比较 —— 相邻的 A/B 视为一对，差值抵消掉共同的时段噪声。
     4. 分层 bootstrap —— 先重采样「运行」，再重采样「帧」，
        让置信区间同时包含两级方差，这才是诚实的区间。

   用法：
     node scripts/bench/ab.mjs --a=perf/variants/A --b=perf/variants/B --rounds=3
   ========================================================= */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* ---------------------------------------------------------
   参数
   --------------------------------------------------------- */
function parseArgs(argv) {
  const o = {
    a: 'perf/variants/A',
    b: 'perf/variants/B',
    aLabel: 'A',
    bLabel: 'B',
    rounds: 3,
    scenarios: null,
    out: 'perf/ab.json',
    html: 'perf/ab.html',
    restore: 'B',
    keepRuns: false,
    boot: 2000,
  };
  for (const raw of argv) {
    const [k, v] = raw.replace(/^--/, '').split('=');
    switch (k) {
      case 'a': o.a = v; break;
      case 'b': o.b = v; break;
      case 'a-label': o.aLabel = v; break;
      case 'b-label': o.bLabel = v; break;
      case 'rounds': o.rounds = Number(v); break;
      case 'scenarios': o.scenarios = v; break;
      case 'out': o.out = v; break;
      case 'html': o.html = v === 'false' ? null : v; break;
      case 'restore': o.restore = v; break;
      case 'keep-runs': o.keepRuns = true; break;
      case 'boot': o.boot = Number(v); break;
      default:
        if (k) { console.error(`未知参数 --${k}`); process.exit(1); }
    }
  }
  return o;
}

/* ---------------------------------------------------------
   变体切换：把变体目录里的文件覆盖到工作树对应位置
   --------------------------------------------------------- */
function listFiles(dir, base = dir) {
  /** @type {string[]} */
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else out.push(path.relative(base, p));
  }
  return out;
}

function applyVariant(variantDir) {
  const abs = path.resolve(ROOT, variantDir);
  if (!fs.existsSync(abs)) throw new Error(`变体目录不存在：${variantDir}`);
  const files = listFiles(abs);
  if (!files.length) throw new Error(`变体目录为空：${variantDir}`);
  for (const rel of files) {
    const dst = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(abs, rel), dst);
  }
  return files;
}

/* ---------------------------------------------------------
   跑一次压测（独立进程）
   --------------------------------------------------------- */
function runOnce(tag, outFile, scenarios) {
  // 不传 --html：对拍的每一轮只要原始数据，报告由本工具统一出
  const args = [path.join('scripts', 'bench', 'run.mjs'), `--out=${outFile}`, `--label=${tag}`];
  if (scenarios) args.push(`--scenarios=${scenarios}`);
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NO_COLOR: '1' },
  });
  if (r.status !== 0) {
    console.error(r.stdout || '');
    console.error(r.stderr || '');
    throw new Error(`压测进程退出码 ${r.status}`);
  }
  const p = path.resolve(ROOT, outFile);
  if (!fs.existsSync(p)) throw new Error(`压测未产出 ${outFile}`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/* ---------------------------------------------------------
   统计
   --------------------------------------------------------- */
const median = (xs) => {
  const s = [...xs].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** 从「运行集合」里做一次分层重采样，返回重采样后的总体均值 */
function resampleMean(runs) {
  let acc = 0;
  for (let r = 0; r < runs.length; r++) {
    const run = runs[(Math.random() * runs.length) | 0];
    const n = run.length;
    let s = 0;
    for (let i = 0; i < n; i++) s += run[(Math.random() * n) | 0];
    acc += s / n;
  }
  return acc / runs.length;
}

/**
 * 分层 bootstrap：先重采样运行，再重采样帧。
 * 返回 (A - B) 差值的 95% 区间 与 B 相对 A 的降幅区间。
 */
function stratifiedDiff(runsA, runsB, iters) {
  const diff = new Float64Array(iters);
  const pct = new Float64Array(iters);
  for (let i = 0; i < iters; i++) {
    const a = resampleMean(runsA);
    const b = resampleMean(runsB);
    diff[i] = a - b;
    pct[i] = a > 0 ? ((a - b) / a) * 100 : 0;
  }
  diff.sort();
  pct.sort();
  const lo = (arr) => arr[Math.floor(iters * 0.025)];
  const hi = (arr) => arr[Math.ceil(iters * 0.975) - 1];
  return {
    diffCi: [lo(diff), hi(diff)],
    pctCi: [lo(pct), hi(pct)],
    diffMedian: diff[iters >> 1],
    pctMedian: pct[iters >> 1],
  };
}

/* ---------------------------------------------------------
   主流程
   --------------------------------------------------------- */
async function main() {
  const opt = parseArgs(process.argv.slice(2));
  const variants = { A: opt.a, B: opt.b };
  const labels = { A: opt.aLabel, B: opt.bLabel };

  // ABBA：偶数对正序、奇数对逆序，抵消时间轴上的单调漂移
  /** @type {('A'|'B')[]} */
  const seq = [];
  for (let i = 0; i < opt.rounds; i++) {
    if (i % 2 === 0) seq.push('A', 'B');
    else seq.push('B', 'A');
  }

  console.log('');
  console.log('蚀月远征 · 性能 A/B 交替对拍');
  console.log(`  A = ${labels.A}  (${opt.a})`);
  console.log(`  B = ${labels.B}  (${opt.b})`);
  console.log(`  序列 ${seq.join(' ')}   共 ${seq.length} 次独立进程`);
  console.log('  ' + '─'.repeat(76));

  const tmpDir = path.resolve(ROOT, 'perf/.abruns');
  fs.mkdirSync(tmpDir, { recursive: true });

  /** @type {Record<'A'|'B', any[]>} */
  const runs = { A: [], B: [] };
  const t0 = Date.now();

  for (let i = 0; i < seq.length; i++) {
    const v = seq[i];
    applyVariant(variants[v]);
    const outFile = path.relative(ROOT, path.join(tmpDir, `run${i}_${v}.json`)).replace(/\\/g, '/');
    process.stdout.write(`  [${i + 1}/${seq.length}] ${v} · ${labels[v]} … `);
    const started = Date.now();
    const data = runOnce(`${labels[v]} #${runs[v].length + 1}`, outFile, opt.scenarios);
    runs[v].push(data);
    const late = data.results.find((r) => r.id === 'late_250') ?? data.results[data.results.length - 1];
    console.log(`${((Date.now() - started) / 1000).toFixed(1)}s   ${late.id} ${late.total.mean.toFixed(2)}ms`);
  }

  // 汇总每个场景
  const ids = runs.A[0].results.map((r) => r.id);
  const scenarios = [];

  for (const id of ids) {
    const pick = (v) => runs[v].map((d) => d.results.find((r) => r.id === id)).filter(Boolean);
    const ra = pick('A');
    const rb = pick('B');
    if (!ra.length || !rb.length) continue;

    const framesA = ra.map((r) => r.raw?.total ?? []);
    const framesB = rb.map((r) => r.raw?.total ?? []);
    const usable = framesA.every((f) => f.length) && framesB.every((f) => f.length);

    const meansA = ra.map((r) => r.total.mean);
    const meansB = rb.map((r) => r.total.mean);
    const p95A = ra.map((r) => r.total.p95);
    const p95B = rb.map((r) => r.total.p95);
    const updA = ra.map((r) => r.update.mean);
    const updB = rb.map((r) => r.update.mean);
    const rndA = ra.map((r) => r.render.mean);
    const rndB = rb.map((r) => r.render.mean);

    // 配对差：seq 里相邻的 A/B 构成一对
    const pairs = [];
    for (let k = 0; k < Math.min(meansA.length, meansB.length); k++) {
      pairs.push(meansA[k] - meansB[k]);
    }

    const boot = usable ? stratifiedDiff(framesA, framesB, opt.boot) : null;

    // 工作量一致性核对：必须用「逻辑层实体计数」——
    // draw.ops 对渲染层优化（如缓存去重）会被改动本身影响，用它当探针会误报「工作量不一致」。
    // 实体数（enemies+projectiles+particles+drops 每帧均值之和）只由场景夹具与确定性 RNG 决定，
    // 任何不影响逻辑层行为的优化都不该改变它。
    const entSum = (r) =>
      (r.entities?.enemies ?? 0) + (r.entities?.projectiles ?? 0) +
      (r.entities?.particles ?? 0) + (r.entities?.drops ?? 0);
    const entA = median(ra.map(entSum));
    const entB = median(rb.map(entSum));
    const entDrift = entA > 0 ? Math.abs(entA - entB) / entA * 100 : 0;
    // draw.ops 仅作参考信息：渲染层优化会主动改变它，不算一致性探针
    const opsA = median(ra.map((r) => r.draw?.ops?.median ?? 0));
    const opsB = median(rb.map((r) => r.draw?.ops?.median ?? 0));
    const opsDrift = opsA > 0 ? Math.abs(opsA - opsB) / opsA * 100 : 0;

    const mA = median(meansA);
    const mB = median(meansB);

    scenarios.push({
      id,
      label: ra[0].label,
      frames: ra[0].frames,
      a: { runs: meansA, median: mA, p95: median(p95A), update: median(updA), render: median(rndA) },
      b: { runs: meansB, median: mB, p95: median(p95B), update: median(updB), render: median(rndB) },
      pairedDiff: { values: pairs, median: median(pairs), mean: mean(pairs) },
      deltaMs: mA - mB,
      deltaPct: mA > 0 ? ((mA - mB) / mA) * 100 : 0,
      p95DeltaPct: median(p95A) > 0 ? ((median(p95A) - median(p95B)) / median(p95A)) * 100 : 0,
      boot,
      workload: { entA, entB, entDriftPct: entDrift, opsA, opsB, opsDriftPct: opsDrift },
      verdict: verdictOf(boot, entDrift),
    });
  }

  const payload = {
    schema: 'moonlight-bench-ab/1',
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - t0,
    sequence: seq,
    rounds: opt.rounds,
    variants: {
      A: { label: labels.A, dir: opt.a },
      B: { label: labels.B, dir: opt.b },
    },
    env: runs.A[0].env,
    method: {
      isolation: '每次运行独立 node 进程',
      order: 'ABBA 交替，抵消时间漂移',
      ci: `分层 bootstrap（先重采样运行，再重采样帧），${opt.boot} 次`,
    },
    scenarios,
  };

  const outPath = path.resolve(ROOT, opt.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2).replace(/(\d+\.\d{4})\d+/g, '$1'));

  printReport(payload);

  if (opt.html) {
    const { renderAbReport } = await import('./ab_report.mjs');
    const htmlPath = path.resolve(ROOT, opt.html);
    fs.writeFileSync(htmlPath, renderAbReport(payload));
    console.log(`› 报告 ${opt.html}`);
  }
  console.log(`› 数据 ${opt.out}`);

  // 先恢复工作树 —— 这一步绝不能被清理失败挡住，
  // 否则工作树会停在最后一次跑的变体上，人不知情地继续开发。
  if (opt.restore && variants[opt.restore]) {
    applyVariant(variants[opt.restore]);
    console.log(`› 工作树已恢复为变体 ${opt.restore}（${labels[opt.restore]}）`);
  }

  if (!opt.keepRuns) {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (e) {
      console.log(`› 临时目录未清理（${e.message.split('\n')[0]}），可手动删除 perf/.abruns`);
    }
  }
}

function verdictOf(boot, entDrift) {
  if (entDrift > 1) return 'invalid'; // 逻辑层实体数漂移 >1% 才判工作量不一致
  if (!boot) return 'unknown';
  const [lo, hi] = boot.diffCi;
  if (lo > 0 && hi > 0) return 'faster';
  if (lo < 0 && hi < 0) return 'slower';
  return 'inconclusive';
}

const VERDICT = {
  faster: ['✔', '改善'],
  slower: ['✘', '退化'],
  inconclusive: ['≈', '无显著差异'],
  invalid: ['!', '工作量不一致·无效'],
  unknown: ['?', '数据不足'],
};

function printReport(p) {
  console.log('  ' + '─'.repeat(76));
  console.log('');
  console.log(`  场景              ${p.variants.A.label.padEnd(12)}${p.variants.B.label.padEnd(12)}降幅        95% 区间`);
  console.log('  ' + '─'.repeat(76));
  for (const s of p.scenarios) {
    const sym = VERDICT[s.verdict][0];
    const ci = s.boot
      ? `[${s.boot.pctCi[0].toFixed(1)}% , ${s.boot.pctCi[1].toFixed(1)}%]`
      : '—';
    console.log(
      `  ${sym} ${s.label.padEnd(16)}` +
      `${s.a.median.toFixed(2).padStart(6)}ms     ` +
      `${s.b.median.toFixed(2).padStart(6)}ms     ` +
      `${s.deltaPct >= 0 ? '-' : '+'}${Math.abs(s.deltaPct).toFixed(1)}%`.padStart(7) +
      `     ${ci}`
    );
  }
  console.log('  ' + '─'.repeat(76));
  const bad = p.scenarios.filter((s) => s.verdict === 'invalid' || s.verdict === 'slower');
  if (bad.length) {
    console.log('');
    for (const s of bad) console.log(`  ${VERDICT[s.verdict][0]} ${s.label}：${VERDICT[s.verdict][1]}`);
  }
  console.log('');
  console.log(`  方法：${p.method.isolation} · ${p.method.order} · ${p.method.ci}`);
  console.log(`  总耗时 ${(p.durationMs / 1000).toFixed(1)}s`);
  console.log('');
}

main().catch((e) => {
  console.error('');
  console.error('对拍失败：', e.message);
  process.exit(1);
});
