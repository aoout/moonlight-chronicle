/* =========================================================
   蚀月远征 · ECS System：敌人生成（生命周期壳）
   实际生成函数已迁至 domain/spawn.ts
   ========================================================= */
import { System } from '../core/system.js';
import { stageState } from '../state/stage.js';
import { pick } from '../utils.js';
import { stageSpawnRate, stageEnemyPool } from '../data/index.js';
import { spawnEnemy } from '../domain/spawn.js';

import { gSt, gmSt } from '../state/accessors.js';

export class SpawnSystem extends System {
  name = 'SpawnSystem';

  update(dt: number): void {
    const gs: any = gSt();
    const sRate = stageSpawnRate(gs.stage) * (gmSt()._timeScale || 1);
    if (!gs.boss) {
      stageState.set('spawnAcc', gs.spawnAcc + sRate * dt);
      while (gSt().spawnAcc >= 1) {
        stageState.set('spawnAcc', gSt().spawnAcc - 1);
        spawnEnemy(pick(stageEnemyPool(gs.stage)));
      }
    }
  }
}
