#!/usr/bin/env node
/* =========================================================
   蚀月远征 · V8 CPU Profiler 探针（函数级热点归因）
   ---------------------------------------------------------
   用法：
     node scripts/bench/profile.mjs [场景id] [帧数]
   示例：
     node scripts/bench/profile.mjs late_250 300
   输出：按 self 时间排序的函数热点 Top 25（含文件:行号）

   用途：每轮优化前后跑一次，确认热点是否真的转移。
   注意：`post @ node:inspector` 是 profiler 自身的采样开销，
   应作为固定噪声忽略（约占总采样 20%+）。
   ========================================================= */
import { Session } from 'node:inspector/promises';

const DT = 1 / 60;

async function main() {
  const want = process.argv[2] || 'late_250';
  const frames = Number(process.argv[3] || 300);

  // 先装宿主（计数 canvas + 种子化 RNG），再加载游戏模块 —— 顺序不能反
  const { installHost } = await import('./host.mjs');
  const host = installHost();
  const { loadGame } = await import('./load.mjs');
  const m = await loadGame({ host });
  const { buildScenarios, resetFixtureRng } = await import('./scenarios.mjs');

  const { sysMan, render, stageState, gSt, benchState } = m;

  const scenarios = buildScenarios(m);
  const sc = scenarios.find((s) => s.id === want);
  if (!sc) {
    console.error(`场景 ${want} 不存在。可选：${scenarios.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  benchState.setBenchActive(true);
  benchState.setBenchMode(sc.mode === 'fixed' ? 'fixed' : 'simulation');

  const step = () => {
    if (sc.sustain) sc.sustain();
    stageState.set('time', gSt().time + DT);
    sysMan.update(DT);
    render();
  };

  // 预热：JIT 升温 + 实体稳态
  host.resetRandom?.();
  resetFixtureRng();
  sc.setup?.();
  for (let i = 0; i < 60; i++) step();
  sc.teardown?.();

  // 正式采样：先跑预热帧（不采样），再启动采样
  host.resetRandom?.();
  resetFixtureRng();
  sc.setup?.();

  const session = new Session();
  session.connect();
  await session.post('Profiler.enable');
  await session.post('Profiler.setSamplingInterval', { interval: 100 }); // 100μs 采样

  const warmup = Math.floor(frames * 0.1);
  for (let i = 0; i < warmup; i++) step();

  await session.post('Profiler.start');
  for (let i = warmup; i < frames; i++) step();
  const { profile } = await session.post('Profiler.stop');

  sc.teardown?.();
  session.disconnect();

  // 汇总 self 时间热点
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map(); // nodeId -> total self time (μs)
  const deltas = profile.timeDeltas;
  let cur = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    const nodeId = profile.samples[i];
    cur += deltas[i];
    self.set(nodeId, (self.get(nodeId) || 0) + deltas[i]);
  }
  const total = cur;
  const totalMs = total / 1000;

  // 归并到「函数 @ 文件:行号」粒度（同一函数多节点合并）
  const byFile = new Map();
  for (const [nodeId, t] of self) {
    const n = byId.get(nodeId);
    if (!n) continue;
    const cf = n.callFrame;
    const file = cf.url ? cf.url.replace(/^.*[\\/](src[\\/])?/, '') : '(builtin)';
    const key = `${cf.functionName || '(anon)'} @ ${file}:${cf.lineNumber + 1}`;
    byFile.set(key, (byFile.get(key) || 0) + t);
  }

  const sorted = [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);

  console.log('');
  console.log(`蚀月远征 · CPU 热点  [${sc.id}] ${frames - warmup} 帧采样 · 窗口 ${totalMs.toFixed(0)}ms`);
  console.log('  ' + '─'.repeat(80));
  console.log('  ' + 'self'.padEnd(9) + '占比'.padEnd(8) + '函数 @ 位置');
  console.log('  ' + '─'.repeat(80));
  for (const [key, t] of sorted) {
    const pct = (t / total) * 100;
    console.log(`  ${(t / 1000).toFixed(2).padStart(6)}ms   ${pct.toFixed(1).padStart(5)}%  ${key}`);
  }
  console.log('  ' + '─'.repeat(80));
  console.log(`  采样总量 ${totalMs.toFixed(0)}ms · Top25 覆盖 ${(sorted.reduce((a, [, t]) => a + t, 0) / total * 100).toFixed(1)}%`);
}

main().catch((e) => {
  console.error('探针失败：', e);
  process.exit(1);
});
