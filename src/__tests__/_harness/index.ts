/* =========================================================
   测试地基 · 统一出口
   ---------------------------------------------------------
   测试文件只需 `import { ... } from '../_harness/index.js'`。

   全局副作用（确定性随机、宿主替身）由 `_harness/install.ts` 在最早时机
   安装，每个用例前的状态重置由 `setup.ts` 注册，这里只导出显式调用的工具。
   ========================================================= */
export { createCanvasRecorder } from './canvas.js';
export type { CanvasRecorder, DrawCall } from './canvas.js';

export { seedRng, queueRandom, withSeed, pendingRandomCount } from './random.js';

export { createMemoryStorage, clearHostStorage } from './host.js';

export { ALL_STORES, resetAllStores } from './stores.js';
export type { DiscoveredStore } from './stores.js';

export { importFresh, importFreshAll } from './modules.js';

export { enterPlaying, enableDevMode, captureEvent } from './flow.js';
export type { EventLog } from './flow.js';

export {
  makePlayer,
  installPlayer,
  equip,
  makeEnemy,
  makeDummy,
  makeBoss,
  makeProjectile,
  makeDrop,
  bindWorld,
  spawnEnemies,
  spawnProjectiles,
  resetRunStats,
} from './fixtures.js';
