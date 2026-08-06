/* =========================================================
   蚀月远征 · A/B 对拍 HTML 报告
   ---------------------------------------------------------
   单文件、零依赖、零网络。设计原则与主报告一致：
     先给结论，再给证据，每个数字都带不确定性。
   额外强调「运行级散点」—— 让人一眼看出运行间噪声有多大，
   避免再被窄得虚假的帧内区间骗一次。
   ========================================================= */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f2 = (n) => (Number.isFinite(n) ? n.toFixed(2) : '—');
const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : '—');

const VERDICT = {
  faster: { cls: 'ok', text: '改善' },
  slower: { cls: 'bad', text: '退化' },
  inconclusive: { cls: 'neutral', text: '无显著差异' },
  invalid: { cls: 'bad', text: '工作量不一致' },
  unknown: { cls: 'neutral', text: '数据不足' },
};

/** 运行级散点：把每次运行的均值画成点，直观暴露运行间离散度 */
function runScatter(s) {
  const all = [...s.a.runs, ...s.b.runs];
  const lo = Math.min(...all) * 0.92;
  const hi = Math.max(...all) * 1.08;
  const span = hi - lo || 1;
  const W = 520, H = 74, PAD = 8;
  const x = (v) => PAD + ((v - lo) / span) * (W - PAD * 2);

  const dots = (runs, y, color) =>
    runs.map((v) => `<circle cx="${x(v).toFixed(1)}" cy="${y}" r="5" fill="${color}" fill-opacity=".75"/>`).join('');

  const bar = (runs, y, color) => {
    const mn = Math.min(...runs), mx = Math.max(...runs);
    return `<line x1="${x(mn).toFixed(1)}" y1="${y}" x2="${x(mx).toFixed(1)}" y2="${y}" stroke="${color}" stroke-width="2" stroke-opacity=".35"/>`;
  };

  return `<svg viewBox="0 0 ${W} ${H}" class="scatter" role="img" aria-label="运行级散点">
    <line x1="${PAD}" y1="${H - 14}" x2="${W - PAD}" y2="${H - 14}" stroke="#d8d3ca" stroke-width="1"/>
    ${bar(s.a.runs, 22, '#b4522f')}${dots(s.a.runs, 22, '#b4522f')}
    ${bar(s.b.runs, 44, '#2f7a68')}${dots(s.b.runs, 44, '#2f7a68')}
    <text x="${W - PAD}" y="${H - 3}" text-anchor="end" font-size="10" fill="#8b8378">${f2(lo)} – ${f2(hi)} ms</text>
    <text x="${PAD}" y="26" font-size="10" fill="#b4522f">A</text>
    <text x="${PAD}" y="48" font-size="10" fill="#2f7a68">B</text>
  </svg>`;
}

/** 降幅条：正值向右（改善），负值向左（退化），叠加 95% 区间须线 */
function deltaBar(s) {
  const W = 300, H = 34, MID = W / 2;
  const scale = 60; // 每 1% 占 3px，上限 ±50%
  const clamp = (p) => Math.max(-50, Math.min(50, p));
  const px = (p) => MID + (clamp(p) / 50) * (MID - 10);
  const p = s.deltaPct;
  const ci = s.boot ? s.boot.pctCi : null;
  const color = p >= 0 ? '#2f7a68' : '#b4522f';
  const x0 = Math.min(MID, px(p)), x1 = Math.max(MID, px(p));
  return `<svg viewBox="0 0 ${W} ${H}" class="dbar" role="img">
    <rect x="${x0}" y="9" width="${Math.max(1, x1 - x0)}" height="14" fill="${color}" fill-opacity=".8" rx="2"/>
    ${ci ? `<line x1="${px(ci[0])}" y1="16" x2="${px(ci[1])}" y2="16" stroke="#3a3630" stroke-width="1.5"/>
      <line x1="${px(ci[0])}" y1="11" x2="${px(ci[0])}" y2="21" stroke="#3a3630" stroke-width="1.5"/>
      <line x1="${px(ci[1])}" y1="11" x2="${px(ci[1])}" y2="21" stroke="#3a3630" stroke-width="1.5"/>` : ''}
    <line x1="${MID}" y1="4" x2="${MID}" y2="28" stroke="#8b8378" stroke-width="1" stroke-dasharray="2 2"/>
    <text x="${W - 4}" y="30" text-anchor="end" font-size="9" fill="#8b8378">±50%</text>
  </svg>`;
}

function scenarioRow(s, A, B) {
  const v = VERDICT[s.verdict] ?? VERDICT.unknown;
  const ci = s.boot ? `[${f1(s.boot.pctCi[0])}% , ${f1(s.boot.pctCi[1])}%]` : '—';
  return `<tr>
    <td class="name"><strong>${esc(s.label)}</strong><span class="sid">${esc(s.id)}</span></td>
    <td class="num">${f2(s.a.median)}<span class="u">ms</span></td>
    <td class="num">${f2(s.b.median)}<span class="u">ms</span></td>
    <td class="num ${s.deltaPct >= 0 ? 'good' : 'warn'}">${s.deltaPct >= 0 ? '−' : '+'}${f1(Math.abs(s.deltaPct))}%</td>
    <td class="ci">${ci}</td>
    <td><span class="tag ${v.cls}">${v.text}</span></td>
  </tr>`;
}

function scenarioCard(s, A, B) {
  const v = VERDICT[s.verdict] ?? VERDICT.unknown;
  const drift = s.workload.entDriftPct;
  return `<section class="card">
    <header>
      <h3>${esc(s.label)} <span class="sid">${esc(s.id)}</span></h3>
      <span class="tag ${v.cls}">${v.text}</span>
    </header>
    <div class="grid">
      <div class="col">
        <table class="mini">
          <tr><th></th><th>${esc(A)}</th><th>${esc(B)}</th><th>Δ</th></tr>
          <tr><td>均值</td><td>${f2(s.a.median)}</td><td>${f2(s.b.median)}</td><td class="${s.deltaPct >= 0 ? 'good' : 'warn'}">${s.deltaPct >= 0 ? '−' : '+'}${f1(Math.abs(s.deltaPct))}%</td></tr>
          <tr><td>p95</td><td>${f2(s.a.p95)}</td><td>${f2(s.b.p95)}</td><td class="${s.p95DeltaPct >= 0 ? 'good' : 'warn'}">${s.p95DeltaPct >= 0 ? '−' : '+'}${f1(Math.abs(s.p95DeltaPct))}%</td></tr>
          <tr><td>逻辑</td><td>${f2(s.a.update)}</td><td>${f2(s.b.update)}</td><td></td></tr>
          <tr><td>渲染</td><td>${f2(s.a.render)}</td><td>${f2(s.b.render)}</td><td></td></tr>
        </table>
        <p class="note">工作量核对：逻辑实体 ${Math.round(s.workload.entA)} vs ${Math.round(s.workload.entB)}
          （偏移 ${f1(drift)}%）${drift > 1 ? ' — <strong class="warn">超过 1%，两侧跑的不是同一件事</strong>' : ' — 一致'}
          ${s.workload.opsA ? ` ｜ draw ops ${Math.round(s.workload.opsA)} → ${Math.round(s.workload.opsB)}（${f1(s.workload.opsDriftPct)}%）` : ''}</p>
      </div>
      <div class="col">
        <div class="lbl">各次运行的均值（横轴 ms）</div>
        ${runScatter(s)}
        <div class="lbl">降幅与 95% 区间</div>
        ${deltaBar(s)}
        <p class="note">配对差 ${s.pairedDiff.values.map((d) => (d >= 0 ? '−' : '+') + f2(Math.abs(d))).join(' / ')} ms</p>
      </div>
    </div>
  </section>`;
}

export function renderAbReport(p) {
  const A = p.variants.A.label;
  const B = p.variants.B.label;
  const improved = p.scenarios.filter((s) => s.verdict === 'faster');
  const regressed = p.scenarios.filter((s) => s.verdict === 'slower');
  const flat = p.scenarios.filter((s) => s.verdict === 'inconclusive');
  const invalid = p.scenarios.filter((s) => s.verdict === 'invalid');

  const pcts = improved.map((s) => s.deltaPct);
  const range = pcts.length
    ? `${f1(Math.min(...pcts))}% – ${f1(Math.max(...pcts))}%`
    : '—';

  const headline = regressed.length
    ? `${regressed.length} 个场景出现退化，需要复核`
    : improved.length
      ? `${improved.length}/${p.scenarios.length} 个场景确认改善，降幅 ${range}`
      : '未观察到统计上可区分的差异';

  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>蚀月远征 · 性能对拍 ${esc(A)} vs ${esc(B)}</title>
<style>
:root{--bg:#faf8f4;--panel:#fff;--ink:#2b2823;--dim:#8b8378;--line:#e6e1d8;--ok:#2f7a68;--bad:#b4522f;--accent:#7a6b52}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
.wrap{max-width:1080px;margin:0 auto;padding:40px 28px 80px}
h1{font-size:22px;margin:0 0 4px;font-weight:650;letter-spacing:.2px}
.sub{color:var(--dim);font-size:13px;margin:0 0 26px}
.headline{background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:6px;padding:18px 22px;margin-bottom:22px}
.headline .big{font-size:17px;font-weight:600}
.headline .m{color:var(--dim);font-size:12.5px;margin-top:8px;line-height:1.7}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:26px}
.kpi{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:14px 16px}
.kpi .k{color:var(--dim);font-size:11.5px;letter-spacing:.3px}
.kpi .v{font-size:20px;font-weight:650;margin-top:3px;font-variant-numeric:tabular-nums}
table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:6px;overflow:hidden}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--line);font-size:13px}
th{background:#f4f1ea;font-weight:600;color:var(--dim);font-size:11.5px;letter-spacing:.3px}
tr:last-child td{border-bottom:none}
td.num,td.ci{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}
td.ci{color:var(--dim);font-size:12px}
.u{color:var(--dim);font-size:10.5px;margin-left:2px}
.good{color:var(--ok);font-weight:600}
.warn{color:var(--bad);font-weight:600}
.name .sid{display:block;color:var(--dim);font-size:11px;font-weight:400}
.tag{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11.5px;font-weight:600}
.tag.ok{background:#e6f0ec;color:var(--ok)}
.tag.bad{background:#f7e9e3;color:var(--bad)}
.tag.neutral{background:#efece5;color:var(--dim)}
h2{font-size:15px;margin:34px 0 12px;font-weight:620}
.card{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:16px 18px;margin-bottom:14px}
.card header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.card h3{font-size:14.5px;margin:0;font-weight:620}
.card h3 .sid{color:var(--dim);font-size:11px;font-weight:400;margin-left:6px}
.grid{display:grid;grid-template-columns:1fr 1.15fr;gap:22px}
@media(max-width:820px){.grid{grid-template-columns:1fr}}
table.mini{border:none;background:none}
table.mini th,table.mini td{padding:4px 8px;font-size:12.5px;border-bottom:1px solid #f0ece4}
table.mini th{background:none;padding-bottom:6px}
table.mini td:not(:first-child){text-align:right;font-variant-numeric:tabular-nums}
.note{color:var(--dim);font-size:11.5px;margin:8px 0 0;line-height:1.6}
.lbl{color:var(--dim);font-size:11px;letter-spacing:.3px;margin:2px 0 2px}
.scatter{width:100%;height:auto;max-width:520px}
.dbar{width:100%;height:auto;max-width:300px}
.method{background:var(--panel);border:1px solid var(--line);border-radius:6px;padding:16px 20px;margin-top:30px;color:var(--dim);font-size:12.5px;line-height:1.85}
.method strong{color:var(--ink)}
</style></head><body><div class="wrap">

<h1>性能对拍 · ${esc(A)} vs ${esc(B)}</h1>
<p class="sub">${esc(p.timestamp)} · 序列 ${p.sequence.join(' ')} · ${p.sequence.length} 次独立进程 · 耗时 ${f1(p.durationMs / 1000)}s</p>

<div class="headline">
  <div class="big">${esc(headline)}</div>
  <div class="m">
    A = ${esc(A)}　B = ${esc(B)}　每侧 ${p.rounds} 次独立运行。<br>
    判定依据是<strong>分层 bootstrap 的 95% 区间是否跨过 0</strong>，而非单次运行的帧内区间 ——
    后者只反映帧间抖动，会把纯噪声判成显著。
  </div>
</div>

<div class="cards">
  <div class="kpi"><div class="k">确认改善</div><div class="v good">${improved.length}</div></div>
  <div class="kpi"><div class="k">确认退化</div><div class="v ${regressed.length ? 'warn' : ''}">${regressed.length}</div></div>
  <div class="kpi"><div class="k">无显著差异</div><div class="v">${flat.length}</div></div>
  <div class="kpi"><div class="k">改善幅度</div><div class="v">${range}</div></div>
</div>

<table>
  <thead><tr><th>场景</th><th style="text-align:right">${esc(A)}</th><th style="text-align:right">${esc(B)}</th><th style="text-align:right">降幅</th><th style="text-align:right">95% 区间</th><th>判定</th></tr></thead>
  <tbody>${p.scenarios.map((s) => scenarioRow(s, A, B)).join('')}</tbody>
</table>
${invalid.length ? `<p class="note warn">⚠ ${invalid.length} 个场景两侧工作量偏移超过 2%，对比结果不可用。</p>` : ''}

<h2>逐场景明细</h2>
${p.scenarios.map((s) => scenarioCard(s, A, B)).join('')}

<div class="method">
  <strong>测量方法</strong><br>
  · 进程隔离：${esc(p.method.isolation)}，JIT 与堆状态不跨轮次继承。<br>
  · 顺序设计：${esc(p.method.order)}，抵消 CPU 睿频衰减与后台任务造成的单调漂移。<br>
  · 区间估计：${esc(p.method.ci)}，同时包含运行间与帧间两级方差。<br>
  · 工作量核对：每个场景比对两侧 draw ops 中位数，偏移超过 2% 即判为无效对比。<br>
  · 确定性：夹具与游戏内随机均为固定种子，逐帧工作量可复现。<br>
  <br>
  <strong>环境</strong> ${esc(p.env?.node ?? '')} · ${esc(p.env?.platform ?? '')} ${esc(p.env?.arch ?? '')} · ${esc(String(p.env?.cpus ?? ''))} 核
</div>

</div></body></html>`;
}
