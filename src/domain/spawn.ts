/* =========================================================
   蚀月远征 · 领域模块：敌人生成
   从 SpawnSystem 静态方法迁出，供 System 与外部模块直接调用
   ========================================================= */
import { stageState } from '../state/stage.js';
import { RNG, rand } from '../engine/util/utils.js';
import { ENEMIES, BOSSES, enemyScale, levelEnemyScale } from '../config/index.js';
import { world } from '../engine/ecs/World.js';
import { PROJECTILE_POOL } from '../engine/ecs/entity_pool.js';
import { codexAdd } from '../infra/persistence/codex.js';
import { Position, Health, Renderable, Combat, Timer, Status, Enemy, Velocity } from '../engine/ecs/entity_factories.js';
import type { EnemyInstance } from '../types/core.d.ts';

import { gSt, rSt, pSt, eSt } from '../state/accessors.js';

/** 生成敌人 */
export function spawnEnemy(type: string, opts?: { hpMul?: number }): EnemyInstance {
  const def = ENEMIES[type];
  const gs = gSt();
  const rs = rSt();
  codexAdd('enemies', type);
  const sc = enemyScale(gs.stage);
  const ls = levelEnemyScale(gs.depth);
  const p = pSt().player;
  const m = 30;
  const side = Math.floor(RNG() * 4);
  let x: number, y: number;
  if (side === 0) { x = rand(-m, rs.width + m); y = -m; }
  else if (side === 1) { x = rand(-m, rs.width + m); y = rs.height + m; }
  else if (side === 2) { x = -m; y = rand(-m, rs.height + m); }
  else { x = rs.width + m; y = rand(-m, rs.height + m); }
  const hp = def.hp * sc.hp * (opts && opts.hpMul ? opts.hpMul : 1) * ls.hp * (p && p.effects.enemyHpMul ? p.effects.enemyHpMul : 1);
  const dmg = def.dmg * sc.dmg * ls.dmg * (p && p.effects.enemyDmgMul ? p.effects.enemyDmgMul : 1);
  const e = world.add('enemies', {
    ...Position(x, y),
    ...Health(hp),
    ...Renderable(def.color, def.size),
    ...Combat(dmg),
    ...Timer(RNG() * 6.28, 0),
    ...Status(0, 0, 0, 0),
    ...Enemy(type, false),
    ...Velocity(0, 0),
    spd: def.spd, wob: rand(0.6, 1.4),
    stateT: 0, dead: 0, state: 'chase',
    split: def.split || 0, splitHp: def.splitHp || 0,
    dash: def.dash || 0, projSpd: def.projSpd || 0, projDmg: def.projDmg || 0,
    ranged: def.ranged || false,
  });
  e.maxHp = e.hp;
  return e;
}

/** 生成 Boss */
export function spawnBoss(type: string): EnemyInstance {
  const def = BOSSES[type];
  const gs = gSt();
  const rs = rSt();
  codexAdd('bosses', type);
  const sc = enemyScale(gs.stage);
  const ls = levelEnemyScale(gs.depth);
  const p = pSt().player;
  const hp = def.hp * (type === 'final' ? 1.35 : 1) * (1 + (gs.stage - 1) * 0.02) * ls.hp * (p && p.effects.enemyHpMul ? p.effects.enemyHpMul : 1);
  const dmg = def.dmg * sc.dmg * ls.dmg * (p && p.effects.enemyDmgMul ? p.effects.enemyDmgMul : 1);
  const e = world.add('enemies', {
    ...Position(rs.width / 2, -70),
    ...Health(hp),
    ...Renderable(def.color, def.size),
    ...Combat(dmg),
    ...Timer(0, 0),
    ...Status(0, 0, 0, 0),
    ...Enemy(type, true),
    ...Velocity(0, 0),
    stateT: 0, vx: 0, vy: 0, dead: 0,
    spd: def.spd, attT: rand(1, 2), state: 'enter',
    skills: def.skills || ['wave'],
    attCd: def.attCd || 3.4,
  });
  e.maxHp = e.hp;
  stageState.set('boss', e);
  return e;
}

/** 敌人投射物（蚀涎魔等） */
export function spawnEnemyProjectile(e: EnemyInstance, ang: number): void {
  const gs = gSt();
  const projSpd = e.projSpd ?? 180;
  const projDmg = e.projDmg ?? 0;
  // 与 Boss 技能弹一致：直接 push 到渲染数组（eSt().projectiles），
  // 确保投射物更新与渲染遍历到同一列表，杜绝"发射了但看不见"
  eSt().projectiles.push(PROJECTILE_POOL.addWith({
    enemy: true, spit: true, hit: new Set(),
    x: e.x, y: e.y,
    vx: Math.cos(ang) * projSpd, vy: Math.sin(ang) * projSpd,
    r: 6, color: '#7fd6a4',
    dmg: projDmg * enemyScale(gs.stage).dmg,
    life: 4,
  }));
}
