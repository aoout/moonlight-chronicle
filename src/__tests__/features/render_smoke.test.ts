/* =========================================================
   features/render · 绘制冒烟
   ---------------------------------------------------------
   渲染层不做像素快照 —— 那会把美术锁死，改一笔颜色就全红，
   维护成本远大于收益。这里守的是另一条线：

     「绘制指令的参数必须是有限数值、半径必须非负」

   这是渲染最阴的一类 bug：`ctx.arc(NaN, 0, 5)` 在真实 canvas 上
   不抛错、不告警、就是不画。玩家看到的是「某个怪偶尔没有身体」，
   而控制台干干净净。harness 的录制型 ctx 会把这类调用当场拦下。

   同时逐个走遍全部造型分支，保证新增敌人/Boss 时不会漏掉注册。
   ========================================================= */
import { describe, it, expect } from 'vitest';
import { drawEnemyBody, ENEMY_SHAPES } from '../../features/render/layers/enemies.js';
import { drawBossBody, BOSS_SHAPES } from '../../features/render/layers/bosses.js';
import { drawProjectiles } from '../../features/render/effects/projectiles.js';
import { createCanvasRecorder, makeEnemy, makeBoss, makeProjectile } from '../_harness/index.js';
import type { Projectile } from '../../types/core.d.ts';

const ENEMY_TYPES = [
  'grub', 'rat', 'armored', 'wing', 'charger', 'spitter',
  'splitter', 'shadow', 'giant', 'bomber', '_default',
];

const BOSS_TYPES = [
  'behemoth', 'tideMother', 'erodeChariot', 'lord', 'moonWraith',
  'moonSwordsman', 'dragon', 'stormOwl', 'abyssMother', 'final',
];

/** 敌人技能弹的各个专属分支 */
const PROJECTILE_CASES: Array<[string, Partial<Projectile>]> = [
  ['月刃', { enemy: true, vx: 100, vy: 0, r: 6, t: 0.3, color: '#ff9d6b', moonblade: true }],
  ['波纹', { enemy: true, vx: 100, vy: 0, r: 5, t: 0.3, color: '#5c8a9e', wave: true }],
  ['余烬', { enemy: true, vx: 100, vy: 0, r: 6, t: 0.3, color: '#ff9d6b', ember: true }],
  ['脉冲', { enemy: true, vx: 100, vy: 0, r: 6, t: 0.3, color: '#ffb84d', pulse: true }],
  ['法球', { enemy: true, vx: 0, vy: 0, r: 8, t: 0.3, color: '#9a86c8', orb: true }],
  ['毒雾', { enemy: true, aoe: true, vx: 0, vy: 0, r: 120, maxR: 360, t: 0.3, color: '#7fce5a', mist: true }],
  ['落雷', { ground: true, t: 0.4, delay: 0.8, r: 68, color: '#8f9aee', lightning: true }],
  ['蚀痕', { ground: true, t: 0.4, delay: 0.7, r: 44, color: '#ff7a7a', erode: true }],
  ['酸液', { acid: true, vx: 100, vy: 0, r: 5, color: '#7fce5a' }],
  ['蚀涎', { enemy: true, spit: true, x: 100, y: 100, vx: 180, vy: 0, r: 6, color: '#7fd6a4', t: 0.3 }],
] as unknown as Array<[string, Partial<Projectile>]>;

describe('敌人造型', () => {
  it.each(ENEMY_TYPES)('%s 的绘制参数全部合法', (type) => {
    const rec = createCanvasRecorder();
    const e = makeEnemy({ type, color: '#888', state: 'chase', stateT: 0.5, hp: 50, maxHp: 100 });

    expect(() => drawEnemyBody(rec.ctx, e, 10, 0, 0, 1, 0, 2.5)).not.toThrow();
    expect(rec.calls.length, `${type} 一笔都没画`).toBeGreaterThan(0);
  });

  it('残血 / 满血 / 受击闪白等状态都不产生非法参数', () => {
    const rec = createCanvasRecorder();

    for (const type of ENEMY_TYPES) {
      for (const hp of [100, 50, 1]) {
        for (const flash of [0, 1]) {
          const e = makeEnemy({ type, color: '#888', hp, maxHp: 100, flash, state: 'chase' });
          expect(() => drawEnemyBody(rec.ctx, e, 10, 0, 0, 1, 0, 2.5), `${type} hp=${hp} flash=${flash}`)
            .not.toThrow();
        }
      }
    }
  });

  it('ENEMY_SHAPES 覆盖了全部已知敌人类型', () => {
    const missing = ENEMY_TYPES.filter(t => t !== '_default' && !(t in ENEMY_SHAPES));
    expect(missing, `这些敌人没有造型：${missing.join(', ')}`).toEqual([]);
  });
});

describe('Boss 造型', () => {
  it.each(BOSS_TYPES)('%s 的绘制参数全部合法', (type) => {
    const rec = createCanvasRecorder();
    const b = makeBoss({ type, color: '#888', attT: 1, attCd: 3.4, hp: 500, maxHp: 500, state: 'chase' });

    expect(() => drawBossBody(rec.ctx, b, 30, 0, 0, 1, 2.5)).not.toThrow();
    expect(rec.calls.length, `${type} 一笔都没画`).toBeGreaterThan(0);
  });

  it('蓄力过程中的每一帧都合法（attT 从满到 0）', () => {
    const rec = createCanvasRecorder();

    for (const type of BOSS_TYPES) {
      for (const attT of [3.4, 2, 1, 0.2, 0]) {
        const b = makeBoss({ type, color: '#888', attT, attCd: 3.4, hp: 500, maxHp: 500 });
        expect(() => drawBossBody(rec.ctx, b, 30, 0, 0, 1, 2.5), `${type} attT=${attT}`).not.toThrow();
      }
    }
  });

  it('BOSS_SHAPES 覆盖了全部已知 Boss 类型', () => {
    const missing = BOSS_TYPES.filter(t => !(t in BOSS_SHAPES));
    expect(missing, `这些 Boss 没有造型：${missing.join(', ')}`).toEqual([]);
  });
});

describe('投射物特效', () => {
  it.each(PROJECTILE_CASES)('%s 弹的绘制参数全部合法', (_label, shape) => {
    const rec = createCanvasRecorder();
    const pr = makeProjectile(shape);

    expect(() => drawProjectiles({ ctx: rec.ctx, projectiles: [pr], player: null } as never)).not.toThrow();
  });

  it('生命周期各阶段（t 从 0 到过期）都不产生非法参数', () => {
    const rec = createCanvasRecorder();

    for (const [label, shape] of PROJECTILE_CASES) {
      for (const t of [0, 0.1, 0.5, 1, 2]) {
        const pr = makeProjectile({ ...shape, t });
        expect(() => drawProjectiles({ ctx: rec.ctx, projectiles: [pr], player: null } as never), `${label} t=${t}`)
          .not.toThrow();
      }
    }
  });

  it('空列表安全通过', () => {
    const rec = createCanvasRecorder();
    expect(() => drawProjectiles({ ctx: rec.ctx, projectiles: [], player: null } as never)).not.toThrow();
  });
});
