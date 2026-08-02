/* =========================================================
   蚀月远征 · 状态切片：玩家
   玩家状态、武器冷却
   ========================================================= */
import { Store } from '../core/store.js';

const INITIAL = {
  player: null,
  weaponCd: {},
  weaponCdFull: {},
};

/** @type {Store<typeof INITIAL>} */
export const playerState = new Store(INITIAL);

/** 便捷访问 */
export const pState = () => playerState.state;