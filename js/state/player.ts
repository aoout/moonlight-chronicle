/* =========================================================
   蚀月远征 · 状态切片：玩家
   玩家状态、武器冷却
   ========================================================= */
import { Store } from '../core/store.js';
import type { Player } from '../types/core.d.ts';

interface PlayerStateSlice {
  player: Player | null;
  weaponCd: Record<string, number>;
  weaponCdFull: Record<string, number>;
}

const INITIAL: PlayerStateSlice = {
  player: null,
  weaponCd: {},
  weaponCdFull: {},
};

export const playerState = new Store<PlayerStateSlice>(INITIAL);

/** 便捷访问 */
export const pState = () => playerState.state;
