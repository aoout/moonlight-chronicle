// @ts-check
/* =========================================================
   蚀月远征 · ECS System：Boss 死亡检查
   ========================================================= */
import { System } from '../core/system.js';
import { G, STATE, sm } from '../state.js';
import { stageState } from '../state/stage.js';

export class BossCheckSystem extends System {
  name = 'BossCheckSystem';

  /** @param {number} dt */
  update(dt) {
    const gs = stageState.state;
    if (gs.boss && gs.boss.dead && G.state === STATE.PLAYING) {
      stageState.set('boss', null);
      sm.transition(STATE.SHOP);
    }
  }
}