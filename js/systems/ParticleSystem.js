// @ts-check
/* =========================================================
   蚀月远征 · ECS System：粒子更新 + 压缩
   ========================================================= */
import { System } from '../core/system.js';
import { world } from '../ecs/World.js';

export class ParticleSystem extends System {
  name = 'ParticleSystem';

  /** @param {number} dt */
  update(dt) {
    for (const pa of world.query('particles')) {
      pa.t = (pa.t || 0) + dt;
      if (pa.vx !== undefined) {
        pa.x += pa.vx * dt; pa.y += pa.vy * dt;
        pa.vx *= 0.92; pa.vy *= 0.92;
      }
    }
    world.compact('particles', /** @param {any} pa */ pa => (pa.t || 0) >= (pa.max || 0.7));
  }
}