/* =========================================================
   蚀月远征 · 敌人行为：自爆魔（冲向玩家自爆）
   ========================================================= */
import { G } from '../../state.js';
import { RNG, angTo, dist, clamp, rand } from '../../utils.js';
import { addFx } from '../../fx.js';
import { CombatSystem } from '../../systems/CombatSystem.js';
import { DropSystem } from '../../systems/DropSystem.js';

export function bomberMove(e, dt, p, slowF) {
  if (RNG() < 0.45) {
    addFx({
      x: e.x + Math.cos(G.time * 4) * e.size * 0.35,
      y: e.y - e.size * 1.5,
      vx: rand(-18, 18), vy: rand(15, 55),
      life: 0.28, max: 0.28, size: 1.5, color: '#ffd98a',
    });
  }
  const a = angTo(e, p);
  const sp = e.spd + (1 - clamp(dist(e, p) / 300, 0, 1)) * 90;
  e.x += Math.cos(a) * sp * dt;
  e.y += Math.sin(a) * sp * dt;
  if (dist(e, p) < p.r + e.size + 4) {
    DropSystem.explodeEnemy(e, true);
    CombatSystem.killEnemy(e, 'bomber');
  }
}