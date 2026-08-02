/* =========================================================
   蚀月远征 · 敌人行为：噬光翼（正弦波动追击）
   ========================================================= */
import { angTo } from '../../utils.js';

export function wingMove(e, dt, p, slowF) {
  e.t += dt;
  const sp = e.spd * (1 + Math.sin(e.t * 3) * 0.25) * slowF;
  const a = angTo(e, p);
  e.x += Math.cos(a) * sp * dt;
  e.y += Math.sin(a) * sp * dt;
  e.vx = Math.cos(a) * sp;
  e.vy = Math.sin(a) * sp;
}