/* =========================================================
   蚀月远征 · 武器：连锁闪电
   ========================================================= */
import { dist, RNG } from '../../engine/util/utils.js';
import { damageEnemy } from '../combat.js';
import { nearestEnemy } from './helpers.js';
import { addFx, spawnSpark, spawnStar, spawnRing, spawnGlow } from '../../platform/fx/fx.js';

import { pSt } from '../../state/accessors.js';
import type { Player, EnemyInstance } from '../../types/core.d.ts';

export function chainLightning(src: Player | EnemyInstance, target: EnemyInstance, dmg: number, chains: number, fall: number, maxR: number, color: string, wId: string): void {
  const p = pSt().player;
  if (!p) return;
  let cur: EnemyInstance | null = target, remaining = chains, prev = src;
  let d = dmg;
  while (remaining > 0 && cur) {
    damageEnemy(cur, d, RNG() < p.effCrit, 'arc', wId);
    spawnSpark(cur.x, cur.y, '#ffffff', 2, 150);
    spawnSpark(cur.x, cur.y, color, 3, 130);
    if (RNG() < 0.3) spawnStar(cur.x, cur.y, color, 6);
    // 跳转电弧：冲击微环 + 光晕
    if (RNG() < 0.45) spawnRing(cur.x, cur.y, color, 0.22, 18, 1.6);
    if (RNG() < 0.3) spawnGlow(cur.x, cur.y, 10, color, 0.25);
    addFx({ chain: true, x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, t: 0, max: 0.18, color });
    d *= fall;
    prev = cur;
    cur = nearestEnemy(cur.x, cur.y, maxR, cur);
    remaining--;
    if (cur === prev) break;
  }
}
