/* =========================================================
   蚀月远征 · 武器：辅助函数
   ========================================================= */
import { dist } from '../../engine/util/utils.js';
import { neighborEnemies, queryRadius, nearestInGrid } from '../../engine/spatial/SpatialSystem.js';
import { pSt } from '../../state/accessors.js';
import type { EnemyInstance } from '../../types/core.d.ts';

export function nearestEnemy(x: number, y: number, maxR?: number, exclude?: EnemyInstance): EnemyInstance | null {
  return nearestInGrid(x, y, maxR === undefined ? 1e9 : maxR, exclude);
}

export function denseEnemySpot(): EnemyInstance | null {
  const p = pSt().player;
  if (!p) return null;
  let best = null, bestScore = 0;
  const candidates = neighborEnemies(p.x, p.y, 160);
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
