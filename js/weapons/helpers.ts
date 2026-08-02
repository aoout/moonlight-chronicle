/* =========================================================
   蚀月远征 · 武器：辅助函数
   ========================================================= */
import { G } from '../state.js';
import { dist } from '../utils.js';
import { _neighborEnemies, queryRadius, nearestInGrid } from '../spatial.js';

export function nearestEnemy(x: number, y: number, maxR?: number): any {
  return nearestInGrid(x, y, maxR === undefined ? 1e9 : maxR);
}

export function denseEnemySpot(): any {
  const p = G.player;
  if (!p) return null;
  let best = null, bestScore = 0;
  const candidates = _neighborEnemies(p.x, p.y, 160);
  for (const e of candidates) {
    if (e.dead) continue;
    let score = 0;
    const nearby = queryRadius(e.x, e.y, 160);
    for (const o of nearby) {
      if (o === e) continue;
      const d = dist(e, o);
      score += 1.4 - d / 160;
    }
    if (score > bestScore) { bestScore = score; best = e; }
  }
  if (bestScore < 1) return null;
  return best;
}
