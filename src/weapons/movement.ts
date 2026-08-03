/* =========================================================
   蚀月远征 · 武器：投射物运动模块
   可组合的投射物运动行为，供 PROJ_TICK 使用
   ========================================================= */
import { RNG, dist, angTo } from '../utils.js';
import { rSt } from '../state/accessors.js';
import type { Player, Projectile } from '../types/core.d.ts';

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

  /** 地面延迟（地刺/陷阱） */
  ground(pr, dt, _p) {
    pr.t = (pr.t || 0) + dt;
    return true;
  },

  /** 呼吸（喷吐） */
  breath(pr, dt, _p) {
    pr.t = (pr.t || 0) + dt;
    if (pr.t > (pr.dur || 0.6)) { pr.dead = 1; return false; }
    return true;
  },
};
