/* =========================================================
   蚀月远征 · 数据层 —— 统一导出入口
   ========================================================= */
export { STATS, STAT_ORDER, BASE_STATS } from './stats.js';
export { WEAPONS, WEAPON_UPGRADE_COST } from './weapons.js';
export { SHOP_ITEMS } from './items.js';
export { BLESSINGS, pickBlessings } from './blessings.js';
export { ENEMIES } from './enemies.js';
export { BOSSES, BOSS_POOLS } from './bosses.js';
export {
  CONFIG, LEVELS, CURSES, STAGE_NAMES,
  stageEnemyPool, inflationRate, stageSpawnRate, enemyScale, refillPrice,
} from './stages.js';
