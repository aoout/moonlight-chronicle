/* =========================================================
   蚀月远征 · 武器：投射物碰撞检测
   ========================================================= */
import { G } from '../state.js';
import { RNG, dist } from '../utils.js';
import { PALETTE } from '../data/palette.js';
import { neighborEnemies } from '../systems/SpatialSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { AudioEngine } from '../audio/engine.js';
import { spawnImpact, spawnStar, spawnRing, spawnStreak, spawnGlow } from '../render/effects/fx.js';

export function hitScanProjectile(pr: any, dt: number): void {
  const p = G.player;
  if (!p) return;
  if (pr.enemy) {
    if (dist(pr, p) < pr.r + p.r - 2) { CombatSystem.hurtPlayer(pr, pr.dmg); pr.dead = true; }
    return;
  }
  const candidates = neighborEnemies(pr.x, pr.y, pr.r + 60);
  for (const e of candidates) {
    if (e.dead || pr.hit.has(e)) continue;
    if (dist(pr, e) < pr.r + e.size * 0.75) {
      pr.hit.add(e);
      CombatSystem.damageEnemy(e, pr.dmg, RNG() < p.effCrit, 'proj', pr.wId);
      AudioEngine.playSfx('hit');
      spawnImpact(e.x, e.y, pr.color, 0);
      if (pr.wId === 'nova') {
        spawnStar(e.x, e.y, PALETTE.fireBright, 14);
        spawnRing(e.x, e.y, pr.color, 0.35, 36, 2.5);
      } else if (pr.wId === 'shadow') {
        spawnStar(e.x, e.y, PALETTE.violetDark, 10);
      } else if (pr.wId === 'storm') {
        spawnRing(e.x, e.y, pr.color, 0.28, 22, 2);
      } else if (pr.wId === 'lance') {
        spawnStreak(e.x, e.y, Math.atan2(pr.vy || 0, pr.vx || 0), 30, 2, '#ffffff', 0.25);
      }
      if (pr.pierce !== Infinity) {
        pr.pierce--;
        if (pr.pierce < 0) pr.dead = true;
      }
      if (pr.pierce === 0) { pr.dead = true; break; }
      if (pr.pierce < 0) break;
    }
  }
}
