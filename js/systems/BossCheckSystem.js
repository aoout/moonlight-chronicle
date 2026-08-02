// @ts-check
/* =========================================================
   蚀月远征 · ECS System：Boss 死亡检查
   ========================================================= */
import { System } from '../core/system.js';
import { G, STATE, sm } from '../state.js';

export class BossCheckSystem extends System {
  name = 'BossCheckSystem';

  /** @param {number} dt */
  update(dt) {
    if (G.boss && G.boss.dead && G.state === STATE.PLAYING) {
      G.boss = null;
      sm.transition(STATE.SHOP);
    }
  }
}