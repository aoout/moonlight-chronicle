/* =========================================================
   蚀月远征 · 武器：投射物运动模块
   可组合的投射物运动行为，供 PROJ_TICK 使用
   ========================================================= */
import { RNG, dist, angTo } from '../utils.js';
import { rSt, pSt } from '../state/accessors.js';
import { spawnBurst, spawnShard, spawnSpark, spawnRing, spawnGlow } from '../render/effects/fx.js';
import { damageEnemy } from '../domain/combat.js';
import { queryRadius } from '../systems/SpatialSystem.js';
import type { Player, Projectile, EnemyInstance } from '../types/core.d.ts';

/**
 * 投射物运动注册表
 * 每个运动接收 (pr, dt, p) → 更新 pr 的位置/状态
 * 返回 true 表示投射物仍然存活，false 表示应标记为 dead
 */
export const MOVEMENT: Record<string, (pr: Projectile, dt: number, p: Player) => boolean> = {

  /** 直线运动 */
  linear(pr, dt, _p) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life = (pr.life || 2.5) - dt;
    if (pr.life <= 0 ||
        pr.x < -50 || pr.x > rSt().width + 50 ||
        pr.y < -50 || pr.y > rSt().height + 50) {
      pr.dead = 1;
      return false;
    }
    return true;
  },

  /** 追踪运动 */
  homing(pr, dt, _p) {
    if (pr.target && !pr.target.dead) {
      const a = angTo(pr, pr.target);
      pr.vx = Math.cos(a) * pr.speed;
      pr.vy = Math.sin(a) * pr.speed;
    }
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.t = (pr.t || 0) + dt;
    if (pr.t > (pr.life || 1.6)) {
      pr.dead = 1;
      return false;
    }
    return true;
  },

  /** 回旋镖运动 */
  boomerang(pr, dt, p) {
    pr.t = (pr.t || 0) + dt;
    pr.spin = (pr.spin || 0) + dt * 12;
    const tx = pr.x + Math.cos(pr.dir) * pr.speed * dt;
    const ty = pr.y + Math.sin(pr.dir) * pr.speed * dt;
    pr.x = tx; pr.y = ty;
    if (!pr.ret && pr.t * pr.speed >= (pr.range || 420) * 0.6) pr.ret = 1;
    if (pr.ret) {
      const a = Math.atan2(p.y - pr.y, p.x - pr.x);
      pr.dir = a;
      pr.x += Math.cos(a) * pr.speed * dt;
      pr.y += Math.sin(a) * pr.speed * dt;
      if (dist(pr, p) < 26) { pr.dead = 1; return false; }
    }
    return true;
  },

  /** 静止（aoe/光束） */
  stationary(pr, dt, _p) {
    pr.t = (pr.t || 0) + dt;
    // 光束：持续时间结束后销毁
    if (pr.beam && pr.t >= (pr.dur || 0.3)) {
      pr.dead = 1;
      return false;
    }
    return true;
  },

  /** 陨石（延迟下落） */
  meteor(pr, dt, _p) {
    pr.t = (pr.t || 0) + dt;
    return true;
  },

  /** 敌人酸液弹 */
  acid(pr, dt, _p) {
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life = (pr.life || 2) - dt;
    if (pr.life <= 0 ||
        pr.x < -40 || pr.x > rSt().width + 40 ||
        pr.y < -40 || pr.y > rSt().height + 40) {
      pr.dead = 1;
      return false;
    }
    return true;
  },

  /** 地面延迟（蚀痕/陷阱）：到期喷发 */
  ground(pr, dt, _p) {
    pr.t = (pr.t || 0) + dt;
    if (pr.t >= (pr.delay || 0.8)) {
      explodeGround(pr);
      pr.dead = 1;
      return false;
    }
    return true;
  },

  /** 呼吸（喷吐） */
  breath(pr, dt, _p) {
    pr.t = (pr.t || 0) + dt;
    if (pr.t > (pr.dur || 0.6)) { pr.dead = 1; return false; }
    return true;
  },
};

/* =========================================================
   蚀痕喷发：地面延迟圈到期时的爆裂
   ========================================================= */
function explodeGround(pr: Projectile): void {
  const x = pr.x, y = pr.y, r = pr.r || 60;
  // 蚀焰喷发：火柱碎片 + 双冲击环 + 白炽火花 + 光晕
  spawnBurst(x, y, pr.color || '#ff7a7a', 14);
  spawnShard(x, y, '#ff9d6b', 6, 220);
  spawnSpark(x, y, '#ffd9a8', 9, 210);
  spawnRing(x, y, pr.color || '#ff7a7a', 0.36, r * 1.35, 3);
  spawnRing(x, y, '#fff2cc', 0.22, r * 0.85, 1.8);
  spawnGlow(x, y, 20, pr.color || '#ff7a7a', 0.35);
  // 范围内伤害
  const p = pSt().player;
  for (const e of (queryRadius(x, y, r) as EnemyInstance[])) {
    if (e.dead) continue;
    damageEnemy(e, pr.dmg || 1, RNG() < (p?.effCrit ?? 0.1), 'ground', pr.wId);
  }
}
