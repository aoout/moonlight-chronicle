// @ts-check
/* =========================================================
   蚀月远征 · ECS System：掉落物更新 + 压缩
   ========================================================= */
import { System } from '../core/system.js';
import { G } from '../state.js';
import { DROP_POOL } from '../entity_pool.js';
import { dropTick } from '../enemies.js';

export class DropSystem extends System {
  name = 'DropSystem';

  /** @param {number} dt */
  update(dt) {
    for (const d of G.drops) dropTick(d, dt);
    DROP_POOL.compact(G.drops, /** @param {any} d */ d => d.take);
  }
}