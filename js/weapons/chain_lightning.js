/* =========================================================
   蚀月远征 · 武器：连锁闪电
   ========================================================= */
import { G } from '../state.js';
import { RNG, dist } from '../utils.js';
import { damageEnemy } from '../enemies.js';
import { nearestEnemy } from './helpers.js';
import { addFx, spawnSpark, spawnStar } from '../fx.js';

export function chainLightning(src, target, dmg, chains, fall, maxR, color, wId) {
  let cur = target, remaining = chains, prev = src;
  let d = dmg;
  while (remaining > 0 && cur) {
    damageEnemy(cur, d, RNG() < G.player.effCrit, 'arc', wId);
    spawnSpark(cur.x, cur.y, '#ffffff', 2, 150);
    spawnSpark(cur.x, cur.y, color, 3, 130);
    if (RNG() < 0.3) spawnStar(cur.x, cur.y, color, 6);
    addFx({ chain: true, x1: prev.x, y1: prev.y, x2: cur.x, y2: cur.y, t: 0, max: 0.18, color });
    d *= fall;
    prev = cur;
    cur = nearestEnemy(cur.x, cur.y, maxR);
    remaining--;
    if (cur === prev) break;
  }
}