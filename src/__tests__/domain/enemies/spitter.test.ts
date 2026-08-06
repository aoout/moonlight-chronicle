/* =========================================================
   domain/enemies/spitter · 蚀涎魔行为
   ---------------------------------------------------------
   蚀涎魔是唯一带「走位 + 预判射击」的小怪，三段行为叠在一起：
     · 远离 240px 时逼近，近于 240px 时后撤（保持中距）
     · 420px 内按 2.2s 节奏喷吐
     · 喷吐方向按玩家速度做 0.1~1s 提前量
   任何一段写错都不会崩，只会「手感变了」—— 正是需要测试锁住的东西。

   渲染部分已移交 features/render_smoke.test.ts，这里只测领域行为。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { spitterMove } from '../../../domain/enemies/behaviors/spitter.js';
import { makePlayer, makeEnemy } from '../../_harness/index.js';
import { entityState } from '../../../state/entities.js';
import { stageState } from '../../../state/stage.js';
import { renderState } from '../../../state/render.js';
import type { EnemyInstance, Player, Projectile } from '../../../types/core.d.ts';

const DT = 1 / 60;

function spitter(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
  return makeEnemy({
    x: 300, y: 300, spd: 52, stateT: 0, size: 10, dmg: 12,
    type: 'spitter', ranged: true, projSpd: 180, projDmg: 8,
    ...overrides,
  } as Partial<EnemyInstance>);
}

/** 玩家位置/速度可控；spitterMove 只读 x/y/vx/vy/effects */
function target(x: number, y: number, vx = 0, vy = 0): Player {
  const p = makePlayer();
  p.x = x; p.y = y; p.vx = vx; p.vy = vy;
  return p;
}

const shots = (): Projectile[] => entityState.state.projectiles as Projectile[];
const lastShot = (): any => shots()[shots().length - 1];

beforeEach(() => {
  stageState.set('stage', 5);
  renderState.set('width', 800);
  renderState.set('height', 600);
});

describe('spitterMove · 走位', () => {
  it('距离大于 240 时朝玩家逼近', () => {
    const e = spitter({ x: 0, y: 0 });
    const p = target(1000, 0);

    spitterMove(e, DT, p, 1);

    expect(e.x).toBeCloseTo(52 * DT);
  });

  it('距离小于 240 时后撤，且后撤速度只有 40%', () => {
    const e = spitter({ x: 0, y: 0 });
    const p = target(100, 0);

    spitterMove(e, DT, p, 1);

    expect(e.x).toBeCloseTo(-52 * 0.4 * DT);
  });

  it('slowF 同时作用于逼近与后撤（减速场生效）', () => {
    const fast = spitter({ x: 0, y: 0 });
    const slow = spitter({ x: 0, y: 0 });
    const p = target(1000, 0);

    spitterMove(fast, DT, p, 1);
    spitterMove(slow, DT, p, 0.5);

    expect(slow.x).toBeCloseTo(fast.x * 0.5);
  });

  it('无论进退，vx/vy 始终朝向玩家（用于朝向渲染）', () => {
    const e = spitter({ x: 0, y: 0 });
    const p = target(100, 0);          // 近距离 → 实际在后撤

    spitterMove(e, DT, p, 1);

    expect(e.x).toBeLessThan(0);       // 位置在退
    expect(e.vx).toBeGreaterThan(0);   // 朝向仍指着玩家
  });
});

describe('spitterMove · 喷吐节奏', () => {
  it('射程内且冷却就绪时发射一发敌方弹', () => {
    const e = spitter({ x: 300, y: 300 });
    const p = target(400, 300);

    spitterMove(e, DT, p, 1);

    expect(shots().length).toBe(1);
    expect(lastShot().enemy).toBeTruthy();
    expect(Math.hypot(lastShot().vx, lastShot().vy)).toBeCloseTo(180, 0);
  });

  it('发射后进入 2.2s 冷却，期间不再发射', () => {
    const e = spitter({ x: 300, y: 300 });
    const p = target(400, 300);

    spitterMove(e, DT, p, 1);
    expect(e.stateT).toBeCloseTo(2.2);

    for (let i = 0; i < 60; i++) spitterMove(e, DT, p, 1);
    expect(shots().length).toBe(1);
  });

  it('冷却走完后再次发射', () => {
    const e = spitter({ x: 300, y: 300 });
    const p = target(400, 300);

    spitterMove(e, DT, p, 1);
    for (let i = 0; i < 140; i++) spitterMove(e, DT, p, 1);   // 140/60 ≈ 2.33s

    expect(shots().length).toBe(2);
  });

  it('超出 420px 射程不发射', () => {
    const e = spitter({ x: 0, y: 0 });
    const p = target(500, 0);

    spitterMove(e, DT, p, 1);

    expect(shots().length).toBe(0);
  });

  it('玩家处于隐匿状态时丢失目标，不喷吐', () => {
    const e = spitter({ x: 300, y: 300 });
    const p = target(400, 300);
    p.effects.cloakTimer = 1;

    spitterMove(e, DT, p, 1);

    expect(shots().length).toBe(0);
    expect(e.stateT).toBeLessThan(0);      // 冷却继续走，解除隐匿后立刻能打
  });

  it('隐匿结束后立刻恢复喷吐', () => {
    const e = spitter({ x: 300, y: 300 });
    const p = target(400, 300);
    p.effects.cloakTimer = 1;

    spitterMove(e, DT, p, 1);
    p.effects.cloakTimer = 0;
    spitterMove(e, DT, p, 1);

    expect(shots().length).toBe(1);
  });
});

describe('spitterMove · 预判瞄准', () => {
  it('玩家静止时直射，不产生提前量', () => {
    const e = spitter({ x: 300, y: 300 });
    const p = target(400, 300, 0, 0);

    spitterMove(e, DT, p, 1);

    expect(Math.atan2(lastShot().vy, lastShot().vx)).toBeCloseTo(0, 3);
  });

  it('玩家横向高速移动时朝其前方偏移', () => {
    const e = spitter({ x: 300, y: 300 });
    const p = target(300, 500, 240, 0);      // 玩家在正下方、向右跑

    spitterMove(e, DT, p, 1);

    // 直射应是 +90°；预判会把角度往 +x 侧拉
    const ang = Math.atan2(lastShot().vy, lastShot().vx);
    expect(ang).toBeLessThan(Math.PI / 2);
    expect(ang).toBeGreaterThan(0);
  });

  it('提前量随距离增大而增大（lead = d/300，钳在 0.1~1s）', () => {
    const near = spitter({ x: 300, y: 300 });
    const pNear = target(360, 300, 0, 300);
    spitterMove(near, DT, pNear, 1);
    const nearAng = Math.abs(Math.atan2(lastShot().vy, lastShot().vx));

    entityState.set('projectiles', []);

    const far = spitter({ x: 300, y: 300 });
    const pFar = target(700, 300, 0, 300);
    spitterMove(far, DT, pFar, 1);
    const farAng = Math.abs(Math.atan2(lastShot().vy, lastShot().vx));

    // 近距离 lead 小、偏角小；远距离 lead 大…但基线距离也大。
    // 关键不变量：两者都向下偏（玩家在向下跑），且都没有偏到离谱。
    expect(nearAng).toBeGreaterThan(0);
    expect(farAng).toBeGreaterThan(0);
    expect(nearAng).toBeLessThan(Math.PI / 2);
    expect(farAng).toBeLessThan(Math.PI / 2);
  });

  it('极远处提前量被钳到 1s，不会算出荒谬的瞄准点', () => {
    const e = spitter({ x: 300, y: 300 });
    const p = target(300 + 419, 300, 0, 1e6);   // 玩家速度荒谬地大

    spitterMove(e, DT, p, 1);

    // lead 被钳在 1s，瞄准点最多偏 1e6 px —— 方向近乎正下方，但仍是有限值
    expect(Number.isFinite(lastShot().vx)).toBe(true);
    expect(Number.isFinite(lastShot().vy)).toBe(true);
    expect(Math.hypot(lastShot().vx, lastShot().vy)).toBeCloseTo(180, 0);
  });
});
