/* =========================================================
   蚀月远征 · 武器：可组合行为管线执行器
   将武器定义中的 fire/projectile 配置翻译为实际行为
   ========================================================= */
import { G } from '../state.js';
import { RNG, dist } from '../utils.js';
import { PALETTE } from '../data/palette.js';
import { TARGETING } from './targeting.js';
import { PATTERNS } from './patterns.js';
import { MOVEMENT } from './movement.js';
import { HIT_DETECTION } from './hit_detection.js';
import { ON_HIT } from './on_hit.js';
import { PROJECTILE_TYPES, resolveProjectileType } from './projectile_types.js';
import { addFx, spawnBurst, spawnSpark, spawnGlow, spawnRing, spawnStar, spawnShard, spawnStreak } from '../render/effects/fx.js';
import { shakeScreen } from '../state.js';
import { queryRadius } from '../systems/SpatialSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { AudioEngine } from '../audio/engine.js';

/* =========================================================
   1. 开火管线：将武器定义翻译为投射物
   ========================================================= */

/**
 * 执行武器开火管线
 * @param w 武器实例 {id, lv}
 * @param p 玩家
 * @param def 武器定义（来自 WEAPONS）
 * @param lv 武器等级
 * @param baseDmg 基础伤害
 * @returns 是否成功开火
 */
export function executeFirePipeline(w: any, p: any, def: any, lv: number, baseDmg: number): boolean {
  const fireCfg = def.fire;
  if (!fireCfg) return false;

  // 1. 瞄准阶段
  const targetingName = fireCfg.targeting || 'nearest';
  const targetFn = TARGETING[targetingName];
  if (!targetFn) return false;
  const target = targetFn(p, { ...def, ...fireCfg });
  if (!target && targetingName !== 'self' && targetingName !== 'facing' && targetingName !== 'random') return false;

  // 2. 发射模式阶段
  const patternName = fireCfg.pattern || 'single';
  const patternFn = PATTERNS[patternName];
  if (!patternFn) return false;
  const result = patternFn(p, target || { target: null, x: p.x, y: p.y }, fireCfg, baseDmg, w.id);

  if (result && result.length > 0) {
    // 3. 开火特效
    spawnFireEffects(p, def, w.id);
    return true;
  }
  return false;
}

/* 开火特效 */
function spawnFireEffects(p: any, def: any, wId: string): void {
  AudioEngine.playSfx('w_' + wId);
  const mang = p.facing;
  const mx = p.x + Math.cos(mang) * 26, my = p.y + Math.sin(mang) * 26;
  spawnSpark(mx, my, def.color, 3, 110);
  spawnGlow(mx, my, 9, def.color, 0.28);
  if (wId === 'nova') {
    spawnRing(p.x, p.y, def.color, 0.45, 64, 3);
    spawnSpark(p.x, p.y, PALETTE.fireBright, 6, 200);
    spawnGlow(p.x, p.y, 18, PALETTE.fireBright, 0.4);
  }
  if (wId === 'meteor') spawnRing(p.x, p.y, PALETTE.fire, 0.35, 40, 2.5);
  if (wId === 'arc') spawnGlow(mx, my, 13, PALETTE.violet, 0.3);
}

/* =========================================================
   2. 投射物 tick 管线：每帧更新投射物
   ========================================================= */

/**
 * 执行投射物 tick 管线
 * @param pr 投射物
 * @param dt 帧时间
 * @param p 玩家
 */
export function executeProjPipeline(pr: any, dt: number, p: any): void {
  pr.hit = pr.hit || new Set();

  // 特殊投射物：陨石（独立处理，因逻辑复杂）
  if (pr.meteor) {
    tickMeteor(pr, dt, p);
    return;
  }

  // 1. 运动阶段
  const moveType = getMoveType(pr);
  const moveFn = MOVEMENT[moveType];
  if (moveFn) {
    const alive = moveFn(pr, dt, p);
    if (!alive) return;
  }

  // 2. 碰撞检测阶段
  const hitType = getHitType(pr);
  const hitFn = HIT_DETECTION[hitType];
  if (hitFn) {
    const hits = hitFn(pr, dt, p);

    // 3. 命中效果阶段
    for (const hit of hits) {
      const onHitFns = getOnHitEffects(pr);
      for (const fn of onHitFns) {
        fn({ target: hit.target, isPlayer: hit.isPlayer, pr, p });
      }

      // 穿透处理
      if (!hit.isPlayer) {
        applyPierce(pr, p);
        if (pr.dead) break;
      }
    }
  }

  // 4. 尾迹特效
  spawnTrailFx(pr, dt, moveType);
}

/* 确定投射物类型配置（从注册表获取） */
function getTypeConfig(pr: any): any {
  const typeName = resolveProjectileType(pr);
  return PROJECTILE_TYPES[typeName] || PROJECTILE_TYPES.linear;
}

/* 确定运动类型 */
function getMoveType(pr: any): string {
  return getTypeConfig(pr).movement;
}

/* 确定碰撞检测类型 */
function getHitType(pr: any): string {
  return getTypeConfig(pr).hit;
}

/* 确定命中效果列表 */
function getOnHitEffects(pr: any): ((args: any) => boolean)[] {
  const cfg = getTypeConfig(pr);
  return cfg.onHit.map((name: string) => ON_HIT[name]).filter(Boolean);
}

/* 穿透处理 */
function applyPierce(pr: any, _p: any): void {
  if (pr.pierce !== Infinity) {
    pr.pierce--;
    if (pr.pierce < 0) pr.dead = true;
  }
}

/* 尾迹特效 */
function spawnTrailFx(pr: any, dt: number, moveType: string): void {
  if (pr.dead) return;
  if (moveType === 'linear' && RNG() < 0.32) {
    if (pr.wId === 'crossbow' || pr.wId === 'nova' || pr.wId === 'lance') {
      spawnStreak(pr.x, pr.y, Math.atan2(pr.vy || 0, pr.vx || 0), pr.r * 5, pr.r * 0.5, pr.color, 0.22);
    } else {
      addFx({ x: pr.x, y: pr.y, vx: -pr.vx * 0.12, vy: -pr.vy * 0.12, life: 0.24, max: 0.24, size: pr.r * 0.55, color: pr.color });
    }
  }
  if (moveType === 'homing' && RNG() < 0.4) {
    if (pr.wId === 'shadow') {
      addFx({ x: pr.x, y: pr.y, vx: -pr.vx * 0.08, vy: -pr.vy * 0.08, life: 0.35, max: 0.35, size: pr.r * 0.95, color: RNG() < 0.4 ? PALETTE.violetDark : pr.color });
    } else {
      addFx({ x: pr.x, y: pr.y, vx: -pr.vx * 0.1, vy: -pr.vy * 0.1, life: 0.3, max: 0.3, size: pr.r * 0.8, color: pr.color });
    }
  }
  if (moveType === 'boomerang' && RNG() < 0.5) {
    addFx({ x: pr.x, y: pr.y, vx: -Math.cos(pr.dir) * 50, vy: -Math.sin(pr.dir) * 50, life: 0.28, max: 0.28, size: RNG() < 0.4 ? 2.4 : 3.4, color: RNG() < 0.35 ? '#fff7dd' : pr.color });
  }
}

/* =========================================================
   3. 特殊投射物处理（陨石 — 逻辑复杂，单独处理）
   ========================================================= */
function tickMeteor(pr: any, dt: number, p: any): void {
  pr.t = (pr.t || 0) + dt;
  if (RNG() < 0.6) {
    addFx({ x: pr.x, y: pr.y, vx: (RNG() - 0.5) * 40, vy: (RNG() * 60 + 30), life: 0.4, max: 0.4, size: RNG() < 0.5 ? 2 : 4, color: RNG() < 0.5 ? PALETTE.fire : PALETTE.ember });
  }
  if (pr.t >= (pr.delay || 0.55)) {
    spawnBurst(pr.x, pr.y, PALETTE.hot, 22);
    spawnShard(pr.x, pr.y, PALETTE.fire, 8, 260);
    spawnSpark(pr.x, pr.y, PALETTE.goldBright, 10, 280);
    spawnRing(pr.x, pr.y, PALETTE.fire, 0.5, 130, 4.5);
    spawnRing(pr.x, pr.y, PALETTE.ember, 0.7, 215, 2);
    spawnStar(pr.x, pr.y, PALETTE.goldBright, 24);
    spawnGlow(pr.x, pr.y, 30, PALETTE.hot, 0.5);
    shakeScreen(9);
    for (const e of queryRadius(pr.x, pr.y, pr.aoe || 130)) {
      if (e.dead) continue;
      CombatSystem.damageEnemy(e, pr.dmg * (1.4 - dist(e, pr) / (pr.aoe || 130)), RNG() < p.effCrit, 'meteor', pr.wId);
    }
    pr.dead = true;
  }
}
