/* =========================================================
   蚀月远征 · Headless 压测：游戏模块加载
   ---------------------------------------------------------
   用 Vite 的 SSR 管线在 Node 里加载 TS 源码：
   与 vitest 用的是同一套转译，不额外引入构建差异；
   同时避开 vitest 的用例框架开销 —— 压测不需要断言运行时。
   ========================================================= */
import { createServer } from 'vite';

/**
 * 启动 Vite 并加载压测所需的全部游戏模块。
 * 必须在 installHost() 之后调用。
 */
export async function loadGame({ width = 1280, height = 720, dpr = 1, host }) {
  const server = await createServer({
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true },
    appType: 'custom',
    logLevel: 'error',
  });

  const load = (p) => server.ssrLoadModule(p);

  // 渲染状态要在任何渲染模块被调用前装好画布替身
  const { renderState } = await load('/src/state/render.ts');
  renderState.patch({
    width, height, dpr,
    canvas: host.mainCanvas, ctx: host.mainCtx,
    bgCanvas: host.bgCanvas, ctxBg: host.bgCtx,
  });

  // 注册真实 profiler（engine 通过端口拿到它，从而产出 per-system 耗时）
  const perf = await load('/src/infra/debug/performance.ts');

  const [
    accessors, systems, stageMod, playerMod, statsMod, flowMod,
    renderMod, worldMod, poolMod, factoriesMod, configMod, benchState,
    settingsMod,
  ] = await Promise.all([
    load('/src/state/accessors.ts'),
    load('/src/systems/index.ts'),
    load('/src/state/stage.ts'),
    load('/src/state/player.ts'),
    load('/src/state/stats.ts'),
    load('/src/state/flow.ts'),
    load('/src/features/render/index.ts'),
    load('/src/engine/ecs/World.ts'),
    load('/src/engine/ecs/entity_pool.ts'),
    load('/src/engine/ecs/entity_factories.ts'),
    load('/src/config/index.ts'),
    load('/src/infra/debug/bench/state.ts'),
    load('/src/state/settings.ts'),
  ]);

  const sysMan = systems.getSysMan();

  return {
    server,
    close: () => server.close(),

    sysMan,
    render: renderMod.render,
    systemProfiler: perf.systemProfiler,
    benchState,

    world: worldMod.world,
    entityFactories: factoriesMod,
    PROJECTILE_POOL: poolMod.PROJECTILE_POOL,
    PARTICLE_POOL: poolMod.PARTICLE_POOL,
    ENEMY_POOL: poolMod.ENEMY_POOL,

    ENEMIES: configMod.ENEMIES,
    BOSSES: configMod.BOSSES,

    eSt: accessors.eSt,
    rSt: accessors.rSt,
    pSt: accessors.pSt,
    gSt: accessors.gSt,

    renderState,
    stageState: stageMod.stageState,
    playerState: playerMod.playerState,
    statsState: statsMod.statsState,
    gameState: flowMod.gameState,
    settingsState: settingsMod.settingsState,
  };
}
