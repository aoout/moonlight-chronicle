/* =========================================================
   蚀月远征 · ECS System：关卡计时
   ========================================================= */
import { System } from '../engine/core/system.js';
import { STATE, sm } from '../engine/core/states.js';
import { stageState } from '../state/stage.js';
import { CONFIG } from '../config/index.js';

export class StageTimerSystem extends System {
  name = 'StageTimerSystem';

  update(dt: number): void {
    const gs: any = stageState.state;
    if (!gs.boss && sm.current === STATE.PLAYING &&
        !CONFIG.BOSS_STAGES.includes(gs.stage) && gs.stage !== CONFIG.FINAL_STAGE) {
      stageState.set('stageTime', gs.stageTime + dt);
      if (gs.stageTime >= gs.stageMax) sm.transition(STATE.SHOP);
    }
  }
}
