/* =========================================================
   蚀月远征 · ECS System：环舞之刃 + 月影残像
   ========================================================= */
import { PALETTE } from '../assets/palette.js';
import { System } from '../engine/core/system.js';
import { orbitTick } from '../domain/weapons/index.js';
import { world } from '../engine/ecs/World.js';
import { rand, dist, angTo } from '../engine/util/utils.js';
import { nearestEnemy } from '../domain/weapons/helpers.js';
import { spawnGlow } from '../platform/fx/fx.js';
import type { Phantom } from '../types/core.d.ts';

import { pSt } from '../state/accessors.js';

export class OrbitSystem extends System {
  name = 'OrbitSystem';

  update(dt: number): void {
    orbitTick();

    const p = pSt().player;
    if (!p) return;
    const phantoms = world.query('phantoms');
    let dirty = false;
    for (const ph of phantoms) {
      ph.t += dt;
      ph.fireT -= dt;
      if (ph.t >= ph.max) {
        dirty = true;
        continue;
      }
      if (dist(ph, p) > 96) {
        const a = angTo(ph, p);
        ph.x += Math.cos(a) * 92 * dt;
        ph.y += Math.sin(a) * 92 * dt;
      } else {
        ph.x += rand(-8, 8) * dt;
        ph.y += rand(-8, 8) * dt;
      }
      const t = nearestEnemy(ph.x, ph.y, 380);
      if (t && ph.fireT <= 0) {
        ph.fireT = 0.9;
        const a = angTo(ph, t);
        world.add('projectiles', { x: ph.x, y: ph.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
          r: 5, dmg: ph.dmg, pierce: p.pierce, color: PALETTE.icePale, hit: new Set(), wId: 'phantom', life: 2 });
        spawnGlow(ph.x + Math.cos(a) * 14, ph.y + Math.sin(a) * 14, 6, PALETTE.icePale, 0.22);
      }
    }
    if (dirty) world.markCompactDirty('phantoms');
  }
}
