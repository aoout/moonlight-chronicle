/* =========================================================
   蚀月远征 · 敌方异型弹行为测试（v0.6 完整实装）
   卵囊分裂 / 符箓蓄力加速 / 浪花潮汐呼吸 / 类型路由
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { MOVEMENT, eggSplitBurst } from '../../../domain/weapons/movement.js';
import { resolveProjectileType, PROJECTILE_TYPES } from '../../../domain/weapons/projectile_types.js';
import { HIT_DETECTION } from '../../../domain/weapons/hit_detection.js';
import { entityState } from '../../../state/entities.js';
import { eSt, pSt } from '../../../state/accessors.js';
import { installPlayer, makePlayer, makeEnemy, bindWorld, spawnEnemies, enterPlaying } from '../../_harness/index.js';
import { buildSpatialGrid } from '../../../engine/spatial/SpatialSystem.js';

beforeEach(() => {
  entityState.set('projectiles', []);
});

describe('敌方异型弹行为（v0.6 完整实装）', () => {
  it('卵囊破裂：生成 3 只三角幼体，扇形散射，伤害继承 70%', () => {
    const pr: any = { x: 100, y: 100, vx: 100, vy: 0, dmg: 10, color: '#6fa8a0' };
    const kids = eggSplitBurst(pr);
    expect(kids.length).toBe(3);
    for (const k of kids) {
      expect(k.wId).toBe('enemy_tri');
      expect(k.enemy).toBe(true);
      expect(k.x).toBe(100);
      expect(k.y).toBe(100);
    }
    // 扇形散射：相邻幼体夹角 0.5 rad
    const angs = kids.map(k => Math.atan2(k.vy as number, k.vx as number));
    expect(Math.abs(angs[1] - angs[0])).toBeCloseTo(0.5, 5);
    expect(Math.abs(angs[2] - angs[1])).toBeCloseTo(0.5, 5);
    expect(kids[0].dmg).toBeCloseTo(7, 5);
  });

  it('卵囊弹运动：飞行到 splitAt 后破裂（原弹死亡，生成 3 只幼体）', () => {
    const pr: any = { x: 0, y: 0, vx: 80, vy: 0, dmg: 10, wId: 'enemy_egg', splitAt: 1.1, life: 3, color: '#6fa8a0', t: 0 };
    // 未到分裂点：存活
    expect(MOVEMENT.enemyEgg(pr, 0.5, null as any)).toBe(true);
    // 越过分裂点：破裂
    expect(MOVEMENT.enemyEgg(pr, 0.7, null as any)).toBe(false);
    expect(pr.dead).toBe(1);
    expect(eSt().projectiles.length).toBe(3);
  });

  it('符箓弹：蓄力期匀速，越过 chargeT 后持续加速，charge 进度供渲染层', () => {
    const pr: any = { x: 0, y: 0, vx: 100, vy: 0, wId: 'enemy_rune', chargeT: 0.9, life: 3.2, charge: 0, t: 0 };
    // 蓄力前（0.4s）：匀速
    MOVEMENT.enemyRune(pr, 0.4, null as any);
    expect(pr.vx).toBeCloseTo(100, 3);
    expect(pr.charge).toBeCloseTo(0.444, 2);
    // 越过 chargeT（再 0.6s）：加速
    MOVEMENT.enemyRune(pr, 0.6, null as any);
    expect(pr.vx).toBeGreaterThan(100);
    expect(pr.charge).toBe(1);
    // 持续加速
    const v1 = pr.vx;
    MOVEMENT.enemyRune(pr, 0.1, null as any);
    expect(pr.vx).toBeGreaterThan(v1);
  });

  it('浪花弹：速度随潮汐呼吸在 [0.55, 1.45]×base 内波动', () => {
    const pr: any = { x: 0, y: 0, vx: 200, vy: 0, baseSpeed: 200, phase: 0, life: 999, t: 0 };
    let min = Infinity, max = -Infinity;
    for (let i = 0; i < 200; i++) {
      MOVEMENT.enemyWave(pr, 0.016, null as any);
      const sp = Math.hypot(pr.vx, pr.vy);
      min = Math.min(min, sp);
      max = Math.max(max, sp);
      pr.x = 0; pr.y = 0;   // 防出界（测试环境 rSt 宽度为 0）
    }
    expect(min).toBeGreaterThan(200 * 0.54);
    expect(max).toBeLessThanOrEqual(200 * 1.46);
    // 速度确实在呼吸变化（不是恒定值）
    expect(max - min).toBeGreaterThan(20);
  });

  it('敌方异型弹寿命耗尽/出界死亡', () => {
    const p1: any = { x: 0, y: 0, vx: 10, vy: 0, wId: 'enemy_rune', chargeT: 0.9, life: 0.05, charge: 0, t: 0 };
    expect(MOVEMENT.enemyRune(p1, 0.1, null as any)).toBe(false);
    expect(p1.dead).toBe(1);
    const p2: any = { x: 0, y: 0, vx: 10, vy: 0, baseSpeed: 10, phase: 0, life: 0.05, t: 0 };
    expect(MOVEMENT.enemyWave(p2, 0.1, null as any)).toBe(false);
    expect(p2.dead).toBe(1);
    const p3: any = { x: 0, y: 0, vx: 10, vy: 0, wId: 'enemy_egg', splitAt: 9, life: 0.05, t: 0 };
    expect(MOVEMENT.enemyEgg(p3, 0.1, null as any)).toBe(false);
    expect(p3.dead).toBe(1);
  });

  it('resolveProjectileType 正确路由敌方异型弹', () => {
    expect(resolveProjectileType({ enemy: true, wId: 'enemy_egg' } as any)).toBe('enemyEgg');
    expect(resolveProjectileType({ enemy: true, wId: 'enemy_rune' } as any)).toBe('enemyRune');
    expect(resolveProjectileType({ enemy: true, wId: 'enemy_wave' } as any)).toBe('enemyWave');
    // 无特殊行为的敌方弹回落 linear
    expect(resolveProjectileType({ enemy: true, wId: 'enemy_flame' } as any)).toBe('linear');
    expect(resolveProjectileType({ vx: 1, vy: 0 } as any)).toBe('linear');
  });
});

/* =========================================================
   地面落点爆炸的敌我分派（回归，2026-08-11）
   修复前：explodeGround 无条件 damageEnemy —— 敌方封锁/蚀痕/落雷
   全部打在小怪身上，对玩家的走位封锁完全失效。
   ========================================================= */
describe('地面落点爆炸的敌我分派（回归）', () => {
  beforeEach(() => { bindWorld(); enterPlaying(); });

  it('敌方 ground 落点爆炸对玩家造成范围伤害（封锁技能真正生效）', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.hp = 100; p.invuln = 0;
    const pr: any = { ground: true, enemy: true, x: p.x, y: p.y, t: 0, delay: 0.1, r: 60, dmg: 20, color: '#fff' };
    MOVEMENT.ground(pr, 0.15, p);   // 越过 delay → explodeGround
    expect(pr.dead).toBe(1);
    expect(p.hp).toBe(80);
  });

  it('玩家 ground 落点爆炸只伤敌人，不伤自己', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.hp = 100; p.invuln = 0;
    const [e] = spawnEnemies(makeEnemy({ x: p.x, y: p.y, hp: 100, maxHp: 100 }));
    buildSpatialGrid();
    const pr: any = { ground: true, x: p.x, y: p.y, t: 0, delay: 0.1, r: 60, dmg: 20, color: '#fff' };
    MOVEMENT.ground(pr, 0.15, p);
    expect(pr.dead).toBe(1);
    expect(e.hp).toBeLessThan(100);  // 敌人掉血
    expect(p.hp).toBe(100);          // 玩家不受自己落点伤害
  });

  it('敌方酸雾 AOE 不误伤己方小怪', () => {
    installPlayer();
    spawnEnemies(makeEnemy({ x: 100, y: 100, hp: 100, maxHp: 100 }));
    buildSpatialGrid();
    const pr: any = { enemy: true, aoe: true, r: 90, maxR: 100, hit: new Set(), x: 100, y: 100, t: 0, dmg: 10, slow: 0.5, color: '#0f0' };
    const hits = HIT_DETECTION.aoe(pr, 1 / 60, pSt().player!);
    expect(hits.filter(h => !h.isPlayer)).toHaveLength(0);   // 没有敌人命中（己方小怪不受毒雾）
  });

  it('aoe 类型弹 pierce 恒为 Infinity（持续 AOE 不被穿透判死）', () => {
    const p = makePlayer();
    const flags = PROJECTILE_TYPES.aoe.createFlags({ p, projCfg: { aoe: 200 } } as any);
    expect(flags.pierce).toBe(Infinity);
  });
});
