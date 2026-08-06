/* =========================================================
   蚀月远征 · 敌人行为：基础追击
   ========================================================= */
import { angTo } from '../../../engine/util/utils.js';
import type { EnemyInstance, Player } from '../../../types/core.d.ts';

export function chaseMove(e: EnemyInstance, dt: number, p: Player, slowF: number): void {
  const a = angTo(e, p);
  e.x += Math.cos(a) * e.spd * slowF * dt;
  e.y += Math.sin(a) * e.spd * slowF * dt;
  e.vx = Math.cos(a) * e.spd;
  e.vy = Math.sin(a) * e.spd;
}
