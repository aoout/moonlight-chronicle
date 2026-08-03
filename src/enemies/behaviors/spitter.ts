/* =========================================================
   蚀月远征 · 敌人行为：蚀涎魔（保持距离远程喷吐蚀涎）
   ========================================================= */
import { angTo, dist, clamp } from '../../utils.js';
import { spawnEnemyProjectile } from '../../domain/spawn.js';
import type { EnemyInstance, Player } from '../../types/core.d.ts';

export function spitterMove(e: EnemyInstance, dt: number, p: Player, slowF: number): void {
  const d = dist(e, p);
  const a = angTo(e, p);
  if (d > 240) {
    e.x += Math.cos(a) * e.spd * slowF * dt;
    e.y += Math.sin(a) * e.spd * slowF * dt;
  } else {
    e.x -= Math.cos(a) * e.spd * 0.4 * slowF * dt;
    e.y -= Math.sin(a) * e.spd * 0.4 * slowF * dt;
  }
  e.stateT -= dt;
  if (e.stateT <= 0 && d < 420) {
    e.stateT = 2.2;
    const lead = clamp(d / 300, 0.1, 1) * 30;
    const pa = angTo(e, {
      x: p.x + (p.vx || 0) * lead,
      y: p.y + (p.vy || 0) * lead,
    });
    spawnEnemyProjectile(e, pa);
  }
  e.vx = Math.cos(a) * e.spd;
  e.vy = Math.sin(a) * e.spd;
}
