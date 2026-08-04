/* =========================================================
   蚀月远征 · 武器：投射物类型注册表
   每种投射物类型定义其行为管线配置
   替代 createProjectile 中的条件展开和 pipeline.js 中的 if-else 链
   ========================================================= */

import type { Player, Projectile, EnemyInstance } from '../types/core.d.ts';
import type { WeaponFireConfig, ProjectileConfig } from '../types/core.d.ts';

export interface TargetingResult {
  target: EnemyInstance | null;
  x: number;
  y: number;
}

export interface ProjectileTypeContext {
  angle: number;
  target: TargetingResult;
  p: Player;
  cfg: WeaponFireConfig;
  projCfg: ProjectileConfig;
  wId: string;
  baseDmg: number;
  lv: number;
}

interface ProjectileTypeDef {
  /** 创建时设置的属性（接收创建上下文） */
  createFlags: (ctx: ProjectileTypeContext) => Record<string, any>;
  /** 运动类型名（对应 MOVEMENT 注册表键） */
  movement: string;
  /** 碰撞检测类型名（对应 HIT_DETECTION 注册表键） */
  hit: string;
  /** 命中效果列表（对应 ON_HIT 注册表键） */
  onHit: string[];
}

/**
 * 投射物类型注册表
 * 每个类型定义：
 *  - createFlags(ctx): 创建时设置的属性（接收创建上下文）
 *  - movement: 运动类型名（对应 MOVEMENT 注册表键）
 *  - hit: 碰撞检测类型名（对应 HIT_DETECTION 注册表键）
 *  - onHit: 命中效果列表（对应 ON_HIT 注册表键）
 */
export const PROJECTILE_TYPES: Record<string, ProjectileTypeDef> = {
  /** 回旋镖 */
  boomerang: {
    createFlags: (_ctx) => ({ boomerang: true, spin: 0, ret: false }),
    movement: 'boomerang',
    hit: 'point',
    onHit: ['damage'],
  },

  /** 追踪 */
  homing: {
    createFlags: (ctx) => ({ homing: true, target: ctx.target.target }),
    movement: 'homing',
    hit: 'point',
    onHit: ['damage'],
  },

  /** 光束（瞬间命中线） */
  beam: {
    createFlags: (ctx) => ({ beam: true, dir: ctx.angle, dur: (ctx.projCfg.dur || 0.22) * (ctx.p.duration || 1), width: ctx.projCfg.width || 14 }),
    movement: 'stationary',
    hit: 'beam',
    onHit: ['damage', 'beam'],
  },

  /** 范围爆炸 */
  aoe: {
    createFlags: (ctx) => ({ aoe: true, maxR: (ctx.projCfg.aoe || 200) * ctx.p.area, slow: ctx.projCfg.slow || 0 }),
    movement: 'stationary',
    hit: 'aoe',
    onHit: ['damage'],
  },

  /** 陨石（延迟下落） */
  meteor: {
    createFlags: (ctx) => ({ meteor: true, delay: 0.55, aoe: (ctx.projCfg.aoe || 130) * ctx.p.area }),
    movement: 'meteor',
    hit: 'aoe',
    onHit: ['meteor'],
  },

  /** 蚀潮之锚（延迟下落 · 潮汐） */
  tide: {
    createFlags: (ctx) => ({ tide: true, delay: 0.5, aoe: (ctx.projCfg.aoe || 130) * ctx.p.area }),
    movement: 'meteor',
    hit: 'aoe',
    onHit: ['meteor'],
  },

  /** 酸液池 */
  acid: {
    createFlags: (_ctx) => ({ acid: true, life: 2 }),
    movement: 'acid',
    hit: 'point',
    onHit: ['damage'],
  },

  /** 地面延迟 */
  ground: {
    createFlags: (ctx) => ({ ground: true, delay: 0.8, r: ctx.projCfg.aoe || 90 }),
    movement: 'ground',
    hit: 'point',
    onHit: ['damage'],
  },

  /** 吐息（持续范围） */
  breath: {
    createFlags: (ctx) => ({
      breath: true, dir: ctx.angle,
      dur: ctx.projCfg.dur || 0.6,
      range: ctx.projCfg.range || 300,
      width: ctx.projCfg.width || 14,
    }),
    movement: 'breath',
    hit: 'beam',   // 使用 beam 碰撞检测器（锥形线检测 + 呼吸玩家检测）
    onHit: ['damage'],
  },

  /** 连锁闪电 */
  chain: {
    createFlags: (ctx) => ({
      chain: true, chainCount: ctx.projCfg.chain || 3,
      chainFall: ctx.projCfg.chainFall || 0.65,
      chainRange: ctx.projCfg.chainRange || 340,
    }),
    movement: 'linear',
    hit: 'point',
    onHit: ['weaponSpecific'],
  },

  /** 线性（默认） */
  linear: {
    createFlags: (_ctx) => ({}),
    movement: 'linear',
    hit: 'point',
    onHit: ['damage'],
  },
};

/**
 * 获取投射物的类型名
 */
export function resolveProjectileType(pr: Projectile): string {
  if (pr.tide) return 'tide';
  if (pr.meteor) return 'meteor';
  if (pr.acid) return 'acid';
  if (pr.ground) return 'ground';
  if (pr.breath) return 'breath';
  if (pr.boomerang) return 'boomerang';
  if (pr.homing) return 'homing';
  if (pr.beam) return 'beam';
  if (pr.aoe) return 'aoe';
  if (pr.chain) return 'chain';
  return 'linear';
}
