/* =========================================================
   蚀月远征 · 武器：瞄准策略模块
   可组合的瞄准行为，供武器管线使用
   ========================================================= */
import { nearestInGrid, neighborEnemies, queryRadius } from '../../engine/spatial/SpatialSystem.js';
import type { Player } from '../../types/core.d.ts';
import type { WeaponFireConfig } from '../../types/core.d.ts';
import type { TargetingResult } from './projectile_types.js';

/**
 * 瞄准策略注册表
 * 每个策略接收 (p: 玩家, cfg: 武器配置) → TargetingResult | null
 * - target: 目标敌人对象（如有）
 * - x, y: 瞄准位置
 */
export const TARGETING: Record<string, (p: Player, cfg: WeaponFireConfig) => TargetingResult | null> = {

  /** 最近敌人 */
  nearest(p, cfg) {
    const t = nearestInGrid(p.x, p.y, cfg.range || 500);
    if (!t) return null;
    return { target: t, x: t.x, y: t.y };
  },

  /** 密集区域（陨石/范围攻击） */
  denseArea(p, cfg) {
    let best = null, bestScore = 0;
    const r = 160;
    const candidates = neighborEnemies(p.x, p.y, cfg.range || 500);
    for (const e of candidates) {
      if (e.dead) continue;
      let score = 0;
      const cluster = queryRadius(e.x, e.y, r);
      for (const o of cluster) {
        if (o === e) continue;
        const d = Math.hypot(e.x - o.x, e.y - o.y);
        score += 1.4 - d / r;
      }
      if (score > bestScore) { bestScore = score; best = e; }
    }
    if (bestScore < 1 || !best) return null;
    return { target: best, x: best.x, y: best.y };
  },

  /** 随机方向 */
  random(p, cfg) {
    const a = Math.random() * 6.28;
    const r = cfg.range || 300;
    return { target: null, x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r };
  },

  /** 无目标（使用玩家朝向） */
  facing(p, cfg) {
    const r = cfg.range || 300;
    return {
      target: null,
      x: p.x + Math.cos(p.facing) * r,
      y: p.y + Math.sin(p.facing) * r,
    };
  },

  /** 固定位置（玩家周围） */
  self(p, _cfg) {
    return { target: null, x: p.x, y: p.y };
  },
};
