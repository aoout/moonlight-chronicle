/* =========================================================
   蚀月远征 · 实体工厂
   集中管理 ECS 实体的创建，统一使用组件工厂
   ========================================================= */
import { RNG, rand, pick } from '../utils.js';
import { ENEMIES, BOSSES, CONFIG, enemyScale, levelEnemyScale } from '../data/index.js';
import { world } from './World.js';
import { codexAdd } from '../codex.js';
import {
  createEntity, Position, Health, Renderable, Combat, Timer, Status,
  Enemy, Velocity, Drop, Particle, Phantom, Projectile,
} from './components.js';
import { stageState } from '../state/stage.js';
import { renderState } from '../state/render.js';

/** 便捷引用 */
const gSt = () => stageState.state;
const rSt = () => renderState.state;

/**
 * 创建敌人实体
 * @param {string} type
 * @param {{hpMul?:number}} [opts]
 */
export function createEnemy(type, opts) {
  const def = ENEMIES[type];
  const gs = gSt();
  const rs = rSt();
  codexAdd('enemies', type);
  const sc = enemyScale(gs.stage);
  const ls = levelEnemyScale(gs.depth);
  const p = world._player;
  const m = 30;
  const side = Math.floor(RNG() * 4);
  let x, y;
  if (side === 0) { x = rand(-m, rs.width + m); y = -m; }
  else if (side === 1) { x = rand(-m, rs.width + m); y = rs.height + m; }
  else if (side === 2) { x = -m; y = rand(-m, rs.height + m); }
  else { x = rs.width + m; y = rand(-m, rs.height + m); }
  const hp = def.hp * sc.hp * (opts && opts.hpMul ? opts.hpMul : 1) * ls.hp * (p && p._enemyHpMul ? p._enemyHpMul : 1);
  const dmg = def.dmg * sc.dmg * ls.dmg * (p && p._enemyDmgMul ? p._enemyDmgMul : 1);
  const e = world.add('enemies', createEntity(
    Position(x, y),
    Health(hp),
    Renderable(def.color, def.size),
    Combat(dmg),
    Timer(RNG() * 6.28, 0),
    Status(0, 0, 0, 0),
    Enemy(type, false),
    Velocity(0, 0),
    {
      spd: def.spd, wob: rand(0.6, 1.4),
      stateT: 0, dead: 0, state: 'chase',
      split: def.split || 0, splitHp: def.splitHp || 0,
      dash: def.dash || 0, projSpd: def.projSpd || 0, projDmg: def.projDmg || 0,
      ranged: def.ranged || false,
    }
  ));
  e.maxHp = e.hp;
  return e;
}

/**
 * 创建 Boss 实体
 * @param {string} type
 */
export function createBoss(type) {
  const def = BOSSES[type];
  const gs = gSt();
  const rs = rSt();
  codexAdd('bosses', type);
  const sc = enemyScale(gs.stage);
  const ls = levelEnemyScale(gs.depth);
  const p = world._player;
  const hp = def.hp * (type === 'final' ? 1.35 : 1) * (1 + (gs.stage - 1) * 0.02) * ls.hp * (p && p._enemyHpMul ? p._enemyHpMul : 1);
  const dmg = def.dmg * sc.dmg * ls.dmg * (p && p._enemyDmgMul ? p._enemyDmgMul : 1);
  const e = world.add('enemies', createEntity(
    Position(rs.width / 2, -70),
    Health(hp),
    Renderable(def.color, def.size),
    Combat(dmg),
    Timer(0, 0),
    Status(0, 0, 0, 0),
    Enemy(type, true),
    Velocity(0, 0),
    {
      stateT: 0, vx: 0, vy: 0, dead: 0,
      spd: def.spd, attT: rand(1, 2), state: 'enter',
      skills: def.skills || ['wave'],
      attCd: def.attCd || 3.4,
    }
  ));
  e.maxHp = e.hp;
  stageState.set('boss', e);
  return e;
}

/**
 * 创建敌人投射物
 * @param {import('../types/core.d.ts').EnemyInstance} e
 * @param {number} ang
 */
export function createEnemyProjectile(e, ang) {
  const gs = gSt();
  world.add('projectiles', createEntity(
    Position(e.x, e.y),
    Velocity(Math.cos(ang) * e.projSpd, Math.sin(ang) * e.projSpd),
    Renderable('#7fd6a4', 5),
    Combat(e.projDmg * enemyScale(gs.stage).dmg, 0),
    Timer(0, 4),
    Projectile('enemy', 0, e.projSpd, 5),
    { enemy: true, hit: new Set() }
  ));
}

/**
 * 创建掉落物实体
 * @param {number} x
 * @param {number} y
 * @param {'xp'|'gold'} kind
 * @param {number} amount
 */
export function createDrop(x, y, kind, amount) {
  world.add('drops', createEntity(
    Position(x, y),
    Velocity(rand(-40, 40), rand(-40, 40)),
    Drop(kind, amount),
  ));
}

/**
 * 创建粒子实体
 * @param {number} x
 * @param {number} y
 * @param {number} vx
 * @param {number} vy
 * @param {number} life
 * @param {string} color
 * @param {number} size
 */
export function createParticle(x, y, vx, vy, life, color, size) {
  world.add('particles', createEntity(
    Position(x, y),
    Particle(vx, vy, life, color, size),
  ));
}