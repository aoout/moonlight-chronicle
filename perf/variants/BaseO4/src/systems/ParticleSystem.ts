/* =========================================================
   蚀月远征 · ECS System：粒子更新 + 压缩
   ========================================================= */
import { System } from '../engine/core/system.js';
import { world } from '../engine/ecs/World.js';
import type { Particle } from '../types/core.d.ts';

export class ParticleSystem extends System {
  name = 'ParticleSystem';

  update(dt: number): void {
    for (const pa of world.query('particles')) {
      pa.t = (pa.t || 0) + dt;
      if (pa.vx !== undefined) {
        pa.x += pa.vx * dt; pa.y += pa.vy * dt;
        pa.vx *= 0.92; pa.vy *= 0.92;
      }
    }
  }
}
