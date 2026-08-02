/* =========================================================
   蚀月远征 · 武器：环舞之刃（环绕武器实体）
   ========================================================= */
import { G } from '../state.js';
import { RNG, dist } from '../utils.js';
import { PALETTE } from '../palette.js';
import { WEAPONS } from '../data/index.js';
import { _neighborEnemies } from '../spatial.js';
import { damageEnemy } from '../enemies.js';
import { AudioEngine } from '../audio.js';
import { addFx, spawnSpark, spawnGlow, spawnShard } from '../fx.js';

export function orbitTick(dt) {
  const p = G.player;
  const orbitW = p.weapons.find(w => w.id === 'orbit');
  p.orbits = p.orbits || [];
  if (orbitW) {
    const n = 2 + orbitW.lv;
    p.orbits = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + G.time * 1.6;
      const ox = p.x + Math.cos(a) * 100 * p.area;
      const oy = p.y + Math.sin(a) * 100 * p.area;
      p.orbits.push({ x: ox, y: oy, a });
      if (RNG() < 0.14) addFx({ x: ox, y: oy, vx: rand(-15, 15), vy: rand(-15, 15), life: 0.3, max: 0.3, size: 2.2, color: PALETTE.gold });
      p.orbitHits = p.orbitHits || {};
      const orbitCandidates = _neighborEnemies(ox, oy, 80);
      for (const e of orbitCandidates) {
        if (e.dead) continue;
        if (dist({ x: ox, y: oy }, e) < 20 + e.size * 0.6) {
          if (e._orbitT === undefined || e._orbitT < G.time - 0.25) {
            e._orbitT = G.time;
            damageEnemy(e, WEAPONS.orbit.dmg(p, orbitW.lv) * dt * 8, RNG() < p.effCrit, 'orbit', 'orbit');
            AudioEngine.playSfx('hit');
            spawnSpark(e.x, e.y, PALETTE.gold, 3, 130);
            spawnGlow(e.x, e.y, 10, PALETTE.gold, 0.3);
            if (RNG() < 0.3) spawnShard(e.x, e.y, PALETTE.goldDeep, 3, 140);
          }
        }
      }
    }
  }
}