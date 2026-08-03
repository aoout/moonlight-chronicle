/* =========================================================
   蚀月远征 · 武器：碰撞检测模块
   可组合的碰撞检测行为，供 PROJ_TICK 使用
   ========================================================= */
import { dist } from '../utils.js';
import { neighborEnemies, queryRadius } from '../systems/SpatialSystem.js';
import { pSt } from '../state/accessors.js';
import type { Player, Projectile, EnemyInstance } from '../types/core.d.ts';

export interface HitResult {
  target: EnemyInstance | Player;
  isPlayer: boolean;
}

/**
 * 碰撞检测注册表
 * 每个检测器接收 (pr, dt, p) → 找到命中的敌人/玩家，执行伤害
 * 返回命中的敌人数组（或空数组）
 */
export const HIT_DETECTION: Record<string, (pr: Projectile, dt: number, p: Player) => HitResult[]> = {

  /** 点碰撞（投射物圆心检测） */
  point(pr, dt, _p) {
    if (pr.enemy) {
      // 敌人投射物：检测玩家
      const p = pSt().player;
      if (!p) return [];
      if (dist(pr, p) < pr.r + p.r - 2) return [{ target: p, isPlayer: true }];
      return [];
    }
    // 玩家投射物：检测敌人
    const candidates = neighborEnemies(pr.x, pr.y, pr.r + 60);
    const hits = [];
    for (const e of candidates) {
      if (e.dead || pr.hit!.has(e)) continue;
      if (dist(pr, e) < pr.r + e.size * 0.75) {
        hits.push({ target: e, isPlayer: false });
        pr.hit!.add(e);
      }
    }
    return hits;
  },

  /** 半径碰撞（AOE 范围） */
  radius(pr, dt, _p) {
    const hits = [];
    const candidates = neighborEnemies(pr.x, pr.y, pr.maxR || pr.r);
    for (const e of candidates) {
      if (e.dead || pr.hit!.has(e)) continue;
      if (dist(e, pr) < (pr.r || pr.maxR || 200)) {
        hits.push({ target: e, isPlayer: false });
        pr.hit!.add(e);
      }
    }
    return hits;
  },

  /** 光束碰撞（含吐息玩家检测） */
  beam(pr, dt, _p) {
    const hits = [];
    const dx = Math.cos(pr.dir), dy = Math.sin(pr.dir);
    // 吐息投射物不检测敌人（由 breath 段专门检测玩家）
    if (!pr.breath) {
      const candidates = neighborEnemies(pr.x, pr.y, pr.range || 500);
      for (const e of candidates) {
        if (e.dead || pr.hit!.has(e)) continue;
        const proj = (e.x - pr.x) * dx + (e.y - pr.y) * dy;
        if (proj > 0 && proj < (pr.range || 500)) {
          const perp = Math.abs((e.x - pr.x) * (-dy) + (e.y - pr.y) * dx);
          if (perp < (pr.width || 14) + e.size * 0.7) {
            hits.push({ target: e, isPlayer: false });
            pr.hit!.add(e);
          }
        }
      }
    }
    // 呼吸：检测玩家（计入玩家半径，与敌人检测一致）
    if (pr.breath) {
      const p = pSt().player;
      if (!p) return hits;
      const proj = (p.x - pr.x) * dx + (p.y - pr.y) * dy;
      if (proj > 0 && proj < (pr.range || 500)) {
        const perp = Math.abs((p.x - pr.x) * (-dy) + (p.y - pr.y) * dx);
        if (perp < (pr.width || 14) + p.r * 0.7 && !pr.hitPlayer) {
          hits.push({ target: p, isPlayer: true });
          pr.hitPlayer = 1;
        }
      }
    }
    return hits;
  },

  /** AOE 范围（持续扩展，如霜环） */
  aoe(pr, dt, _p) {
    const hits = [];
    const p = pSt().player;
    if (!p) return [];
    // 更新半径
    pr.r = Math.min(pr.maxR, (pr.r || 0) + (pr.maxR || 200) * dt * (pr.enemy ? 1.7 : 2.4 / (p.duration || 1)));
    const candidates = neighborEnemies(pr.x, pr.y, pr.maxR || 200);
    for (const e of candidates) {
      if (e.dead || pr.hit!.has(e)) continue;
      if (dist(e, pr) < pr.r) {
        hits.push({ target: e, isPlayer: false });
        pr.hit!.add(e);
      }
    }
    // 玩家检测（敌人 AOE）
    if (pr.enemy) {
      if (dist(p, pr) < pr.r) {
        hits.push({ target: p, isPlayer: true });
      }
    }
    // 半径扩展到 maxR 后清除投射物，防止特效永不消失
    if (pr.r >= (pr.maxR || 0)) {
      pr.dead = 1;
    }
    return hits;
  },
};
