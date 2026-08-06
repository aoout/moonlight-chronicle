/* =========================================================
   domain/weapons/movement · 投射物运动注册表
   ---------------------------------------------------------
   MOVEMENT 里每条运动都返回「是否存活」，PROJ_TICK 靠这个布尔值
   决定回收。存活判定写错的代价是子弹永生或秒消失 —— 都是肉眼很难
   立刻发现、但手感当场崩坏的那类 bug，所以这里逐条钉死。

   原文件只测了 homing 的 3 个分支，其余 7 条运动零覆盖。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { MOVEMENT } from '../../../domain/weapons/movement.js';
import {
  makePlayer, installPlayer, makeProjectile, makeDummy, spawnEnemies, bindWorld, queueRandom,
} from '../../_harness/index.js';
import { renderState } from '../../../state/render.js';
import { buildSpatialGrid } from '../../../engine/spatial/SpatialSystem.js';
import type { Player, Projectile } from '../../../types/core.d.ts';

/** 视口边界参与 linear/acid 的出界判定，默认 0×0 会让子弹刚生成就出界 */
function setViewport(w = 800, h = 600): void {
  renderState.set('width', w);
  renderState.set('height', h);
}

let player: Player;

beforeEach(() => {
  setViewport();
  player = makePlayer();
});

/* ---------------------------------------------------------
   linear
   --------------------------------------------------------- */

describe('MOVEMENT.linear', () => {
  it('按速度推进位置并消耗生命', () => {
    const pr = makeProjectile({ x: 100, y: 100, vx: 300, vy: -150, life: 2 });

    const alive = MOVEMENT.linear(pr, 0.1, player);

    expect(alive).toBe(true);
    expect(pr.x).toBeCloseTo(130);
    expect(pr.y).toBeCloseTo(85);
    expect(pr.life).toBeCloseTo(1.9);
  });

  it('life 耗尽即判定死亡并打上 dead 标记', () => {
    const pr = makeProjectile({ x: 100, y: 100, vx: 0, vy: 0, life: 0.05 });

    expect(MOVEMENT.linear(pr, 0.1, player)).toBe(false);
    expect(pr.dead).toBe(1);
  });

  it.each([
    ['左出界', -120, 300],
    ['右出界', 900, 300],
    ['上出界', 400, -120],
    ['下出界', 400, 700],
  ])('%s 时回收', (_label, x, y) => {
    const pr = makeProjectile({ x, y, vx: 0, vy: 0, life: 5 });

    expect(MOVEMENT.linear(pr, 0.016, player)).toBe(false);
    expect(pr.dead).toBe(1);
  });

  it('边界外 50px 内仍算存活（留出宽限带，避免贴边闪断）', () => {
    const pr = makeProjectile({ x: 840, y: 300, vx: 0, vy: 0, life: 5 });

    expect(MOVEMENT.linear(pr, 0.016, player)).toBe(true);
  });
});

/* ---------------------------------------------------------
   homing
   --------------------------------------------------------- */

describe('MOVEMENT.homing', () => {
  /** 弹向右飞、目标在正上方 → 想转 90° */
  function rightFlyingAtTargetAbove(extra: Partial<Projectile> = {}): Projectile {
    const pr = makeProjectile({
      x: 0, y: 0, vx: 100, vy: 0, speed: 100, life: 4, t: 0, ...extra,
    });
    (pr as any).target = { x: 0, y: -100, dead: 0 };
    return pr;
  }

  it('turnRate 限制单帧转向角，急转弯甩得掉', () => {
    const pr = rightFlyingAtTargetAbove({ turnRate: 1.5 });

    const alive = MOVEMENT.homing(pr, 1 / 60, player);

    expect(alive).toBe(true);
    // 想转 -1.57rad，但单帧上限只有 1.5 × 1/60 = 0.025rad
    expect(Math.atan2(pr.vy, pr.vx)).toBeCloseTo(-0.025, 3);
  });

  it('turnRate 足够大时可一帧转到位', () => {
    const pr = rightFlyingAtTargetAbove({ turnRate: 999 });

    MOVEMENT.homing(pr, 1 / 60, player);

    expect(Math.atan2(pr.vy, pr.vx)).toBeCloseTo(-Math.PI / 2, 3);
  });

  it('转向走最短弧：目标在身后偏下时不绕远路', () => {
    const pr = makeProjectile({ x: 0, y: 0, vx: 100, vy: 0, speed: 100, life: 4, turnRate: 999 });
    (pr as any).target = { x: -100, y: 10, dead: 0 };

    MOVEMENT.homing(pr, 1 / 60, player);

    // 目标方向约 +3.04rad；若最短弧判定写错会得到 -3.24 这种绕远的值
    expect(Math.atan2(pr.vy, pr.vx)).toBeCloseTo(Math.atan2(10, -100), 3);
  });

  it('lockT 到期后丢失目标，退化为直线', () => {
    const pr = rightFlyingAtTargetAbove({ turnRate: 999, lockT: 0.05 });

    MOVEMENT.homing(pr, 0.06, player);

    expect(pr.target).toBeUndefined();
    expect(pr.vy).toBe(0);              // 没有再转向
  });

  it('目标已死则不再追踪', () => {
    const pr = rightFlyingAtTargetAbove({ turnRate: 999 });
    (pr as any).target.dead = 1;

    MOVEMENT.homing(pr, 1 / 60, player);

    expect(pr.vy).toBe(0);
  });

  it('accel 逐帧加速，但被 speedMax 钳住', () => {
    const pr = rightFlyingAtTargetAbove({ speed: 100, speedMax: 120, accel: 1000 });

    MOVEMENT.homing(pr, 1 / 60, player);
    expect(pr.speed).toBeCloseTo(100 + 1000 / 60);   // 单帧只加一点

    for (let i = 0; i < 10; i++) MOVEMENT.homing(pr, 1 / 60, player);
    expect(pr.speed).toBe(120);                      // 再怎么加也封顶
  });

  it('没有 accel 时速度恒定', () => {
    const pr = rightFlyingAtTargetAbove({ speed: 100 });

    MOVEMENT.homing(pr, 1 / 60, player);

    expect(pr.speed).toBe(100);
  });

  it('存活时间以累计 t 与 life 比较，超时回收', () => {
    const pr = rightFlyingAtTargetAbove({ life: 0.05 });

    expect(MOVEMENT.homing(pr, 0.03, player)).toBe(true);
    expect(MOVEMENT.homing(pr, 0.03, player)).toBe(false);
    expect(pr.dead).toBe(1);
  });
});

/* ---------------------------------------------------------
   boomerang
   --------------------------------------------------------- */

describe('MOVEMENT.boomerang', () => {
  it('去程沿 dir 前进并持续自旋', () => {
    const pr = makeProjectile({ x: 0, y: 0, dir: 0, speed: 300, range: 420, spin: 0 });
    installPlayer();

    MOVEMENT.boomerang(pr, 0.1, player);

    expect(pr.x).toBeCloseTo(30);
    expect(pr.spin).toBeCloseTo(1.2);
    expect(pr.ret).toBeFalsy();
  });

  it('飞满 60% 射程后进入回程', () => {
    const pr = makeProjectile({ x: 0, y: 0, dir: 0, speed: 300, range: 420 });
    // t × speed ≥ 252 → t ≥ 0.84s
    pr.t = 0.9;

    MOVEMENT.boomerang(pr, 0.016, { ...player, x: 0, y: 0 } as Player);

    expect(pr.ret).toBe(1);
  });

  it('回程贴近玩家（<26px）即被接住回收', () => {
    const pr = makeProjectile({ x: 10, y: 0, dir: 0, speed: 300, range: 420 });
    pr.ret = 1;
    const p = makePlayer();
    p.x = 0; p.y = 0;

    expect(MOVEMENT.boomerang(pr, 0.016, p)).toBe(false);
    expect(pr.dead).toBe(1);
  });

  it('回程时朝玩家方向修正，玩家跑动也能追回来', () => {
    const pr = makeProjectile({ x: 0, y: 0, dir: 0, speed: 300, range: 420 });
    pr.ret = 1;
    const p = makePlayer();
    p.x = 0; p.y = 500;                  // 玩家在正下方

    MOVEMENT.boomerang(pr, 0.016, p);

    // 去程那一小步已经把 pr 推离原点，所以角度是「约等于正下方」而非精确 π/2
    expect(Math.sin(pr.dir)).toBeGreaterThan(0.99);
    expect(pr.y).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------
   stationary / meteor / breath —— 计时类
   --------------------------------------------------------- */

describe('MOVEMENT.stationary', () => {
  it('非光束的静止物不会自行消失', () => {
    const pr = makeProjectile({ t: 0 });

    expect(MOVEMENT.stationary(pr, 5, player)).toBe(true);
    expect(pr.t).toBe(5);
  });

  it('光束到达 dur 后回收', () => {
    const pr = makeProjectile({ t: 0 });
    (pr as any).beam = 1;
    (pr as any).dur = 0.3;

    expect(MOVEMENT.stationary(pr, 0.2, player)).toBe(true);
    expect(MOVEMENT.stationary(pr, 0.2, player)).toBe(false);
    expect(pr.dead).toBe(1);
  });
});

describe('MOVEMENT.meteor', () => {
  it('只累计时间，落地判定交给别处，自身永远存活', () => {
    const pr = makeProjectile({ t: 0 });

    expect(MOVEMENT.meteor(pr, 0.5, player)).toBe(true);
    expect(MOVEMENT.meteor(pr, 0.5, player)).toBe(true);
    expect(pr.t).toBeCloseTo(1);
  });
});

describe('MOVEMENT.breath', () => {
  it('超过 dur 即结束喷吐', () => {
    const pr = makeProjectile({ t: 0 });
    (pr as any).dur = 0.6;

    expect(MOVEMENT.breath(pr, 0.5, player)).toBe(true);
    expect(MOVEMENT.breath(pr, 0.2, player)).toBe(false);
    expect(pr.dead).toBe(1);
  });
});

/* ---------------------------------------------------------
   acid —— 敌方弹，边界宽限带比 linear 窄
   --------------------------------------------------------- */

describe('MOVEMENT.acid', () => {
  it('正常飞行并消耗 life', () => {
    const pr = makeProjectile({ x: 400, y: 300, vx: 100, vy: 0, life: 2 });

    expect(MOVEMENT.acid(pr, 0.1, player)).toBe(true);
    expect(pr.x).toBeCloseTo(410);
    expect(pr.life).toBeCloseTo(1.9);
  });

  it('出界宽限带是 40px，比玩家弹的 50px 更紧', () => {
    const inside = makeProjectile({ x: 835, y: 300, vx: 0, vy: 0, life: 5 });
    const outside = makeProjectile({ x: 845, y: 300, vx: 0, vy: 0, life: 5 });

    expect(MOVEMENT.acid(inside, 0.016, player)).toBe(true);
    expect(MOVEMENT.acid(outside, 0.016, player)).toBe(false);
  });
});

/* ---------------------------------------------------------
   ground —— 唯一有副作用的运动：到期喷发并结算范围伤害
   --------------------------------------------------------- */

describe('MOVEMENT.ground', () => {
  beforeEach(() => {
    bindWorld();
  });

  it('延迟期内保持存活，不提前结算', () => {
    installPlayer();
    const target = makeDummy({ x: 0, y: 0 });
    spawnEnemies(target);
    buildSpatialGrid();

    const pr = makeProjectile({ x: 0, y: 0, r: 60, dmg: 100, t: 0 });
    (pr as any).delay = 0.8;

    expect(MOVEMENT.ground(pr, 0.5, player)).toBe(true);
    expect(target.hp).toBe(1e9);
  });

  it('到期喷发：回收自身并对半径内敌人造成伤害', () => {
    installPlayer();
    const near = makeDummy({ x: 30, y: 0 });
    const far = makeDummy({ x: 400, y: 0 });
    spawnEnemies(near, far);
    buildSpatialGrid();

    const pr = makeProjectile({ x: 0, y: 0, r: 60, dmg: 100, t: 0 });
    (pr as any).delay = 0.8;

    queueRandom(0.999);                  // 不暴击，伤害就是 100
    expect(MOVEMENT.ground(pr, 1, player)).toBe(false);

    expect(pr.dead).toBe(1);
    expect(1e9 - near.hp).toBe(100);
    expect(far.hp).toBe(1e9);
  });

  it('已死敌人不吃喷发伤害', () => {
    installPlayer();
    const corpse = makeDummy({ x: 10, y: 0 });
    corpse.dead = 1;
    spawnEnemies(corpse);
    buildSpatialGrid();

    const pr = makeProjectile({ x: 0, y: 0, r: 60, dmg: 100, t: 0 });
    (pr as any).delay = 0.1;

    MOVEMENT.ground(pr, 1, player);

    expect(corpse.hp).toBe(1e9);
  });

  it('无玩家时喷发不抛异常（切场景瞬间的边界）', () => {
    const pr = makeProjectile({ x: 0, y: 0, r: 60, dmg: 100, t: 0 });
    (pr as any).delay = 0.1;
    buildSpatialGrid();

    expect(() => MOVEMENT.ground(pr, 1, player)).not.toThrow();
  });
});
