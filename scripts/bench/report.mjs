/* =========================================================
   蚀月远征 · Headless 压测：HTML 报告生成
   ---------------------------------------------------------
   设计原则：
     1) 单文件、零依赖、零网络请求 —— 报告要能塞进 CI 产物、
        丢进 IM、半年后还打得开；引 CDN 的报告活不过一次断网。
     2) 先给结论，再给证据。首屏必须回答"卡不卡、卡在哪"，
        细节表格往下放。
     3) 每个数字都带不确定度。没有置信区间的性能报告
        只是把噪声排版得好看一点。
   ========================================================= */

const BUDGET = 1000 / 60;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fx = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');

/** 帧时间 → 状态色 */
function grade(ms) {
  if (ms > BUDGET) return { cls: 'bad', text: '超预算' };
  if (ms > BUDGET * 0.5) return { cls: 'warn', text: '偏高' };
  return { cls: 'good', text: '健康' };
}

/* ---------- 内联 SVG 图表 ---------- */

/** 帧时间分布直方图 + P50/P95/P99 标线 */
function histogram(samples, width = 560, height = 120) {
  if (!samples || samples.length === 0) return '';
  const s = [...samples].sort((a, b) => a - b);
  const lo = s[0];
  const hi = s[Math.floor(s.length * 0.99)] || s[s.length - 1];
  const span = hi - lo || 1;
  const bins = 44;
  const counts = new Array(bins).fill(0);
  for (const v of s) {
    let i = Math.floor(((v - lo) / span) * bins);
    if (i < 0) i = 0;
    if (i >= bins) i = bins - 1;
    counts[i]++;
  }
  const maxC = Math.max(...counts, 1);
  const bw = width / bins;
  const bars = counts.map((c, i) => {
    const h = (c / maxC) * (height - 22);
    const overBudget = lo + (i / bins) * span > BUDGET;
    return `<rect x="${(i * bw).toFixed(1)}" y="${(height - 22 - h).toFixed(1)}" width="${(bw - 1).toFixed(1)}" height="${h.toFixed(1)}" fill="${overBudget ? '#e05252' : '#6a8fd8'}" opacity="0.85" rx="1"/>`;
  }).join('');

  const q = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))];
  const mark = (p, color, label) => {
    const v = q(p);
    const x = ((v - lo) / span) * width;
    if (x < 0 || x > width) return '';
    return `<line x1="${x.toFixed(1)}" y1="0" x2="${x.toFixed(1)}" y2="${height - 22}" stroke="${color}" stroke-width="1.5" stroke-dasharray="3 2"/>` +
      `<text x="${Math.min(width - 30, x + 3).toFixed(1)}" y="10" font-size="9" fill="${color}">${label}</text>`;
  };

  return `<svg viewBox="0 0 ${width} ${height}" class="chart">
    ${bars}
    ${mark(0.5, '#2f7d4f', 'P50')}
    ${mark(0.95, '#c47f1a', 'P95')}
    ${mark(0.99, '#b03030', 'P99')}
    <line x1="0" y1="${height - 22}" x2="${width}" y2="${height - 22}" stroke="#d8dbe2"/>
    <text x="0" y="${height - 8}" font-size="9" fill="#8a8f9a">${fx(lo)}ms</text>
    <text x="${width}" y="${height - 8}" font-size="9" fill="#8a8f9a" text-anchor="end">${fx(hi)}ms</text>
  </svg>`;
}

/** 系统耗时横向堆叠条 */
function systemBars(systems, totalMedian) {
  const entries = Object.entries(systems)
    .map(([k, v]) => [k, v.median])
    .filter(([, v]) => v > 0.001)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (!entries.length) return '<p class="muted">无系统级采样</p>';
  const max = entries[0][1];
  return `<div class="sysbars">${entries.map(([k, v]) => `
    <div class="sysrow">
      <span class="sysname">${esc(k)}</span>
      <span class="systrack"><span class="sysfill" style="width:${((v / max) * 100).toFixed(1)}%"></span></span>
      <span class="sysval">${fx(v, 3)}ms</span>
      <span class="syspct">${totalMedian > 0 ? ((v / totalMedian) * 100).toFixed(0) : '0'}%</span>
    </div>`).join('')}</div>`;
}

/* ---------- 分区 ---------- */

function summarySection(payload) {
  const rs = payload.results;
  const worst = [...rs].sort((a, b) => b.total.p95 - a.total.p95)[0];
  const totalRealloc = rs.reduce((n, r) => n + r.draw.canvasRealloc.median, 0);
  const overCount = rs.filter((r) => r.overBudgetPct > 1).length;

  const cards = [
    {
      k: '最重场景',
      v: worst ? esc(worst.label) : '—',
      s: worst ? `P95 ${fx(worst.total.p95)}ms · ${worst.entities.enemies} 敌` : '',
      cls: worst ? grade(worst.total.p95).cls : '',
    },
    {
      k: '超预算场景',
      v: `${overCount} / ${rs.length}`,
      s: 'JS 侧单帧 > 16.67ms',
      cls: overCount ? 'bad' : 'good',
    },
    {
      k: '画布重分配',
      v: `${Math.round(totalRealloc)} 次/帧`,
      s: '全场景合计中位数',
      cls: totalRealloc > 10 ? 'bad' : totalRealloc > 3 ? 'warn' : 'good',
    },
    {
      k: '峰值绘制指令',
      v: `${Math.round(Math.max(...rs.map((r) => r.draw.ops.median)))}`,
      s: '单帧 ctx 调用数',
      cls: '',
    },
  ];

  return `<section class="cards">${cards.map((c) => `
    <div class="card ${c.cls}">
      <div class="card-k">${c.k}</div>
      <div class="card-v">${c.v}</div>
      <div class="card-s">${c.s}</div>
    </div>`).join('')}</section>`;
}

function scenarioSection(r) {
  const g = grade(r.total.p95);
  const rows = [
    ['中位', fx(r.total.median), fx(r.update.median), fx(r.render.median)],
    ['P75', fx(r.total.p75), fx(r.update.p75), fx(r.render.p75)],
    ['P95', fx(r.total.p95), fx(r.update.p95), fx(r.render.p95)],
    ['P99', fx(r.total.p99), fx(r.update.p99), fx(r.render.p99)],
    ['最大', fx(r.total.max), fx(r.update.max), fx(r.render.max)],
  ];

  return `<section class="scenario">
    <header>
      <h3>${esc(r.label)} <code>${esc(r.id)}</code></h3>
      <span class="badge ${g.cls}">${g.text} · P95 ${fx(r.total.p95)}ms</span>
    </header>
    <p class="desc">${esc(r.desc)}</p>

    <div class="meta">
      <span>敌 <b>${r.entities.enemies}</b></span>
      <span>弹 <b>${r.entities.projectiles}</b></span>
      <span>粒子 <b>${r.entities.particles}</b></span>
      <span>掉落 <b>${r.entities.drops}</b></span>
      <span>帧数 <b>${r.frames}</b></span>
      <span>模式 <b>${esc(r.mode)}</b></span>
      <span class="${r.overBudgetPct > 1 ? 'hl-bad' : ''}">超预算帧 <b>${fx(r.overBudgetPct, 1)}%</b></span>
      <span class="${r.total.cv > 0.3 ? 'hl-warn' : ''}">变异系数 <b>${fx(r.total.cv, 2)}</b></span>
    </div>

    <div class="grid2">
      <div>
        <h4>帧时间分布</h4>
        ${histogram(r.raw?.total)}
        <table class="tbl">
          <tr><th></th><th>总计</th><th>逻辑</th><th>渲染</th></tr>
          ${rows.map(([a, b, c, d]) => `<tr><td>${a}</td><td class="num strong">${b}</td><td class="num">${c}</td><td class="num">${d}</td></tr>`).join('')}
        </table>
        <p class="ci">中位数 95% CI: [${fx(r.total.ci95[0])}, ${fx(r.total.ci95[1])}] ms</p>
      </div>
      <div>
        <h4>系统耗时 Top</h4>
        ${systemBars(r.systems, r.total.median)}
        <h4>绘制结构（单帧中位）</h4>
        <table class="tbl">
          <tr><td>ctx 调用总数</td><td class="num strong">${Math.round(r.draw.ops.median)}</td></tr>
          <tr><td>实际绘制调用</td><td class="num">${Math.round(r.draw.paints.median)}</td></tr>
          <tr><td class="${r.draw.canvasRealloc.median > 2 ? 'hl-bad' : ''}">离屏画布重分配</td><td class="num strong">${Math.round(r.draw.canvasRealloc.median)}</td></tr>
          <tr><td class="${r.draw.shadowBlur.median > 20 ? 'hl-warn' : ''}">shadowBlur 设置</td><td class="num">${Math.round(r.draw.shadowBlur.median)}</td></tr>
          <tr><td>渐变对象创建</td><td class="num">${Math.round(r.draw.gradients.median)}</td></tr>
        </table>
      </div>
    </div>
  </section>`;
}

function comparisonSection(cmp) {
  if (!cmp || !cmp.length) return '';
  return `<section class="compare">
    <h2>与基线对比</h2>
    <p class="muted">改进率取帧时间中位数，区间为 bootstrap 重采样 2000 次的 95% 置信区间。区间跨越 0 即判为噪声，不计入结论。</p>
    <table class="tbl wide">
      <tr><th>场景</th><th>基线</th><th>当前</th><th>变化</th><th>95% CI</th><th>结论</th><th>Δ绘制</th><th>Δ重分配</th></tr>
      ${cmp.map((c) => {
    const cls = !c.significant ? '' : c.improvePct > 0 ? 'good' : 'bad';
    const verdict = !c.significant ? '<span class="muted">噪声内</span>'
      : c.improvePct > 0 ? '<span class="hl-good">显著提升</span>'
        : '<span class="hl-bad">显著回归</span>';
    const dOps = Math.round(c.currentOps - c.baselineOps);
    const dRe = Math.round(c.currentRealloc - c.baselineRealloc);
    return `<tr class="${cls}">
          <td>${esc(c.label)}</td>
          <td class="num">${fx(c.baselineStat)}</td>
          <td class="num strong">${fx(c.currentStat)}</td>
          <td class="num ${c.improvePct > 0 ? 'hl-good' : c.improvePct < 0 ? 'hl-bad' : ''}">${c.improvePct > 0 ? '−' : '+'}${fx(Math.abs(c.improvePct), 1)}%</td>
          <td class="num muted">[${fx(c.ci95[0], 1)}, ${fx(c.ci95[1], 1)}]</td>
          <td>${verdict}</td>
          <td class="num">${dOps > 0 ? '+' : ''}${dOps}</td>
          <td class="num">${dRe > 0 ? '+' : ''}${dRe}</td>
        </tr>`;
  }).join('')}
    </table>
  </section>`;
}

/* ---------- 主入口 ---------- */

export function renderHtmlReport(payload, baseline, comparison) {
  const rs = payload.results;
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>蚀月远征 · 性能压测报告</title>
<style>
  :root{
    --bg:#f7f8fa; --fg:#1f2430; --muted:#8a8f9a; --line:#e3e6ec; --panel:#fff;
    --good:#2f7d4f; --warn:#c47f1a; --bad:#c93a3a; --accent:#4a6fd8;
  }
  *{box-sizing:border-box}
  body{margin:0;padding:32px 24px 64px;background:var(--bg);color:var(--fg);
    font:14px/1.6 -apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
  .wrap{max-width:1120px;margin:0 auto}
  h1{font-size:24px;margin:0 0 4px}
  h2{font-size:18px;margin:36px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
  h3{font-size:16px;margin:0}
  h4{font-size:12px;margin:16px 0 8px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px}
  code{background:#eef0f4;padding:1px 6px;border-radius:4px;font-size:11px;color:var(--muted);font-weight:400}
  .sub{color:var(--muted);font-size:12px;margin:0 0 24px}
  .muted{color:var(--muted)}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:8px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px;border-left:3px solid var(--line)}
  .card.good{border-left-color:var(--good)} .card.warn{border-left-color:var(--warn)} .card.bad{border-left-color:var(--bad)}
  .card-k{font-size:11px;color:var(--muted);letter-spacing:.5px}
  .card-v{font-size:22px;font-weight:600;margin:2px 0}
  .card-s{font-size:11px;color:var(--muted)}
  .scenario{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:18px 20px;margin-bottom:14px}
  .scenario header{display:flex;align-items:center;justify-content:space-between;gap:12px}
  .desc{color:var(--muted);font-size:12px;margin:4px 0 12px}
  .badge{font-size:12px;padding:3px 10px;border-radius:99px;background:#eef0f4;white-space:nowrap}
  .badge.good{background:#e6f4ec;color:var(--good)} .badge.warn{background:#fdf3e2;color:var(--warn)} .badge.bad{background:#fbeaea;color:var(--bad)}
  .meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px;color:var(--muted);
    padding:8px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
  .meta b{color:var(--fg);font-weight:600}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:4px}
  @media(max-width:860px){.grid2{grid-template-columns:1fr}}
  .chart{width:100%;height:auto;display:block}
  .tbl{width:100%;border-collapse:collapse;font-size:12px}
  .tbl th{text-align:right;color:var(--muted);font-weight:500;font-size:11px;padding:4px 6px;border-bottom:1px solid var(--line)}
  .tbl th:first-child{text-align:left}
  .tbl td{padding:4px 6px;border-bottom:1px solid #f0f2f5}
  .tbl .num{text-align:right;font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,monospace}
  .tbl .strong{font-weight:600}
  .tbl.wide th,.tbl.wide td{padding:6px 8px}
  .tbl tr.good{background:#f4fbf7} .tbl tr.bad{background:#fdf5f5}
  .ci{font-size:11px;color:var(--muted);margin:6px 0 0}
  .sysbars{display:flex;flex-direction:column;gap:3px}
  .sysrow{display:grid;grid-template-columns:112px 1fr 58px 34px;align-items:center;gap:8px;font-size:11px}
  .sysname{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .systrack{height:9px;background:#eef0f4;border-radius:99px;overflow:hidden}
  .sysfill{display:block;height:100%;background:linear-gradient(90deg,#6a8fd8,#4a6fd8);border-radius:99px}
  .sysval{text-align:right;font-family:ui-monospace,Consolas,monospace}
  .syspct{text-align:right;color:var(--muted)}
  .hl-good{color:var(--good);font-weight:600} .hl-bad{color:var(--bad);font-weight:600} .hl-warn{color:var(--warn);font-weight:600}
  .note{background:#fff;border:1px solid var(--line);border-left:3px solid var(--accent);
    border-radius:8px;padding:12px 16px;font-size:12px;color:var(--muted);margin-top:24px}
  .note b{color:var(--fg)}
</style></head><body><div class="wrap">

<h1>蚀月远征 · 性能压测报告</h1>
<p class="sub">
  ${esc(payload.label)} · ${new Date(payload.timestamp).toLocaleString('zh-CN')} ·
  ${esc(payload.env.cpus)} · Node ${esc(payload.env.node)} ·
  用时 ${(payload.durationMs / 1000).toFixed(1)}s ·
  渲染${payload.renderEnabled ? '开启' : '关闭'}
</p>

${summarySection(payload)}
${comparisonSection(comparison)}

<h2>场景明细</h2>
${rs.map(scenarioSection).join('')}

<div class="note">
  <b>测量边界</b>：本报告在 Node 中以计数型 Canvas 替身运行完整的 update + render 管线。
  能精确测量 JS 侧逻辑耗时、渲染指令构造耗时、绘制调用结构、离屏画布重分配次数；
  <b>不包含</b> GPU 光栅化、图层合成与真实 VSync 节奏。
  因此这里的数字是<b>可回归的相对量</b>，用于守住性能不倒退；
  端到端的真实帧率仍以浏览器内基准（游戏内 Bench 面板）为准。两者互补。
  <br><br>
  <b>怎么读</b>：优先看 P95 而非均值 —— 玩家感知到的卡顿来自长尾。
  变异系数 &gt; 0.3 说明本次测量环境噪声偏大，结论需打折。
  「离屏画布重分配」若长期 &gt; 0，说明缓存在被反复重建，这是纯粹的浪费。
</div>

</div></body></html>`;
}
