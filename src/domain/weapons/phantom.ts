/* =========================================================
   蚀月远征 · 武器：月影残像（分身）
   ========================================================= */
import { RNG, rand, dist, angTo } from '../../engine/util/utils.js';
import { world } from '../../engine/ecs/World.js';
import { WEAPONS } from '../../config/index.js';
import { nearestEnemy } from './helpers.js';
import { spawnGlow } from '../../platform/fx/fx.js';
import type { Phantom } from '../../types/core.d.ts';

import { pSt } from '../../state/accessors.js';

export function phantomTick(dt: number): void {
  const p = pSt().player;
  if (!p) return;
  const def = WEAPONS.phantom as any;
  const followDist = def.followDist || 96;
  const followSpeed = def.followSpeed || 92;
  const wanderSpeed = def.wanderSpeed || 8;
  const targetRange = def.targetRange || 380;
  const fireIntv = def.fireIntv || 0.55;
  const fp = (def.fire?.projectile as any) || {};
  const projSpeed = fp.speed || 300;
  const projR = fp.radius || 5;
  const projLife = fp.life || 2;
  const color = fp.color || '#dbe8ff';

  let dirty = false;
  for (const ph of world.query('phantoms')) {
    ph.t += dt;
    ph.fireT -= dt;
    if (ph.t >= ph.max) {
      dirty = true;
      continue;
    }
    if (dist(ph, p) > followDist) {
      const a = angTo(ph, p);
      ph.x += Math.cos(a) * followSpeed * dt;
      ph.y += Math.sin(a) * followSpeed * dt;
    } else {
      ph.x += rand(-wanderSpeed, wanderSpeed) * dt;
      ph.y += rand(-wanderSpeed, wanderSpeed) * dt;
    }
    const t = nearestEnemy(ph.x, ph.y, targetRange);
    if (t && ph.fireT <= 0) {
      ph.fireT = fireIntv;
      const a = angTo(ph, t);
      world.add('projectiles', { x: ph.x, y: ph.y, vx: Math.cos(a) * projSpeed, vy: Math.sin(a) * projSpeed,
        r: projR, dmg: ph.dmg, pierce: p.pierce, color, hit: new Set(), wId: 'phantom', life: projLife });
      spawnGlow(ph.x + Math.cos(a) * 14, ph.y + Math.sin(a) * 14, 6, color, 0.22);
    }
  }
  if (dirty) world.markCompactDirty('phantoms');
}
