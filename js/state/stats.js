/* =========================================================
   蚀月远征 · 状态切片：统计
   击杀数、金币、经验、等级、战斗统计
   ========================================================= */
import { Store } from '../core/store.js';

const INITIAL = {
  kills: 0,
  gold: 0,
  xp: 0,
  xpNeeded: 100,
  level: 1,
  levelQueue: 0,
  runStats: { totalDmg: 0, bossKills: 0, win: false, wDmg: {} },
};

/** @type {Store<typeof INITIAL>} */
export const statsState = new Store(INITIAL);

/** 便捷访问 */
export const stState = () => statsState.state;