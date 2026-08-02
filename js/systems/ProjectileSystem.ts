/* =========================================================
   蚀月远征 · ECS System：投射物更新 + 压缩
   ========================================================= */
import { System } from '../core/system.js';
import { projTick } from '../weapons/index.js';
import { world } from '../ecs/World.js';

export class ProjectileSystem extends System {
  name = 'ProjectileSystem';

  update(dt: number): void {
    for (const pr of world.query('projectiles')) projTick(pr, dt);
    world.compact('projectiles', pr => !!pr.dead);
  }
}
