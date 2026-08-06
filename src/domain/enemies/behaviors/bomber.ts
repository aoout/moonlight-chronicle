/* =========================================================
   蚀月远征 · 敌人行为：自爆魔（冲向玩家自爆）
   ========================================================= */
import { PALETTE } from '../../../assets/palette.js';
import { RNG, angTo, dist, clamp, rand } from '../../../engine/util/utils.js';
import { addFx } from '../../../platform/fx/fx.js';
import { killEnemy } from '../../combat.js';
import { explodeEnemy } from '../../drop.js';
import type { EnemyInstance, Player } from '../../../types/core.d.ts';

import { gSt } from '../../../state/accessors.js';

export function bomberMove(e: EnemyInstance, dt: number, p: Player, slowF: number): void {
  if (RNG() < 0.45) {
    addFx({
      x: e.x + Math.cos(gSt().time * 4) * e.size * 0.35,
      y: e.y - e.size * 1.5,
      vx: rand(-18, 18), vy: rand(15, 55),
      life: 0.28, max: 0.28, size: 1.5, color: PALETTE.goldBright,
    });
  }
  const a = angTo(e, p);
  const sp = e.spd + (1 - clamp(dist(e, p) / 300, 0, 1)) * 90;
  e.x += Math.cos(a) * sp * dt;
  e.y += Math.sin(a) * sp * dt;
  if (dist(e, p) < p.r + e.size + 4) {
    explodeEnemy(e, true);
    killEnemy(e, 'bomber');
  }
}
