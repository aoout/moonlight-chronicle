/* =========================================================
   蚀月远征 · 敌人行为注册表
   ========================================================= */
import { chaseMove } from './chase.js';
import { chargerMove } from './charger.js';
import { spitterMove } from './spitter.js';
import { bomberMove } from './bomber.js';
import { wingMove } from './wing.js';
import { shadowMove } from './shadow.js';

/* 行为注册表：type → 移动函数 */
/** @type {Record<string, (e:import('../../types/core.d.ts').EnemyInstance, dt:number, p:import('../../types/core.d.ts').Player, slowF:number) => void>} */
export const ENEMY_MOVES = {
  _default: chaseMove,
  grub: chaseMove,
  rat: chaseMove,
  armored: chaseMove,
  giant: chaseMove,
  splitter: chaseMove,
  charger: chargerMove,
  spitter: spitterMove,
  bomber: bomberMove,
  wing: wingMove,
  shadow: shadowMove,
};