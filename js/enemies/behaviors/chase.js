/* =========================================================
   蚀月远征 · 敌人行为：基础追击
   ========================================================= */
import { angTo } from '../../utils.js';

export function chaseMove(e, dt, p, slowF) {
  const a = angTo(e, p);
  e.x += Math.cos(a) * e.spd * slowF * dt;
  e.y += Math.sin(a) * e.spd * slowF * dt;
  e.vx = Math.cos(a) * e.spd;
  e.vy = Math.sin(a) * e.spd;
}