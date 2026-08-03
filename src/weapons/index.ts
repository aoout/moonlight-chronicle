/* =========================================================
   蚀月远征 · 武器层：开火 / 投射物 / 调度 / 统一导出
   采用可组合行为管线
   ========================================================= */
import { RNG, rand, dist, angTo } from '../utils.js';
import { PALETTE } from '../data/palette.js';
import { WEAPONS } from '../data/index.js';
import { world } from '../ecs/World.js';
import { neighborEnemies, queryRadius } from '../systems/SpatialSystem.js';
import { addFx, spawnBurst, spawnRing, spawnSpark, spawnStar, spawnShard, spawnStreak, spawnGlow, spawnImpact, spawnHitFx } from '../render/effects/fx.js';
import { shakeScreen } from '../state/render.js';
import { AudioEngine } from '../audio/engine.js';
import { chainLightning } from './chain_lightning.js';
import { nearestEnemy, denseEnemySpot } from './helpers.js';
import { executeFirePipeline, executeProjPipeline } from './pipeline.js';

import { pSt } from '../state/accessors.js';
import type { WeaponInstance, Projectile } from '../types/core.d.ts';

/* ---------- 重新导出公共 API ---------- */
export { nearestEnemy } from './helpers.js';
export { orbitTick } from './orbit.js';
export { phantomTick } from './phantom.js';
export { stormTick } from './storm.js';

/* ---------- 开火调度 ---------- */
export function weaponFire(w: WeaponInstance): number {
  const p = pSt().player;
  if (!p) return 0;
  const def = WEAPONS[w.id];
  const lv = w.lv;
  const baseDmg = def.dmg(p, lv);
  const cd = (def.cd ? def.cd() : (def.tick ?? 0) * 2) * (1 - p.cdr);
  if (w.id === 'orbit') return cd;
  if (w.id === 'storm') return cd;

  // 所有武器统一使用可组合行为管线（def.fire 配置）
  const fired = def.fire ? executeFirePipeline(w, p, def, lv, baseDmg) : false;

  if (fired) {
    // 二重射击
    if (p.effects.duoShoot && RNG() < p.effects.duoShoot) {
      const t = nearestEnemy(p.x, p.y, 420);
      if (t) {
        const a = angTo(p, t);
        for (let i = -1; i <= 1; i += 2) {
          const ang = a + i * 0.5;
          world.add('projectiles', { x: p.x, y: p.y, vx: Math.cos(ang) * 330, vy: Math.sin(ang) * 330,
            r: 5, dmg: p.effAtk * 0.6, pierce: p.pierce, color: '#ffe9a8', hit: new Set(), wId: 'duo', life: 2 });
        }
        spawnGlow(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, 8, '#ffe9a8', 0.25);
      }
    }
    // 连锁闪电（道具触发）
    if (p.chainLightning > 0 && RNG() < p.chainLightning) {
      const cl = nearestEnemy(p.x, p.y, 360);
      if (cl) chainLightning(p, cl, p.effAtk * 0.8, 3, 0.7, 300, PALETTE.violet, w.id);
    }
    // 回声
    if (p.echo > 0 && RNG() < p.echo) {
      addFx({ echo: true, x: p.x, y: p.y, t: 0 });
      weaponFire(w);
    }
    return cd;
  }
  return cd * 0.6;
}

/* ---------- 投射物调度 ---------- */
export function projTick(pr: Projectile, dt: number): void {
  const p = pSt().player;
  if (!p) return;
  pr.hit = pr.hit || new Set();
  // 统一使用管线
  executeProjPipeline(pr, dt, p);
}
