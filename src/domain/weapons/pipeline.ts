/* =========================================================
   蚀月远征 · 武器：可组合行为管线执行器
   将武器定义中的 fire/projectile 配置翻译为实际行为
   ========================================================= */
import { PALETTE } from '../../assets/palette.js';
import { RNG, dist } from '../../engine/util/utils.js';
import { TARGETING } from './targeting.js';
import { PATTERNS } from './patterns.js';
import { MOVEMENT } from './movement.js';
import { HIT_DETECTION, type HitResult } from './hit_detection.js';
import { ON_HIT, type OnHitArgs } from './on_hit.js';
import { PROJECTILE_TYPES, resolveProjectileType } from './projectile_types.js';
import { addFx, spawnBurst, spawnSpark, spawnGlow, spawnRing, spawnStar, spawnShard, spawnStreak } from '../../platform/fx/fx.js';
import { shakeScreen } from '../../state/render.js';
import { queryRadius } from '../../engine/spatial/SpatialSystem.js';
import { damageEnemy } from '../combat.js';
import { AudioEngine } from '../../platform/audio/engine.js';
import type { Player, Projectile } from '../../types/core.d.ts';
import type { WeaponInstance, WeaponDef } from '../../types/core.d.ts';

/* ---------- 尾迹密度控制 ---------- */
let _projCount = 0;
/** 设置当前活跃投射物数量（由 ProjectileSystem 每帧开始时调用） */
export function setProjCount(n: number): void { _projCount = n; }
/** 根据投射物数量计算尾迹生成概率缩放系数 */
function trailDensityScale(): number {
  return _projCount > 80 ? 0.25 : _projCount > 50 ? 0.5 : _projCount > 20 ? 0.75 : 1.0;
}

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
export function executeFirePipeline(w: WeaponInstance, p: Player, def: WeaponDef, lv: number, baseDmg: number): boolean {
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
  const result = patternFn(p, target || { target: null, x: p.x, y: p.y }, { ...fireCfg, lv }, baseDmg, w.id);

  if (result && result.length > 0) {
    // 3. 开火特效
    spawnFireEffects(p, def, w.id);
    return true;
  }
  return false;
}

/* 开火特效 */
function spawnFireEffects(p: Player, def: WeaponDef, wId: string): void {
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
  if (wId === 'tideAnchor') {
    // 蚀潮之锚开火：玩家身前涌起潮环与飞溅水光
    spawnRing(p.x, p.y, PALETTE.tide, 0.4, 46, 3);
    spawnSpark(p.x, p.y, PALETTE.iceLight, 5, 170);
    spawnGlow(p.x, p.y, 16, '#2c5d68', 0.35);
  }
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
export function executeProjPipeline(pr: Projectile, dt: number, p: Player): void {
  pr.hit = pr.hit || new Set();

  // 特殊投射物：陨石 / 蚀潮 / 辉光审判（共用延迟 AOE 执行体）
  if (pr.meteor) {
    tickAoeDelay(pr, dt, p, METEOR_BURST);
    return;
  }
  if (pr.tide) {
    tickAoeDelay(pr, dt, p, TIDE_BURST);
    return;
  }
  if (pr.judge) {
    tickAoeDelay(pr, dt, p, JUDGE_BURST);
    return;
  }

  // 缓存投射物类型函数引用（首次运行时初始化，消除每帧类型解析开销）
  const meta = pr._meta!;
  if (!meta._cached) {
    const typeName = resolveProjectileType(pr);
    const typeDef = PROJECTILE_TYPES[typeName] || PROJECTILE_TYPES.linear;
    meta._moveType = typeDef.movement;
    meta._moveFn = MOVEMENT[typeDef.movement];
    meta._hitFn = HIT_DETECTION[typeDef.hit];
    meta._onHitFns = typeDef.onHit.map(name => ON_HIT[name]).filter(Boolean);
    meta._cached = true;
  }

  // 1. 运动阶段（缓存函数引用）
  const moveFn = meta._moveFn as (pr: Projectile, dt: number, p: Player) => boolean;
  if (moveFn) {
    if (!moveFn(pr, dt, p)) return;
  }

  // 2. 碰撞检测阶段（缓存函数引用）
  const hitFn = meta._hitFn as (pr: Projectile, dt: number, p: Player) => HitResult[];
  if (hitFn) {
    const hits = hitFn(pr, dt, p);

    // 3. 命中效果阶段（缓存函数列表）
    const onHitFns = meta._onHitFns as ((args: OnHitArgs) => boolean)[];
    for (const hit of hits) {
      if (onHitFns) {
        for (const fn of onHitFns) {
          fn({ target: hit.target, isPlayer: hit.isPlayer, pr, p });
        }
      }

      // 穿透处理
      if (!hit.isPlayer) {
        applyPierce(pr, p);
        if (pr.dead) break;
      }
    }
  }

  // 4. 尾迹特效
  spawnTrailFx(pr, dt, meta._moveType as string);
}

/* 穿透处理 */
function applyPierce(pr: Projectile, _p: Player): void {
  if (pr.pierce !== Infinity) {
    pr.pierce--;
    if (pr.pierce < 0) pr.dead = 1;
  }
}

/* 尾迹特效（含密度控制：投射物多时自动降低尾迹概率，避免粒子爆炸） */
function spawnTrailFx(pr: Projectile, dt: number, moveType: string): void {
  if (pr.dead) return;
  const scale = trailDensityScale();
  if (moveType === 'linear' && RNG() < 0.32 * scale) {
    if (pr.wId === 'crossbow' || pr.wId === 'nova' || pr.wId === 'lance') {
      spawnStreak(pr.x, pr.y, Math.atan2(pr.vy || 0, pr.vx || 0), pr.r * 5, pr.r * 0.5, pr.color, 0.22);
    } else {
      addFx({ x: pr.x, y: pr.y, vx: -pr.vx * 0.12, vy: -pr.vy * 0.12, life: 0.24, max: 0.24, size: pr.r * 0.55, color: pr.color });
    }
  }
  if (moveType === 'homing' && RNG() < 0.4 * scale) {
    if (pr.wId === 'shadow') {
      // 影袭之刃：暗影残影拖尾（渐隐暗色虚影，亮暗交替增强「影」感）
      addFx({ x: pr.x, y: pr.y, vx: -pr.vx * 0.08, vy: -pr.vy * 0.08, life: 0.32, max: 0.32, size: pr.r * (0.85 + RNG() * 0.5), color: RNG() < 0.4 ? PALETTE.shadowDark : pr.color });
    } else {
      addFx({ x: pr.x, y: pr.y, vx: -pr.vx * 0.1, vy: -pr.vy * 0.1, life: 0.3, max: 0.3, size: pr.r * 0.8, color: pr.color });
    }
  }
  if (moveType === 'boomerang' && RNG() < 0.5 * scale) {
    addFx({ x: pr.x, y: pr.y, vx: -Math.cos(pr.dir) * 50, vy: -Math.sin(pr.dir) * 50, life: 0.28, max: 0.28, size: RNG() < 0.4 ? 2.4 : 3.4, color: RNG() < 0.35 ? '#fff7dd' : pr.color });
  }
}

/* =========================================================
   3. 特殊投射物处理（陨石 / 蚀潮 / 辉光审判 — 共用延迟 AOE 执行体）
   ========================================================= */

/** 延迟 AOE 爆炸特效配置（蚀潮 / 陨石 / 辉光审判共用执行体 tickAoeDelay） */
interface AoeBurstCfg {
  delay: number;                 // 触发延迟（秒）
  aoe: number;                   // 爆炸范围
  srcType: string;               // 伤害来源类型
  /** 坠落/蓄力粒子（undefined 则无） */
  fall?: {
    xJitter: number;             // x 随机偏移幅度
    yJitter: number;             // y 随机偏移幅度
    vx: number;                  // vx 随机幅度
    vyBase: number;              // vy = vyBase + RNG() * vyRange
    vyRange: number;
    life: number;
    sizeLo: number;              // size: RNG() < 0.5 ? sizeLo : sizeHi
    sizeHi: number;
    c1: string;                  // color: RNG() < 0.5 ? c1 : c2
    c2: string;
  };
  /** 升腾粒子（undefined 则无，蚀潮独有） */
  bubbles?: {
    xSpread: number;
    ySpread: number;
    vx: number;
    vy: number;                  // vy = -RNG() * vy - vyMin
    vyMin: number;
    life: number;
    size: number;                // size = size + RNG() * sizeRand
    sizeRand: number;
    c1: string;
    c2: string;
  };
  fx: {
    burst: { c: string; n: number };
    shard: { c: string; n: number; sp: number };
    spark: { c: string; n: number; sp: number };
    ring: { c: string; life: number; r: number; w: number };
    ring2: { c: string; life: number; r: number; w: number };
    star: { c: string; size: number };
    glow: { c: string; size: number; life: number };
  };
}

const AOE_CENTER_DMG = 1.4;      // 爆炸中心伤害倍率（随距离线性衰减至 0）
const FALL_PARTICLE_CHANCE = 0.6; // 每帧生成坠落粒子的概率

/* 蚀潮（青白水潮 · 水系） */
const TIDE_BURST: AoeBurstCfg = {
  delay: 0.5, aoe: 130, srcType: 'tide',
  fall: { xJitter: 0, yJitter: 0, vx: 40, vyBase: 30, vyRange: 60, life: 0.4, sizeLo: 2, sizeHi: 4, c1: PALETTE.iceLight, c2: PALETTE.tide },
  bubbles: { xSpread: 140, ySpread: 20, vx: 30, vy: 130, vyMin: 40, life: 0.8, size: 2, sizeRand: 3, c1: PALETTE.iceLight, c2: PALETTE.swift },
  fx: {
    burst: { c: PALETTE.iceLight, n: 20 }, shard: { c: PALETTE.ice, n: 8, sp: 260 },
    spark: { c: PALETTE.white, n: 10, sp: 280 }, ring: { c: PALETTE.tide, life: 0.5, r: 130, w: 4.5 },
    ring2: { c: PALETTE.iceLight, life: 0.7, r: 215, w: 2 }, star: { c: PALETTE.swift, size: 24 },
    glow: { c: '#2c5d68', size: 30, life: 0.5 },
  },
};

/* 陨石（焚天陨星 · 火系） */
const METEOR_BURST: AoeBurstCfg = {
  delay: 0.55, aoe: 130, srcType: 'meteor',
  fall: { xJitter: 0, yJitter: 0, vx: 40, vyBase: 30, vyRange: 60, life: 0.4, sizeLo: 2, sizeHi: 4, c1: PALETTE.fire, c2: PALETTE.ember },
  fx: {
    burst: { c: PALETTE.hot, n: 22 }, shard: { c: PALETTE.fire, n: 8, sp: 260 },
    spark: { c: PALETTE.goldBright, n: 10, sp: 280 }, ring: { c: PALETTE.fire, life: 0.5, r: 130, w: 4.5 },
    ring2: { c: PALETTE.ember, life: 0.7, r: 215, w: 2 }, star: { c: PALETTE.goldBright, size: 24 },
    glow: { c: PALETTE.hot, size: 30, life: 0.5 },
  },
};

/* 辉光审判：裁决辉光（金辉圣光 · 光系） */
const JUDGE_BURST: AoeBurstCfg = {
  delay: 0.5, aoe: 110, srcType: 'judge',
  fall: { xJitter: 40, yJitter: 20, vx: 30, vyBase: -30, vyRange: -70, life: 0.45, sizeLo: 2, sizeHi: 3.5, c1: PALETTE.goldBright, c2: PALETTE.goldPale },
  fx: {
    burst: { c: PALETTE.goldPale, n: 18 }, shard: { c: PALETTE.gold, n: 8, sp: 240 },
    spark: { c: PALETTE.goldBright, n: 12, sp: 300 }, ring: { c: PALETTE.goldBright, life: 0.5, r: 120, w: 4.5 },
    ring2: { c: PALETTE.goldPale, life: 0.7, r: 200, w: 2 }, star: { c: PALETTE.goldBright, size: 26 },
    glow: { c: PALETTE.goldBright, size: 34, life: 0.55 },
  },
};

/** 延迟 AOE 爆炸执行体：坠落粒子 → 爆发 FX → 范围伤害（蚀潮 / 陨石 / 辉光审判共用） */
function tickAoeDelay(pr: Projectile, dt: number, p: Player, cfg: AoeBurstCfg): void {
  pr.t = (pr.t || 0) + dt;
  const f = cfg.fall;
  if (f && RNG() < FALL_PARTICLE_CHANCE) {
    addFx({
      x: pr.x + (RNG() - 0.5) * f.xJitter, y: pr.y + (RNG() - 0.5) * f.yJitter,
      vx: (RNG() - 0.5) * f.vx, vy: f.vyBase + RNG() * f.vyRange,
      life: f.life, max: f.life, size: RNG() < 0.5 ? f.sizeLo : f.sizeHi,
      color: RNG() < 0.5 ? f.c1 : f.c2,
    });
  }
  if (pr.t >= (pr.delay || cfg.delay)) {
    const fx = cfg.fx;
    spawnBurst(pr.x, pr.y, fx.burst.c, fx.burst.n);
    spawnShard(pr.x, pr.y, fx.shard.c, fx.shard.n, fx.shard.sp);
    spawnSpark(pr.x, pr.y, fx.spark.c, fx.spark.n, fx.spark.sp);
    spawnRing(pr.x, pr.y, fx.ring.c, fx.ring.life, fx.ring.r, fx.ring.w);
    spawnRing(pr.x, pr.y, fx.ring2.c, fx.ring2.life, fx.ring2.r, fx.ring2.w);
    spawnStar(pr.x, pr.y, fx.star.c, fx.star.size);
    spawnGlow(pr.x, pr.y, fx.glow.size, fx.glow.c, fx.glow.life);
    const b = cfg.bubbles;
    if (b) {
      // 升腾粒子（蚀潮：潮压把水泡顶向高空）
      for (let i = 0; i < 6; i++) {
        addFx({
          x: pr.x + (RNG() - 0.5) * b.xSpread, y: pr.y + (RNG() - 0.5) * b.ySpread,
          vx: (RNG() - 0.5) * b.vx, vy: -RNG() * b.vy - b.vyMin,
          life: b.life, max: b.life, size: b.size + RNG() * b.sizeRand,
          color: RNG() < 0.5 ? b.c1 : b.c2,
        });
      }
    }
    shakeScreen(9);
    const aoe = pr.aoe || cfg.aoe;
    for (const e of queryRadius(pr.x, pr.y, aoe)) {
      if (e.dead) continue;
      damageEnemy(e, pr.dmg * (AOE_CENTER_DMG - dist(e, pr) / aoe), RNG() < p.effCrit, cfg.srcType, pr.wId);
    }
    pr.dead = 1;
  }
}
