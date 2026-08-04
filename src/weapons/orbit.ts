/* =========================================================
   蚀月远征 · 武器：环舞之刃（环绕武器实体）
   ========================================================= */
import { RNG, dist, angTo, rand } from '../utils.js';
import { PALETTE } from '../data/palette.js';
import { WEAPONS } from '../data/index.js';
import { neighborEnemies } from '../systems/SpatialSystem.js';
import { damageEnemy } from '../domain/combat.js';
import { AudioEngine } from '../audio/engine.js';
import { addFx, spawnSpark, spawnGlow, spawnShard } from '../render/effects/fx.js';

import { pSt, gSt } from '../state/accessors.js';

export function orbitTick(dt: number): void {
  const p = pSt().player;
  if (!p) return;
  const orbitW = p.weapons.find(w => w.id === 'orbit');
  p.effects.orbits = p.effects.orbits || [];
  if (orbitW) {
    const def = WEAPONS.orbit as any;
    const n = (def.blades || 2) + orbitW.lv;
    const angularSpd = def.angularSpd || 1.6;
    const orbitR = (def.radius || 120) * p.area;
    p.effects.orbits = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + gSt().time * angularSpd;
      const ox = p.x + Math.cos(a) * orbitR;
      const oy = p.y + Math.sin(a) * orbitR;
      p.effects.orbits.push({ x: ox, y: oy, a });
      if (RNG() < 0.14) addFx({ x: ox, y: oy, vx: rand(-15, 15), vy: rand(-15, 15), life: 0.3, max: 0.3, size: 2.2, color: PALETTE.gold });
      p.effects.orbitHits = p.effects.orbitHits || {};
      const orbitCandidates = neighborEnemies(ox, oy, 80);
      for (const e of orbitCandidates) {
        if (e.dead) continue;
        if (dist({ x: ox, y: oy }, e) < 20 + e.size * 0.6) {
          if (e._orbitT === undefined || e._orbitT < gSt().time - 0.25) {
            e._orbitT = gSt().time;
            damageEnemy(e, WEAPONS.orbit.dmg(p, orbitW.lv) * dt * 8, RNG() < p.effCrit, 'orbit', 'orbit');
            AudioEngine.playSfx('hit');
            spawnSpark(e.x, e.y, PALETTE.gold, 3, 130);
            spawnGlow(e.x, e.y, 10, PALETTE.gold, 0.3);
            if (RNG() < 0.3) spawnShard(e.x, e.y, PALETTE.goldDeep, 3, 140);
          }
        }
      }
    }
  } else {
    // 武器被出售/移除后清空残留环绕位置，避免月牙残留在场上
    p.effects.orbits = [];
  }
}
