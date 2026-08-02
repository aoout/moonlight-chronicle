// @ts-check
/* =========================================================
   蚀月远征 · ECS System：投射物更新 + 压缩
   ========================================================= */
import { System } from '../core/system.js';
import { G } from '../state.js';
import { PROJECTILE_POOL } from '../entity_pool.js';
import { projTick } from '../weapons/index.js';

export class ProjectileSystem extends System {
  name = 'ProjectileSystem';

  /** @param {number} dt */
  update(dt) {
    for (const pr of G.projectiles) projTick(pr, dt);
    PROJECTILE_POOL.compact(G.projectiles, pr => !!pr.dead);
  }
}