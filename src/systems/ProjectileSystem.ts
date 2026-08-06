/* =========================================================
   蚀月远征 · ECS System：投射物更新 + 压缩
   ========================================================= */
import { System } from '../engine/core/system.js';
import { projTick, setProjCount } from '../domain/weapons/index.js';
import { world } from '../engine/ecs/World.js';
import type { Projectile } from '../types/core.d.ts';

export class ProjectileSystem extends System {
  name = 'ProjectileSystem';

  update(dt: number): void {
    // 更新投射物计数供尾迹密度控制使用
    setProjCount(world.query('projectiles').length);
    let dirty = false;
    for (const pr of world.query('projectiles')) {
      projTick(pr, dt);
      if (pr.dead) dirty = true;
    }
    if (dirty) world.markCompactDirty('projectiles');
  }
}
