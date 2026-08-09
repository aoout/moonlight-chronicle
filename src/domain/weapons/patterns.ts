/* =========================================================
   蚀月远征 · 武器：发射模式模块
   可组合的弹幕发射模式，供武器管线使用
   ========================================================= */
import { PALETTE } from '../../assets/palette.js';
import { RNG, rand, TAU } from '../../engine/util/utils.js';
import { world } from '../../engine/ecs/World.js';
import { Position, Velocity, Combat, Timer, Renderable, Projectile } from '../../engine/ecs/entity_factories.js';
import { compileFormula } from '../../config/parser.js';
import { PROJECTILE_TYPES } from './projectile_types.js';
import { WEAPONS } from '../../config/index.js';
import type { TargetingResult } from './projectile_types.js';
import type { Player, WeaponFireConfig, ProjectileConfig } from '../../types/core.d.ts';

/**
 * 发射模式注册表
 * 每个模式接收 (p, target, cfg, baseDmg, wId) → 创建投射物/实体
 * - target: {x, y, target} 来自瞄准策略
 * - cfg: 武器配置的 fire 部分
 * 返回创建的投射物/实体数组
 */
export const PATTERNS: Record<string, (p: Player, target: TargetingResult, cfg: WeaponFireConfig, baseDmg: number, wId: string) => any[]> = {

  /** 单发 */
  single(p, target, cfg, baseDmg, wId) {
    const a = target.target
      ? Math.atan2(target.y - p.y, target.x - p.x)
      : p.facing;
    const n = 1 + p.projCount;
    const list = [];
    for (let i = 0; i < n; i++) {
      list.push(createProjectile(p, target, cfg, a, baseDmg, wId, i, n));
    }
    return list;
  },

  /** 散射 */
  spread(p, target, cfg, baseDmg, wId) {
    const a = target.target
      ? Math.atan2(target.y - p.y, target.x - p.x)
      : p.facing;
    const pr = Math.max(1, Math.floor(p.projCount * 0.6) + 1);
    const spreadAngle = cfg.spread ?? 0.3;
    const list = [];
    for (let i = 0; i < pr; i++) {
      list.push(createProjectile(p, target, cfg, a + (i - (pr - 1) / 2) * spreadAngle, baseDmg, wId, i, pr));
    }
    return list;
  },

  /** 齐射 */
  volley(p, target, cfg, baseDmg, wId) {
    const a = target.target
      ? Math.atan2(target.y - p.y, target.x - p.x)
      : p.facing;
    const n = resolveCount(cfg.count, p, 1) + p.projCount;
    const list = [];
    for (let i = 0; i < n; i++) {
      list.push(createProjectile(p, target, cfg, a, baseDmg, wId, i, n));
    }
    return list;
  },

  /** 全向新星 */
  nova(p, target, cfg, baseDmg, wId) {
    const n = resolveCount(cfg.count, p, 10) + p.projCount;
    const aimOffset = target.target
      ? Math.atan2(target.y - p.y, target.x - p.x) * 0.2
      : p.facing * 0.2;
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + aimOffset;
      list.push(createProjectile(p, target, cfg, a, baseDmg, wId, i, n));
    }
    return list;
  },

  /** 召唤分身 */
  phantom(p, _target, cfg, baseDmg, wId) {
    const def = WEAPONS[wId] as any;
    const n = 2 + Math.floor((cfg.lv ?? 1) / 2);
    const posOffset = def?.posOffset ?? 42;
    const duration = def?.duration ?? 5;
    const initFireT = def?.initFireT ?? 0.5;
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + RNG();
      const ph = world.add('phantoms', {
        ...Position(p.x + Math.cos(a) * posOffset, p.y + Math.sin(a) * posOffset),
        ...Combat(baseDmg / n),
        ...Timer(0, duration),
        fireT: rand(0, initFireT), lv: cfg.lv ?? 1,
      });
      list.push(ph);
    }
    return list;
  },
};

/** 公式缓存：避免重复解析 */
const formulaCache = new Map<string, (ctx: Record<string, unknown>) => number>();

/**
 * 解析 count 配置：支持数字、公式字符串、或函数
 */
function resolveCount(count: number | string | ((p: Player) => number) | undefined, p: Player, defaultVal: number): number {
  if (count == null) return defaultVal;
  if (typeof count === 'number') return count;
  if (typeof count === 'string') {
    let fn = formulaCache.get(count);
    if (!fn) { fn = compileFormula(count); formulaCache.set(count, fn); }
    return Math.round(fn(p as unknown as Record<string, unknown>));
  }
  if (typeof count === 'function') return count(p);
  return defaultVal;
}

/* 辅助：创建单个投射物 */
function createProjectile(p: Player, target: TargetingResult, cfg: WeaponFireConfig, angle: number, baseDmg: number, wId: string, _idx: number, _total: number): any {
  const projCfg = (cfg.projectile || cfg) as ProjectileConfig;
  const speed = projCfg.speed ?? 300;
  const range = projCfg.range ?? 300;
  const pierceVal = projCfg.pierce === -1 ? Infinity : (projCfg.pierce ?? 0);
  const pierce = pierceVal + (p.pierce ?? 0);
  const color = projCfg.color ?? PALETTE.white;
  const r = projCfg.radius ?? 6;

  // 从注册表获取投射物类型配置
  const typeName = projCfg.type || 'linear';
  const typeDef = PROJECTILE_TYPES[typeName] || PROJECTILE_TYPES.linear;

  // 创建上下文对象
  const ctx = { angle, target, p, cfg, projCfg, wId, baseDmg, lv: cfg.lv || 1 };

  // 陨石/蚀潮类投射物在目标位置生成，而非玩家位置
  const startX = (typeName === 'meteor' || typeName === 'tide') ? (target?.x ?? p.x) : p.x;
  const startY = (typeName === 'meteor' || typeName === 'tide') ? (target?.y ?? p.y) : p.y;

  const pr = world.add('projectiles', {
    ...Position(startX, startY),
    ...Velocity(Math.cos(angle) * speed, Math.sin(angle) * speed),
    ...Renderable(color, r),
    ...Combat(baseDmg, pierce),
    ...Projectile(wId, range, speed, r),
    ...Timer(0, 0),
    dir: angle, hit: new Set(), dead: false,
    // 使用注册表生成类型特定属性
    ...typeDef.createFlags(ctx),
    // 通用属性（不依赖类型）
    ...(projCfg.trail ? { trail: true } : {}),
    ...(projCfg.owner ? { owner: true } : {}),
  });
  return pr;
}
