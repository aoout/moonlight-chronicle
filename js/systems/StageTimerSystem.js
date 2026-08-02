// @ts-check
/* =========================================================
   蚀月远征 · ECS System：关卡计时
   ========================================================= */
import { System } from '../core/system.js';
import { G, STATE, sm } from '../state.js';
import { CONFIG } from '../data/index.js';

export class StageTimerSystem extends System {
  name = 'StageTimerSystem';

  /** @param {number} dt */
  update(dt) {
    if (!G.boss && G.state === STATE.PLAYING &&
        !CONFIG.BOSS_STAGES.includes(G.stage) && G.stage !== CONFIG.FINAL_STAGE) {
      G.stageTime += dt;
      if (G.stageTime >= G.stageMax) sm.transition(STATE.SHOP);
    }
  }
}