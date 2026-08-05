/* =========================================================
   蚀月远征 · 敌人行为：蚀涎魔（保持距离远程喷吐蚀涎）
   ========================================================= */
import { angTo, dist, clamp } from '../../utils.js';
import { spawnEnemyProjectile } from '../../domain/spawn.js';
import { spawnGlow, spawnBurst, spawnSpark } from '../../render/effects/fx.js';
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
  /* 新月·隐匿：隐匿期间失去目标，不进行喷吐 */
  const cloaked = (p.effects.cloakTimer ?? 0) > 0;
  if (e.stateT <= 0 && d < 420 && !cloaked) {
    e.stateT = 2.2;
    // 预判射击：朝玩家移动方向提前量（lead = 预判秒数 0.1~1s）
    const lead = clamp(d / 300, 0.1, 1);
    const pa = angTo(e, {
      x: p.x + (p.vx || 0) * lead,
      y: p.y + (p.vy || 0) * lead,
    });
    // 喷吐瞬间：毒囊收缩 + 毒液迸射（朝目标一线绿光）
    spawnGlow(e.x + Math.cos(pa) * 20, e.y + Math.sin(pa) * 20, 12, '#b6ffd8', 0.25);
    spawnBurst(e.x, e.y, '#b6ffd8', 6);
    spawnSpark(e.x + Math.cos(pa) * 16, e.y + Math.sin(pa) * 16, '#7fd6a4', 4, 130);
    spawnEnemyProjectile(e, pa);
  }
  e.vx = Math.cos(a) * e.spd;
  e.vy = Math.sin(a) * e.spd;
}
