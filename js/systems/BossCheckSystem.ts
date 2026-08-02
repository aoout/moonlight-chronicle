/* =========================================================
   蚀月远征 · ECS System：Boss 死亡检查
   ========================================================= */
import { System } from '../core/system.js';
import { G, STATE, sm } from '../state.js';
import { stageState } from '../state/stage.js';

export class BossCheckSystem extends System {
  name = 'BossCheckSystem';

  update(dt: number): void {
    const gs: any = stageState.state;
    const b = gs.boss;
    if (b && b.dead && G.state === STATE.PLAYING) {
      stageState.set('boss', null);
      sm.transition(STATE.SHOP);
    }
  }
}
