/* =========================================================
   蚀月远征 · 武器：投射物运动模块
   可组合的投射物运动行为，供 PROJ_TICK 使用
   ========================================================= */
import { PALETTE } from '../../assets/palette.js';
import { RNG, dist, angTo, TAU } from '../../engine/util/utils.js';
import { rSt, pSt, eSt } from '../../state/accessors.js';
import { PROJECTILE_POOL } from '../../engine/ecs/entity_pool.js';
import { spawnBurst, spawnShard, spawnSpark, spawnRing, spawnGlow } from '../../platform/fx/fx.js';
import { damageEnemy, hurtPlayer } from '../combat.js';
import { queryRadius } from '../../engine/spatial/SpatialSystem.js';
import type { Player, Projectile, EnemyInstance } from '../../types/core.d.ts';

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

  /** 追踪运动（平滑转向 + 速度上限：可被走位甩开，保留策略性） */
  homing(pr, dt, _p) {
    if (pr.accel) pr.speed = Math.min(pr.speedMax ?? 999, (pr.speed || 0) + pr.accel * dt);
    // 追踪时限：锁定一段时间后失去目标（变直线，玩家可拖过）
    if (pr.lockT !== undefined) {
      pr.lockT -= dt;
      if (pr.lockT <= 0) pr.target = undefined;
    }
    if (pr.target && !pr.target.dead) {
      const want = Math.atan2(pr.target.y - pr.y, pr.target.x - pr.x);
      const cur = Math.atan2(pr.vy || 0, pr.vx || 0);
      // 平滑转向：受 turnRate 限制（rad/s），急转弯可甩开
      let diff = want - cur;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      const maxTurn = (pr.turnRate ?? 999) * dt;
      const na = cur + Math.max(-maxTurn, Math.min(maxTurn, diff));
      pr.vx = Math.cos(na) * pr.speed;
      pr.vy = Math.sin(na) * pr.speed;
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

  /* =========================================================
     敌方异型弹行为（v0.6 完整实装）
     ========================================================= */

  /** 潮噬之母 · 卵囊弹：直线飞行 splitAt 秒后破裂成 3 只三角幼体 */
  enemyEgg(pr, dt, _p) {
    pr.t = (pr.t || 0) + dt;
    pr.x += (pr.vx || 0) * dt;
    pr.y += (pr.vy || 0) * dt;
    pr.life = (pr.life || 2.6) - dt;
    if (pr.t >= (pr.splitAt || 1.1)) {
      for (const s of eggSplitBurst(pr)) {
        eSt().projectiles.push(PROJECTILE_POOL.addWith(s));
      }
      pr.dead = 1;
      return false;
    }
    if (pr.life <= 0 || pr.x < -50 || pr.x > rSt().width + 50 || pr.y < -50 || pr.y > rSt().height + 50) {
      pr.dead = 1;
      return false;
    }
    return true;
  },

  /** 月影巫王 · 符箓弹：蓄力 chargeT 秒后爆发加速（咒语引导完成） */
  enemyRune(pr, dt, _p) {
    pr.t = (pr.t || 0) + dt;
    // 蓄力进度交给渲染层（发亮）
    pr.charge = Math.min(1, pr.t / (pr.chargeT || 0.9));
    if (pr.t >= (pr.chargeT || 0.9)) {
      // 引导完成：线性加速（保持方向，300px/s²）。
      // 修复前用乘性 (1+2.4dt) 逐帧缩放 → 指数爆炸（≈e^2.4t，
      // 2 秒内 ~120 倍），符箓弹近乎瞬移且随帧率漂移。
      const spd = Math.hypot(pr.vx || 0, pr.vy || 0);
      if (spd > 0) {
        const ns = spd + 300 * dt;
        pr.vx = (pr.vx / spd) * ns;
        pr.vy = (pr.vy / spd) * ns;
      }
    }
    pr.x += (pr.vx || 0) * dt;
    pr.y += (pr.vy || 0) * dt;
    pr.life = (pr.life || 3.2) - dt;
    if (pr.life <= 0 || pr.x < -50 || pr.x > rSt().width + 50 || pr.y < -50 || pr.y > rSt().height + 50) {
      pr.dead = 1;
      return false;
    }
    return true;
  },

  /** 蚀潮巨兽 · 浪花弹：速度随潮汐呼吸波动（涨潮快 / 退潮滞涩） */
  enemyWave(pr, dt, _p) {
    pr.t = (pr.t || 0) + dt;
    const base = pr.baseSpeed || 200;
    const f = 1 + 0.45 * Math.sin(pr.t * 2.4 + (pr.phase || 0));
    const ang = Math.atan2(pr.vy || 0, pr.vx || 0);
    pr.vx = Math.cos(ang) * base * f;
    pr.vy = Math.sin(ang) * base * f;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life = (pr.life || 3) - dt;
    if (pr.life <= 0 || pr.x < -50 || pr.x > rSt().width + 50 || pr.y < -50 || pr.y > rSt().height + 50) {
      pr.dead = 1;
      return false;
    }
    return true;
  },
};

/**
 * 卵囊破裂：生成 3 只三角幼体（扇形散射，纯函数便于测试）
 * @returns 幼体投射物参数数组
 */
export function eggSplitBurst(pr: Projectile): Array<Record<string, unknown>> {
  const ang = Math.atan2(pr.vy || 0, pr.vx || 0);
  const out: Array<Record<string, unknown>> = [];
  for (let i = -1; i <= 1; i++) {
    const a = ang + i * 0.5;
    out.push({
      enemy: true, x: pr.x, y: pr.y,
      vx: Math.cos(a) * 200, vy: Math.sin(a) * 200,
      r: 5, dmg: (pr.dmg || 1) * 0.7, color: pr.color || PALETTE.teal,
      hit: new Set(), life: 1.8, wId: 'enemy_tri',
    });
  }
  return out;
}

/* =========================================================
   蚀痕喷发：地面延迟圈到期时的爆裂
   敌我分派：敌方落点（enemy: true，蚀痕/落雷/战车蚀痕）对玩家造成范围伤害，
   玩家落点（无 enemy）才打敌人。修复前这里无条件 damageEnemy ——
   敌方封锁技能全部打在小怪身上，对玩家的走位封锁完全失效。
   ========================================================= */
function explodeGround(pr: Projectile): void {
  const x = pr.x, y = pr.y, r = pr.r || 60;
  // 蚀焰喷发：火柱碎片 + 双冲击环 + 白炽火花 + 光晕
  spawnBurst(x, y, pr.color || PALETTE.coral, 14);
  spawnShard(x, y, PALETTE.heavy, 6, 220);
  spawnSpark(x, y, PALETTE.peach, 9, 210);
  spawnRing(x, y, pr.color || PALETTE.coral, 0.36, r * 1.35, 3);
  spawnRing(x, y, PALETTE.cream, 0.22, r * 0.85, 1.8);
  spawnGlow(x, y, 20, pr.color || PALETTE.coral, 0.35);
  const dmg = pr.dmg || 1;
  if (pr.enemy) {
    // 敌方落点：对玩家造成范围伤害（封锁走位的真实目的）
    const p = pSt().player;
    if (p && dist({ x, y }, p) < r + p.r) {
      hurtPlayer({ x, y, dmg }, dmg);
    }
  } else {
    // 玩家落点：对范围内敌人造成伤害
    for (const e of (queryRadius(x, y, r) as EnemyInstance[])) {
      if (e.dead) continue;
      damageEnemy(e, dmg, RNG() < (pSt().player?.effCrit ?? 0.1), 'ground', pr.wId);
    }
  }
}
