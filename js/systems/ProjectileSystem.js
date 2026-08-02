// @ts-check
/* =========================================================
   蚀月远征 · ECS System：投射物更新 + 压缩
   ========================================================= */
import { System } from '../core/system.js';
import { G } from '../state.js';
import { projTick } from '../weapons/index.js';
import { world } from '../ecs/World.js';

export class ProjectileSystem extends System {
  name = 'ProjectileSystem';

  /** @param {number} dt */
  update(dt) {
    for (const pr of world.query('projectiles')) projTick(pr, dt);
    world.compact('projectiles', pr => !!pr.dead);
  }
}