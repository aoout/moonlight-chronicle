/* =========================================================
   蚀月远征 · 武器：发射模式模块
   可组合的弹幕发射模式，供武器管线使用
   ========================================================= */
import { G } from '../state.js';
import { RNG, rand } from '../utils.js';
import { PROJECTILE_POOL, PHANTOM_POOL } from '../entity_pool.js';
import { createEntity, Position, Velocity, Combat, Timer, Renderable, Projectile } from '../ecs/components.js';
import { evalFormula } from '../data/parser.js';

/**
 * 发射模式注册表
 * 每个模式接收 (p, target, cfg, baseDmg, wId) → 创建投射物/实体
 * - target: {x, y, target} 来自瞄准策略
 * - cfg: 武器配置的 fire 部分
 * 返回创建的投射物/实体数组
 */
export const PATTERNS = {

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
      const ph = PHANTOM_POOL.addWith(createEntity(
        Position(p.x + Math.cos(a) * 42, p.y + Math.sin(a) * 42),
        Combat(baseDmg / n),
        Timer(0, 5),
        { fireT: rand(0, 0.5), lv: cfg.lv || 1 }
      ));
      G.phantoms.push(ph);
      list.push(ph);
    }
    return list;
  },
};

/**
 * 解析 count 配置：支持数字、公式字符串、或函数
 * @param {number|string|((p:any)=>number)|undefined} count
 * @param {any} p
 * @param {number} defaultVal
 */
function resolveCount(count, p, defaultVal) {
  if (count == null) return defaultVal;
  if (typeof count === 'number') return count;
  if (typeof count === 'string') return Math.round(evalFormula(count, p));
  if (typeof count === 'function') return count(p);
  return defaultVal;
}

/* 辅助：创建单个投射物 */
function createProjectile(p, target, cfg, angle, baseDmg, wId, _idx, _total) {
  const projCfg = cfg.projectile || cfg;
  const speed = projCfg.speed || 300;
  const range = projCfg.range || 300;
  const pierce = (projCfg.pierce || 0) + (p.pierce || 0);
  const color = projCfg.color || '#fff';
  const r = projCfg.radius || 6;

  const pr = PROJECTILE_POOL.addWith(createEntity(
    Position(p.x, p.y),
    Velocity(Math.cos(angle) * speed, Math.sin(angle) * speed),
    Renderable(color, r),
    Combat(baseDmg, pierce),
    Projectile(wId, range, speed, r),
    Timer(0, 0),
    { dir: angle, hit: new Set(), dead: false,
      // 类型标记
      ...(projCfg.type === 'boomerang' ? { boomerang: true, spin: 0, ret: false } : {}),
      ...(projCfg.type === 'homing' ? { homing: true, target: target.target } : {}),
      ...(projCfg.type === 'beam' ? { beam: true, dir: angle, dur: 0.22 * (p.duration || 1), width: 14 } : {}),
      ...(projCfg.type === 'aoe' ? { aoe: true, maxR: (projCfg.aoe || 200) * p.area, slow: projCfg.slow || 0 } : {}),
      ...(projCfg.type === 'meteor' ? { meteor: true, delay: 0.55, aoe: (projCfg.aoe || 130) * p.area } : {}),
      ...(projCfg.type === 'acid' ? { acid: true, life: 2 } : {}),
      ...(projCfg.type === 'ground' ? { ground: true, delay: 0.8, r: projCfg.aoe || 90 } : {}),
      ...(projCfg.type === 'breath' ? { breath: true, dir: angle, dur: projCfg.dur || 0.6, range: projCfg.range || 300, width: projCfg.width || 14 } : {}),
      ...(projCfg.type === 'chain' ? { chain: true, chainCount: projCfg.chain || 3, chainFall: projCfg.chainFall || 0.65, chainRange: projCfg.chainRange || 340 } : {}),
      ...(projCfg.trail ? { trail: true } : {}),
      ...(projCfg.owner ? { owner: true } : {}),
    }
  ));
  G.projectiles.push(pr);
  return pr;
}