/* =========================================================
   蚀月远征 · ECS System：关卡计时
   ========================================================= */
import { System } from '../core/system.js';
import { G, STATE, sm } from '../state.js';
import { stageState } from '../state/stage.js';
import { CONFIG } from '../data/index.js';

export class StageTimerSystem extends System {
  name = 'StageTimerSystem';

  update(dt: number): void {
    const gs: any = stageState.state;
    if (!gs.boss && G.state === STATE.PLAYING &&
        !CONFIG.BOSS_STAGES.includes(gs.stage) && gs.stage !== CONFIG.FINAL_STAGE) {
      stageState.set('stageTime', gs.stageTime + dt);
      if (gs.stageTime >= gs.stageMax) sm.transition(STATE.SHOP);
    }
  }
}
