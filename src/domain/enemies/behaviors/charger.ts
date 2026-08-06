/* =========================================================
   蚀月远征 · 敌人行为：裂口魔（蓄力冲刺）
   ========================================================= */
import { RNG, angTo } from '../../../engine/util/utils.js';
import { world } from '../../../engine/ecs/World.js';
import { spawnSpark, spawnGlow } from '../../../platform/fx/fx.js';
import type { EnemyInstance, Player } from '../../../types/core.d.ts';

export function chargerMove(e: EnemyInstance, dt: number, p: Player, slowF: number): void {
  e.stateT -= dt;
  if (e.stateT <= 0) {
    e.state = e.state === 'windup' ? 'dash' : 'windup';
    e.stateT = e.state === 'windup' ? 0.7 : 0.35;
  }
  if (e.state === 'windup') {
    e.vx = 0; e.vy = 0;
    // 蓄力：独角聚怒，火星自角尖迸溅
    if (RNG() < 0.5) {
      const a = angTo(e, p);
      spawnSpark(e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26, '#ff8a5c', 1, 70);
    }
    spawnGlow(e.x, e.y, 10, '#e2546a', 0.12);
  } else {
    const a = angTo(e, p);
    const sp = e.spd + (e.dash ?? 0);
    e.x += Math.cos(a) * sp * dt;
    e.y += Math.sin(a) * sp * dt;
    e.vx = Math.cos(a) * sp; e.vy = Math.sin(a) * sp;
    if (RNG() < 0.28) {
      world.add('projectiles', {
        ground: true, erode: true, x: e.x, y: e.y, t: 0, delay: 0.7,
        r: 44, dmg: e.dmg * 0.9, color: '#ff7a7a',
      });
    }
  }
}
