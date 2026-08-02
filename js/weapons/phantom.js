// @ts-nocheck
/* =========================================================
   蚀月远征 · 武器：月影残像（分身）
   ========================================================= */
import { G } from '../state.js';
import { RNG, rand, dist, angTo } from '../utils.js';
import { world } from '../ecs/World.js';
import { nearestEnemy } from './helpers.js';
import { spawnGlow } from '../fx.js';

export function phantomTick(dt) {
  const p = G.player;
  for (const ph of world.query('phantoms')) {
    ph.t += dt;
    ph.fireT -= dt;
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
      ph.fireT = 0.55;
      const a = angTo(ph, t);
      world.add('projectiles', { x: ph.x, y: ph.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
        r: 5, dmg: ph.dmg, pierce: p.pierce, color: '#c9b8f0', hit: new Set(), wId: 'phantom', life: 2 });
      spawnGlow(ph.x + Math.cos(a) * 14, ph.y + Math.sin(a) * 14, 6, '#c9b8f0', 0.22);
    }
  }
  world.compact('phantoms', ph => ph.t >= ph.max);
}