// @ts-check
/* =========================================================
   蚀月远征 · ECS System：掉落物更新 + 压缩
   ========================================================= */
import { System } from '../core/system.js';
import { G } from '../state.js';
import { dropTick } from '../enemies.js';
import { world } from '../ecs/World.js';

export class DropSystem extends System {
  name = 'DropSystem';

  /** @param {number} dt */
  update(dt) {
    const drops = world.query('drops');
    for (const d of drops) dropTick(d, dt);
    world.compact('drops', /** @param {any} d */ d => d.take);
  }
}