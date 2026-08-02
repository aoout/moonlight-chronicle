/* =========================================================
   蚀月远征 · 武器：发射模式模块
   可组合的弹幕发射模式，供武器管线使用
   ========================================================= */
import { RNG, rand } from '../utils.js';
import { world } from '../ecs/World.js';
import { createEntity, Position, Velocity, Combat, Timer, Renderable, Projectile } from '../ecs/components.js';
import { evalFormula } from '../data/parser.js';
import { PROJECTILE_TYPES } from './projectile_types.js';

/**
 * 发射模式注册表
 * 每个模式接收 (p, target, cfg, baseDmg, wId) → 创建投射物/实体
 * - target: {x, y, target} 来自瞄准策略
 * - cfg: 武器配置的 fire 部分
 * 返回创建的投射物/实体数组
 */
export const PATTERNS: Record<string, (p: any, target: any, cfg: any, baseDmg: number, wId: string) => any[]> = {

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
    const spreadAngle = cfg.spread || 0.3;
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
      const a = (i / n) * 6.28 + aimOffset;
      list.push(createProjectile(p, target, cfg, a, baseDmg, wId, i, n));
    }
    return list;
  },

  /** 召唤分身 */
  phantom(p, _target, cfg, baseDmg, wId) {
    const n = 2 + Math.floor((cfg.lv || 1) / 2);
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.28 + RNG();
      const ph = world.add('phantoms', createEntity(
        Position(p.x + Math.cos(a) * 42, p.y + Math.sin(a) * 42),
        Combat(baseDmg / n),
        Timer(0, 5),
        { fireT: rand(0, 0.5), lv: cfg.lv || 1 }
      ));
      list.push(ph);
    }
    return list;
  },
};

/**
 * 解析 count 配置：支持数字、公式字符串、或函数
 */
function resolveCount(count: number | string | ((p: any) => number) | undefined, p: any, defaultVal: number): number {
  if (count == null) return defaultVal;
  if (typeof count === 'number') return count;
  if (typeof count === 'string') return Math.round(evalFormula(count, p));
  if (typeof count === 'function') return count(p);
  return defaultVal;
}

/* 辅助：创建单个投射物 */
function createProjectile(p: any, target: any, cfg: any, angle: number, baseDmg: number, wId: string, _idx: number, _total: number): any {
  const projCfg = cfg.projectile || cfg;
  const speed = projCfg.speed || 300;
  const range = projCfg.range || 300;
  const pierce = (projCfg.pierce || 0) + (p.pierce || 0);
  const color = projCfg.color || '#fff';
  const r = projCfg.radius || 6;

  // 从注册表获取投射物类型配置
  const typeName = projCfg.type || 'linear';
  const typeDef = PROJECTILE_TYPES[typeName] || PROJECTILE_TYPES.linear;

  // 创建上下文对象
  const ctx = { angle, target, p, cfg, projCfg, wId, baseDmg, lv: cfg.lv || 1 };

  const pr = world.add('projectiles', createEntity(
    Position(p.x, p.y),
    Velocity(Math.cos(angle) * speed, Math.sin(angle) * speed),
    Renderable(color, r),
    Combat(baseDmg, pierce),
    Projectile(wId, range, speed, r),
    Timer(0, 0),
    {
      dir: angle, hit: new Set(), dead: false,
      // 使用注册表生成类型特定属性
      ...typeDef.createFlags(ctx),
      // 通用属性（不依赖类型）
      ...(projCfg.trail ? { trail: true } : {}),
      ...(projCfg.owner ? { owner: true } : {}),
    }
  ));
  return pr;
}
