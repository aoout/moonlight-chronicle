/* =========================================================
   蚀月远征 · 敌人行为：裂口魔（蓄力冲刺）
   ========================================================= */
import { G } from '../../state.js';
import { RNG, angTo } from '../../utils.js';
import { PROJECTILE_POOL } from '../../entity_pool.js';

export function chargerMove(e, dt, p, slowF) {
  e.stateT -= dt;
  if (e.stateT <= 0) {
    e.state = e.state === 'windup' ? 'dash' : 'windup';
    e.stateT = e.state === 'windup' ? 0.7 : 0.35;
  }
  if (e.state === 'windup') {
    e.vx = 0; e.vy = 0;
  } else {
    const a = angTo(e, p);
    const sp = e.spd + e.dash;
    e.x += Math.cos(a) * sp * dt;
    e.y += Math.sin(a) * sp * dt;
    e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
    if (RNG() < 0.28) {
      G.projectiles.push(PROJECTILE_POOL.addWith({
        ground: true, x: e.x, y: e.y, t: 0, delay: 0.7,
        r: 44, dmg: e.dmg * 0.9, color: '#ff7a7a',
      }));
    }
  }
}