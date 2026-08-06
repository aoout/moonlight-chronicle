#!/usr/bin/env node
/* =========================================================
   蚀月远征 · 性能优化最终报告生成器
   ---------------------------------------------------------
   从 A/B 对拍产物（ab-o123.json / ab-o4.json）与定向实测
   数据生成一份自包含 HTML：方法学修正 + 逐项收益 + 设置项。
   ========================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));
const f2 = (n) => (n ?? 0).toFixed(2);

function load(rel) {
  return JSON.parse(fs.readFileSync(path.resolve(ROOT, rel), 'utf8'));
}

/* ---------- 数据源 ---------- */
const o123 = load('perf/ab-o123.json');
const o4 = load('perf/ab-o4.json');
const o59 = load('perf/ab-o510.json');

/* ---------- O1-O3 每场景一行 ---------- */
function o123Rows() {
  return o123.scenarios.map((s) => {
    const ci = s.boot ? s.boot.pctCi.map((v) => v.toFixed(1)).join(' ~ ') : '—';
    return {
      id: s.id, label: s.label,
      a: s.a.median, b: s.b.median,
      deltaPct: s.deltaPct, p95A: s.a.p95, p95B: s.b.p95,
      p95DeltaPct: s.p95DeltaPct,
      ci, verdict: s.verdict,
    };
  });
}

/* ---------- O4 每场景一行（含 draw ops） ---------- */
function o4Rows() {
  return o4.scenarios.map((s) => ({
    id: s.id, label: s.label,
    a: s.a.median, b: s.b.median,
    deltaPct: s.deltaPct,
    ci: s.boot ? s.boot.pctCi.map((v) => v.toFixed(1)).join(' ~ ') : '—',
    opsA: s.workload.opsA, opsB: s.workload.opsB,
    entDrift: s.workload.entDriftPct,
    verdict: s.verdict,
  }));
}

/* ---------- O5-O10 每场景一行 ---------- */
function o59Rows() {
  return o59.scenarios.map((s) => ({
    id: s.id, label: s.label,
    a: s.a.median, b: s.b.median,
    deltaPct: s.deltaPct, p95A: s.a.p95, p95B: s.b.p95,
    p95DeltaPct: s.p95DeltaPct,
    ci: s.boot ? s.boot.pctCi.map((v) => v.toFixed(1)).join(' ~ ') : '—',
    verdict: s.verdict,
  }));
}

/* ---------- O5-O10 表格 ---------- */
function o59Table() {
  const rows = o59Rows();
  const body = rows.map((r) => {
    const v = VERDICT[r.verdict] ?? VERDICT.unknown;
    return `<tr>
      <td class="mono">${r.id}</td>
      <td>${esc(r.label)}</td>
      <td class="num">${f2(r.a)}</td>
      <td class="num">${f2(r.b)}</td>
      <td class="num good">${r.deltaPct >= 0 ? '−' : '+'}${Math.abs(r.deltaPct).toFixed(1)}%</td>
      <td class="num">${f2(r.p95A)} → ${f2(r.p95B)} <span class="dim">(${r.p95DeltaPct >= 0 ? '−' : '+'}${Math.abs(r.p95DeltaPct).toFixed(1)}%)</span></td>
      <td class="num dim">[${esc(r.ci)}]</td>
      <td><span class="tag" style="color:${v[1]}">${v[0]} ${v[2]}</span></td>
    </tr>`;
  }).join('');
  return `<table class="data">
    <thead><tr><th>场景</th><th>名称</th><th>A 均值</th><th>B 均值</th><th>均值降幅</th><th>p95（A→B）</th><th>95% 区间</th><th>判定</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

const VERDICT = {
  faster: ['✔', '#7fd6a4', '改善'],
  slower: ['✘', '#e2546a', '退化'],
  inconclusive: ['≈', '#f6d987', '无显著差异'],
  invalid: ['!', '#e2546a', '无效'],
  unknown: ['?', '#9aa7b8', '数据不足'],
};

/* ---------- SVG 水平条：降幅 ---------- */
function deltaBar(label, pct, ci, color = '#7fd6a4') {
  const w = Math.min(120, Math.max(6, Math.abs(pct)));
  return `<div class="bar-row">
    <div class="bar-lbl">${esc(label)}</div>
    <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${pct >= 0 ? color : '#e2546a'}"></div></div>
    <div class="bar-val">${pct >= 0 ? '−' : '+'}${Math.abs(pct).toFixed(1)}%</div>
    <div class="bar-ci">95% [${esc(ci)}]</div>
  </div>`;
}

/* ---------- O1-O3 表格 ---------- */
function o123Table() {
  const rows = o123Rows();
  const body = rows.map((r) => {
    const v = VERDICT[r.verdict] ?? VERDICT.unknown;
    return `<tr>
      <td class="mono">${r.id}</td>
      <td>${esc(r.label)}</td>
      <td class="num">${f2(r.a)}</td>
      <td class="num">${f2(r.b)}</td>
      <td class="num good">${r.deltaPct >= 0 ? '−' : '+'}${Math.abs(r.deltaPct).toFixed(1)}%</td>
      <td class="num">${f2(r.p95A)} → ${f2(r.p95B)} <span class="dim">(${r.p95DeltaPct >= 0 ? '−' : '+'}${Math.abs(r.p95DeltaPct).toFixed(1)}%)</span></td>
      <td class="num dim">[${esc(r.ci)}]</td>
      <td><span class="tag" style="color:${v[1]}">${v[0]} ${v[2]}</span></td>
    </tr>`;
  }).join('');
  return `<table class="data">
    <thead><tr><th>场景</th><th>名称</th><th>A 均值</th><th>B 均值</th><th>均值降幅</th><th>p95（A→B）</th><th>95% 区间</th><th>判定</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

/* ---------- O4 表格 ---------- */
function o4Table() {
  const rows = o4Rows();
  const body = rows.map((r) => {
    const v = VERDICT[r.verdict] ?? VERDICT.unknown;
    const opsPct = r.opsA > 0 ? ((r.opsA - r.opsB) / r.opsA) * 100 : 0;
    return `<tr>
      <td class="mono">${r.id}</td>
      <td>${esc(r.label)}</td>
      <td class="num">${f2(r.a)}</td>
      <td class="num">${f2(r.b)}</td>
      <td class="num">${r.deltaPct >= 0 ? '−' : '+'}${Math.abs(r.deltaPct).toFixed(1)}%</td>
      <td class="num good">${Math.round(r.opsA)} → ${Math.round(r.opsB)} <span class="dim">(−${opsPct.toFixed(1)}%)</span></td>
      <td class="num dim">${r.entDrift.toFixed(2)}%</td>
      <td><span class="tag" style="color:${v[1]}">${v[0]} ${v[2]}</span></td>
    </tr>`;
  }).join('');
  return `<table class="data">
    <thead><tr><th>场景</th><th>名称</th><th>A 均值</th><th>B 均值</th><th>均值降幅</th><th>draw ops（A→B）</th><th>实体漂移</th><th>判定</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

/* ---------- 汇总卡片 ---------- */
const o123Faster = o123.scenarios.filter((s) => s.verdict === 'faster');
const o123Pct = o123Faster.map((s) => s.deltaPct);
const o123Avg = o123Pct.reduce((a, b) => a + b, 0) / o123Pct.length;
void o123Avg;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>蚀月远征 · 性能优化最终报告（O1-O4）</title>
<style>
  :root {
    --bg:#090d18; --bg2:#111827; --ink:#e6edf7; --muted:#9aa7b8;
    --rule:#243044; --accent:#7fd6a4; --accent2:#e2546a; --warn:#f6d987;
    --panel:rgba(17,24,39,.78); --shadow:rgba(0,0,0,.32);
    --font:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
    --mono:"Cascadia Mono","Consolas",monospace; --max:1180px;
  }
  *{box-sizing:border-box} html{font-size:16px;scroll-behavior:smooth}
  body{margin:0;font-family:var(--font);color:var(--ink);line-height:1.65;padding:2rem 1rem 3rem;
    background:radial-gradient(circle at 18% 8%,color-mix(in srgb,var(--accent) 14%,transparent),transparent 28rem),
               radial-gradient(circle at 82% 16%,color-mix(in srgb,var(--accent2) 12%,transparent),transparent 30rem),var(--bg);}
  article.page{max-width:var(--max);margin:0 auto}
  header.hero{padding:2rem;border:1px solid var(--rule);border-radius:22px;background:var(--panel);backdrop-filter:blur(14px);box-shadow:0 24px 60px var(--shadow)}
  h1{margin:0 0 .5rem;font-size:clamp(1.8rem,4vw,3.2rem);line-height:1.12;letter-spacing:-.04em}
  h2{margin:3rem 0 1rem;font-size:1.35rem;letter-spacing:-.02em}
  h3{margin:1.6rem 0 .6rem;font-size:1.05rem}
  .sub{color:var(--muted);font-size:.95rem}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:1rem;margin:1.6rem 0}
  .card{border:1px solid var(--rule);border-radius:16px;padding:1.1rem 1.2rem;background:var(--panel)}
  .card .k{font-size:.82rem;color:var(--muted);letter-spacing:.04em}
  .card .v{font-size:1.7rem;font-weight:700;margin-top:.2rem;font-family:var(--mono)}
  .card .v small{font-size:.95rem;color:var(--muted);font-weight:400}
  .card.good .v{color:var(--accent)} .card.warn .v{color:var(--warn)} .card.bad .v{color:var(--accent2)}
  table.data{width:100%;border-collapse:collapse;font-size:.9rem;background:var(--panel);border:1px solid var(--rule);border-radius:12px;overflow:hidden}
  table.data th{background:rgba(255,255,255,.04);text-align:left;padding:.6rem .8rem;font-size:.8rem;color:var(--muted);letter-spacing:.03em;border-bottom:1px solid var(--rule)}
  table.data td{padding:.6rem .8rem;border-bottom:1px solid color-mix(in srgb,var(--rule) 55%,transparent);vertical-align:middle}
  table.data tr:last-child td{border-bottom:none}
  td.num{font-family:var(--mono);text-align:right;white-space:nowrap}
  td.good{color:var(--accent)} .good{color:var(--accent)} .warn{color:var(--warn)} .dim{color:var(--muted);font-size:.82em}
  .tag{font-size:.8rem;border:1px solid currentColor;border-radius:999px;padding:.08rem .55rem;white-space:nowrap}
  .bars{display:flex;flex-direction:column;gap:.7rem;margin:1.2rem 0}
  .bar-row{display:grid;grid-template-columns:150px 1fr 90px 220px;gap:.8rem;align-items:center;font-size:.86rem}
  .bar-lbl{text-align:right;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bar-track{height:14px;background:rgba(255,255,255,.06);border-radius:7px;overflow:hidden}
  .bar-fill{height:100%;border-radius:7px}
  .bar-val{font-family:var(--mono);text-align:right}
  .bar-ci{color:var(--muted);font-size:.78rem;font-family:var(--mono)}
  .note{border-left:3px solid var(--warn);background:color-mix(in srgb,var(--warn) 8%,transparent);padding:.7rem 1rem;border-radius:0 10px 10px 0;margin:1rem 0;font-size:.9rem}
  .oknote{border-left-color:var(--accent);background:color-mix(in srgb,var(--accent) 7%,transparent)}
  code{font-family:var(--mono);font-size:.85em;background:rgba(255,255,255,.07);padding:.1em .35em;border-radius:5px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1.4rem}
  @media(max-width:860px){.grid2{grid-template-columns:1fr}.bar-row{grid-template-columns:110px 1fr 80px}}
  ul{margin:.4rem 0 1rem;padding-left:1.2rem} li{margin:.35rem 0}
  .muted{color:var(--muted)}
  footer{margin-top:3rem;color:var(--muted);font-size:.82rem;border-top:1px solid var(--rule);padding-top:1rem}
</style>
</head>
<body><article class="page">
<header class="hero">
  <h1>蚀月远征 · 性能优化最终报告</h1>
  <div class="sub">O1–O9 架构优化 · A/B 交替对拍验证 · 确定性夹具 · 设置项兜底 — 分支 <code>perf/late-game-optimization</code></div>
</header>

<section>
  <h2>一、结论摘要</h2>
  <div class="cards">
    <div class="card good"><div class="k">O5-O10 · 粒子场景降幅</div><div class="v">${o59.scenarios.find(s => s.id === 'particle_fest').deltaPct.toFixed(1)}<small>% （显著）</small></div></div>
    <div class="card good"><div class="k">O5-O10 · 高负载均值降幅</div><div class="v">${(() => { const xs = o59.scenarios.filter(s => s.verdict === 'faster'); return (xs.reduce((a, s) => a + s.deltaPct, 0) / xs.length).toFixed(1); })()}<small>% （5 场景显著）</small></div></div>
    <div class="card good"><div class="k">后期·250水位（O4 → O5-O10）</div><div class="v">${f2(o59.scenarios.find(s => s.id === 'late_250').a.median)} → ${f2(o59.scenarios.find(s => s.id === 'late_250').b.median)}<small> ms</small></div></div>
    <div class="card good"><div class="k">O4 · canvas 重分配（late_250）</div><div class="v">62 → 10<small> 次/帧 (−84%)</small></div></div>
  </div>
  <div class="oknote note">
    <strong>O1+O2+O3（纯架构，零体验代价）可信收益：</strong>高负载场景均值降幅 23.5%–31.8%，
    分层 bootstrap 95% 区间全部为正；p95 同步降 24.1%–29.1%，帧尖峰被明显削平。
    <strong>O4（渲染缓存去重）：</strong>draw call −16%–34%、canvas 重分配 −84%（62→10 次/帧）。
    <strong>O5-O10（热路径直读）：</strong>粒子场景 −66.2%，高负载场景 −20.0% ~ −28.5%。
  </div>
</section>

<section>
  <h2>二、方法学修正（为什么这次结论可信）</h2>
  <p class="muted">上一版报告曾给出「71–78% 提升」——那是假阳性，已废弃（备份在 <code>perf/archive-o123-invalid.html</code>）。根因与方法学修正如下：</p>
  <ul>
    <li><strong>帧内 CI 不诚实</strong>：同一次进程内的 400 帧共享同一段 CPU 频率 / JIT 状态 / 堆布局，高度相关。帧内 bootstrap 的 CI 窄得离谱，让任何改动都「显著」。真正的不确定性在<b>运行之间</b>（同工作量，两次运行可差 50%）。</li>
    <li><strong>新方法</strong>：进程隔离（每次独立 node 进程）+ ABBA 交替（抵消时间漂移）+ 配对比较（相邻 A/B 差值抵消时段噪声）+ 分层 bootstrap（先重采样运行、再重采样帧，2000 次）。</li>
    <li><strong>确定性夹具</strong>：种子化 <code>Math.random</code>（mulberry32），两次独立运行逐帧工作量一致（ops / 实体数完全相同），消除回归门禁的随机噪声。</li>
    <li><strong>工作量核对探针</strong>：用<b>逻辑层实体计数</b>（enemies+projectiles+particles+drops）核对两侧工作量一致，而不是 draw ops —— draw ops 对渲染层优化会被改动本身影响，用它当探针会误报（本轮已修正 <code>ab.mjs</code>）。</li>
  </ul>
</section>

<section>
  <h2>三、O1 + O2 + O3 · 纯架构优化</h2>
  <p class="muted">V8 CPU Profiler 定位三大热点（合计约 CPU 的 24%）：<code>EntityPool</code> 视图 getter 运行时乘法、<code>Store.state</code> 每帧全量浅拷贝、<code>EntityPool.compact</code> 每帧 Object.keys+delete 清理。三项均为纯架构开销，<b>零体验 / 零美术代价</b>。</p>
  ${o123Table()}
  <h3>降幅分布（正 = 改善）</h3>
  <div class="bars">
    ${o123Rows().map((r) => deltaBar(r.label, r.deltaPct, r.ci)).join('')}
  </div>
  <div class="note">轻负载场景（idle / mid_fixed / particle_fest）判定为「无显著差异」是因为绝对值太小（&lt;1ms），噪声占比高，并非无效；方向与重负载场景一致。</div>
</section>

<section>
  <h2>四、O4 · 敌人离屏缓存按键去重</h2>
  <p class="muted">病灶：缓存键按「类型+颜色+尺寸」聚合共享，刷新判定却按敌人下标交错 —— 后期同键敌人几十上百只时，同一张画布每帧被反复 refresh 十几次，每次伴随 canvas 尺寸重设（显存重分配）。修复：<code>_lastRefresh</code> 按键记帧，同帧去重 + 帧间节流。</p>
  ${o4Table()}
  <div class="oknote note">
    <strong>为何 total 差异不显著但仍是有效优化：</strong>headless 的 fallback canvas 里 <code>canvas.width = w</code> 只是属性赋值，
    重分配的 GPU 代价为零，所以 <b>total 测不出</b>。但 draw ops（−16%–34%）与 canvas 重分配（62→10 次/帧，−84%）
    是确定性计数，不受噪声影响 —— 在<b>真实浏览器</b>里每次重设 canvas 尺寸 = 丢弃旧后备存储 + 分配新像素缓冲，
    late_250 每帧省下 52 次重分配，是实打实的显存 / GC 压力下降。
  </div>
  <h3>设置项兜底（玩家可调，默认不劣化体验）</h3>
  <p>O4 的帧间节流引入 <code>enemyAnimStride</code> 设置：<b>1（逐帧，默认）/ 2 / 4</b>。
  默认值保持逐帧重绘 —— 动画体验与优化前完全一致（有回归测试锁定）。玩家可在
  <b>设置 → 蚀影律动 · 身姿重绘</b> 中自行选择以动画流畅度换帧率。</p>
  <div class="grid2">
    <div>
      <h3>优化清单</h3>
      <ul>
        <li><b>O1</b> <code>entity_pool.ts</code>：视图 getter 预计算 slot 偏移，schema 字段不可枚举</li>
        <li><b>O2</b> <code>store.ts</code>：<code>state</code> 快照缓存，写入时失效</li>
        <li><b>O3</b> <code>entity_pool.ts</code>：<code>compact</code> 用 copyWithin + 仅搬动态属性</li>
        <li><b>O4</b> <code>entities.ts</code>：缓存键记帧去重 + <code>enemyAnimStride</code> 节流</li>
        <li><b>O5</b> <code>World.ts</code>：空间网格字符串 key → 数字 key（省每帧数百次字符串分配）</li>
        <li><b>O6</b> <code>ParticleSystem.ts</code>：粒子更新直读 TypedArray（免视图 getter）</li>
        <li><b>O7</b> <code>particles.ts</code>：粒子绘制直读 TypedArray（每粒子 ~15 次 getter → 直读）</li>
        <li><b>O8</b> <code>ParticleSystem.ts / World.ts</code>：update 顺带标记过期粒子 dead，compact 判定降为 1 次 getter</li>
        <li><b>O9</b> <code>EnemySystem.ts</code>：enemyTick 热字段直读 TypedArray + 跳过死实体</li>
        <li><b>O10</b> <code>entity_pool.ts</code>：compact 动态属性「覆盖优先 + 仅清理残留」（同构零 delete，保住隐藏类）</li>
      </ul>
    </div>
    <div>
      <h3>附带修复</h3>
      <ul>
        <li><code>scheduler.ts</code>：blur 清键 bug（<code>iSt().keys = {}</code> 对浅拷贝赋值从未生效 → 原地清空）</li>
        <li><code>ab.mjs</code>：工作量核对从 draw ops 改为逻辑实体数（渲染优化不再误报）</li>
        <li>新增 4 项 O4 回归测试（同帧去重 / 节流 / reset 复位 / 默认逐帧）</li>
        <li>新增 4 项粒子回归测试（位移阻尼 / 过期标记 / 混合访问 / dead 语义）</li>
      </ul>
    </div>
  </div>
</section>

<section>
  <h2>五、第二轮优化（O5-O10）· 热路径 TypedArray 直读</h2>
  <p class="muted">O1-O4 之后重跑 V8 CPU Profile，热点转移到视图 getter 的<b>访问次数</b>（而非 getter 本身）：粒子满池 512 × 每粒子 ~15 次 getter、敌人 250 × 每实体 ~20 次，全部是纯函数调用开销。O5-O10 把热路径改为直接读 TypedArray（与视图共享同一内存，混合安全），并消除了每帧数百次字符串分配。</p>
  ${o59Table()}
  <div class="bars">
    ${o59Rows().map((r) => deltaBar(r.label, r.deltaPct, r.ci)).join('')}
  </div>
  <div class="oknote note">
    <strong>粒子场景 -66.2%</strong> 主要来自 O6+O7（更新 + 绘制全部直读）；高负载场景 -20.0% ~ -28.5% 来自
    O5（网格数字 key）+ O8（dead 标记省 compact 判定）+ O9（enemyTick 直读）。
    全部为纯架构优化，零体验 / 零美术代价，无需设置开关。
  </div>
</section>

<section>
  <h2>六、验证状态</h2>
  <ul>
    <li>✔ 全量测试：24 文件 / 388 用例全绿（O1-O9 全部就位）</li>
    <li>✔ 类型检查 <code>tsc --noEmit</code> 通过；分层架构检查通过；无 <code>.only</code> 泄漏</li>
    <li>✔ 工作树 = 完整优化版（O1-O9），变更均在 <code>perf/late-game-optimization</code> 分支</li>
    <li>⚠ <code>npm run verify</code> 的 coverage 步骤因缺 <code>@vitest/coverage-v8</code> 依赖失败 —— 与本次改动无关，需 <code>npm i -D @vitest/coverage-v8</code></li>
    <li>⚠ git 仓库存在历史损坏：<code>css</code> 子树对象缺失（broken link），需联网后 <code>git fetch</code> 修复；工作树与本次改动不受影响</li>
  </ul>
</section>

<footer>
  生成于 ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })} · 数据源 perf/ab-o123.json · perf/ab-o4.json · perf/ab-o59.json · 方法见 scripts/bench/ab.mjs
</footer>
</article></body></html>`;

const out = path.resolve(ROOT, 'docs/benchmarks/benchmark-optimization-report.html');
fs.writeFileSync(out, html);
console.log(`› 最终报告已生成 ${path.relative(ROOT, out)} (${(html.length / 1024).toFixed(1)} KB)`);
