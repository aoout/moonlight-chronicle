/* =========================================================
   蚀月远征 · Headless 压测：运行器
   ---------------------------------------------------------
   在 Node 中以固定步长驱动完整的 update + render 管线，
   逐帧采样并拆分到系统粒度。

   测量边界（重要，别过度解读数字）：
     ✅ 能测：JS 侧逻辑耗时、渲染指令构造耗时、draw call 结构、
             离屏画布重分配次数、shadowBlur 使用量、实体规模
     ❌ 不能测：GPU 光栅化、合成、真实 VSync 帧节奏
   也就是说 headless 给的是**可回归的相对量**，
   端到端的绝对帧率仍以浏览器内基准为准。
   两者互补：这里守回归，浏览器里定验收。
   ========================================================= */

import { describe, trimWarmup } from './stats.mjs';
import { resetFixtureRng } from './scenarios.mjs';

const DT = 1 / 60;

/**
 * @param {object} m   已加载的游戏模块集合
 * @param {object} host installHost() 的返回值
 */
export function createRunner(m, host) {
  const { sysMan, render, stageState, gSt, eSt, benchState } = m;
  const { stats } = host;

  /** 采集当前实体数量快照 */
  function entityCounts() {
    const es = eSt();
    let aliveEnemies = 0;
    for (let i = 0; i < es.enemies.length; i++) if (!es.enemies[i].dead) aliveEnemies++;
    return {
      enemies: aliveEnemies,
      projectiles: es.projectiles.length,
      particles: es.particles.length,
      drops: es.drops.length,
      phantoms: es.phantoms.length,
    };
  }

  /**
   * 跑单个场景。
   * @param {object} sc 场景定义
   * @param {{renderEnabled?: boolean, repeat?: number}} [opts]
   */
  function runScenario(sc, opts = {}) {
    const renderEnabled = opts.renderEnabled !== false;

    benchState.setBenchActive(true);
    // sustain 场景要跑完整战斗链路，必须用 simulation 模式；
    // fixed 模式会抑制伤害与技能，敌人永不死亡，测出来的不是游戏。
    benchState.setBenchMode(sc.mode === 'fixed' ? 'fixed' : 'simulation');

    // 每个场景从同一颗种子起跑：夹具布局与游戏内随机都归零，
    // 于是场景之间互不污染，跨次跑分也逐帧可复现。
    host.resetRandom?.();
    resetFixtureRng();

    sc.setup();

    const step = () => {
      if (sc.sustain) sc.sustain();
      stageState.set('time', gSt().time + DT);
      sysMan.update(DT);
      if (renderEnabled) render();
    };

    // 预热：让 JIT 升温、离屏缓存建立、实体分布进入稳态
    for (let i = 0; i < sc.warmup; i++) step();

    const frames = sc.frames;
    const updateT = new Float64Array(frames);
    const renderT = new Float64Array(frames);
    const totalT = new Float64Array(frames);
    const drawOps = new Float64Array(frames);
    const paints = new Float64Array(frames);
    const reallocs = new Float64Array(frames);
    const shadowBlurs = new Float64Array(frames);
    const gradients = new Float64Array(frames);
    const enemyCount = new Float64Array(frames);
    const particleCount = new Float64Array(frames);
    const dropCount = new Float64Array(frames);
    const projCount = new Float64Array(frames);
    /** @type {Record<string, number[]>} */
    const sysSamples = {};

    for (let i = 0; i < frames; i++) {
      if (sc.sustain) sc.sustain();

      stats.reset();

      const t0 = performance.now();
      stageState.set('time', gSt().time + DT);
      sysMan.update(DT);
      const t1 = performance.now();
      if (renderEnabled) render();
      const t2 = performance.now();

      updateT[i] = t1 - t0;
      renderT[i] = renderEnabled ? t2 - t1 : 0;
      totalT[i] = t2 - t0;

      const snap = stats.snapshot();
      drawOps[i] = snap.ops;
      paints[i] = snap.paints;
      reallocs[i] = snap.canvasRealloc;
      shadowBlurs[i] = snap.shadowBlur;
      gradients[i] = snap.gradients;

      const frameSys = m.systemProfiler.getLastFrameTimes();
      for (const k in frameSys) {
        (sysSamples[k] ??= []).push(frameSys[k]);
      }

      const ec = entityCounts();
      enemyCount[i] = ec.enemies;
      particleCount[i] = ec.particles;
      dropCount[i] = ec.drops;
      projCount[i] = ec.projectiles;
    }

    const finalCounts = entityCounts();
    sc.teardown();
    benchState.setBenchActive(false);

    const trim = (arr) => trimWarmup(Array.from(arr), 0.03);

    /** @type {Record<string, ReturnType<typeof describe>>} */
    const systems = {};
    for (const k in sysSamples) {
      systems[k] = describe(trim(sysSamples[k]));
    }

    const updateStats = describe(trim(updateT));
    const renderStats = describe(trim(renderT));
    const totalStats = describe(trim(totalT));

    // 帧预算判定：60fps = 16.67ms。headless 无 GPU，这里判的是
    // "JS 侧是否已经吃掉了预算"，超了就一定卡，没超也不代表一定不卡。
    const budget = 1000 / 60;
    const overBudget = Array.from(totalT).filter((v) => v > budget).length;

    return {
      id: sc.id,
      label: sc.label,
      desc: sc.desc,
      mode: sc.mode,
      tags: sc.tags || [],
      frames,
      renderEnabled,
      entities: {
        enemies: Math.round(describe(Array.from(enemyCount)).mean),
        projectiles: Math.round(describe(Array.from(projCount)).mean),
        particles: Math.round(describe(Array.from(particleCount)).mean),
        drops: Math.round(describe(Array.from(dropCount)).mean),
        final: finalCounts,
      },
      update: updateStats,
      render: renderStats,
      total: totalStats,
      draw: {
        ops: describe(trim(drawOps)),
        paints: describe(trim(paints)),
        canvasRealloc: describe(trim(reallocs)),
        shadowBlur: describe(trim(shadowBlurs)),
        gradients: describe(trim(gradients)),
      },
      systems,
      overBudgetFrames: overBudget,
      overBudgetPct: (overBudget / frames) * 100,
      /** 原始帧样本，供对比检验做 bootstrap */
      raw: {
        total: Array.from(totalT),
        update: Array.from(updateT),
        render: Array.from(renderT),
      },
    };
  }

  return { runScenario };
}
