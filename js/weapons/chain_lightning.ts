/* =========================================================
   蚀月远征 · 武器：连锁闪电
   ========================================================= */
import { playerState } from '../state/player.js';
import { RNG, dist } from '../utils.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { nearestEnemy } from './helpers.js';
import { addFx, spawnSpark, spawnStar } from '../render/effects/fx.js';

const pSt = () => playerState.state;

export function chainLightning(src: any, target: any, dmg: number, chains: number, fall: number, maxR: number, color: string, wId: string): void {
  const p = pSt().player;
  if (!p) return;
  let cur = target, remaining = chains, prev = src;
  let d = dmg;
  while (remaining > 0 && cur) {
    CombatSystem.damageEnemy(cur, d, RNG() < p.effCrit, 'arc', wId);
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
