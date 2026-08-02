/* =========================================================
   蚀月远征 · 状态切片：实体列表
   所有游戏实体集合
   ========================================================= */
import { Store } from '../core/store.js';

const INITIAL = {
  enemies: [],
  projectiles: [],
  drops: [],
  particles: [],
  phantoms: [],
};

/** @type {Store<typeof INITIAL>} */
export const entityState = new Store(INITIAL);

/** 便捷访问 */
export const eState = () => entityState.state;