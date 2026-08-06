/* =========================================================
   domain/weapons · 霜华之环减速生效
   ---------------------------------------------------------
   回归测试：aoe 投射物类型此前 onHit 只有 ['damage']，
   createFlags 设置了 slow 字段但 ON_HIT.slow 从未被引用，
   导致霜华之环的减速 0.4 从未生效。修复后 aoe 类型 onHit
   加入 'slow'，此处验证行为：命中敌人会施加减速。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { projTick } from '../../../domain/weapons/index.js';
import { installPlayer, makeEnemy, spawnEnemies, bindWorld } from '../../_harness/index.js';
import { buildSpatialGrid } from '../../../engine/spatial/SpatialSystem.js';
import { world } from '../../../engine/ecs/World.js';
import type { Player, Projectile } from '../../../types/core.d.ts';

const FRAME = 1 / 60;

function install(): Player {
  return installPlayer({ x: 0, y: 0 });
}

/** 构造一发 frost 的 aoe 投射物（与 weapons.json frost.fire 配置对齐） */
function spawnFrostAoe(): Projectile {
  const pr = world.add('projectiles', {
    x: 0, y: 0, vx: 0, vy: 0,
    r: 0, dmg: 10, pierce: 0, color: '#7fd6e4',
    hit: new Set(), wId: 'frost',
    aoe: 1, maxR: 200, slow: 0.4, life: 2, speed: 0, range: 0,
  });
  buildSpatialGrid();
  return pr;
}

beforeEach(() => { bindWorld(); });

describe('frost · 霜华之环减速', () => {
  it('aoe 命中敌人施加 slow 字段（回归：减速从未生效）', () => {
    install();
    const target = makeEnemy({ x: 0, y: 0, hp: 1000, maxHp: 1000 });
    spawnEnemies(target);
    const pr = spawnFrostAoe();

    // 推进几帧，让 aoe 半径扩展到覆盖敌人并命中
    for (let i = 0; i < 10; i++) projTick(pr, FRAME);

    expect(target.slow).toBeGreaterThanOrEqual(0.4);
  });

  it('减速强度取 slow 与已有值中的较大者（不覆盖更强减速）', () => {
    install();
    const target = makeEnemy({ x: 0, y: 0, hp: 1000, maxHp: 1000, slow: 0.6 });
    spawnEnemies(target);
    const pr = spawnFrostAoe();

    for (let i = 0; i < 10; i++) projTick(pr, FRAME);

    expect(target.slow).toBe(0.6);   // 已有更强减速不被覆盖
  });

  it('未配置 slow 的 aoe 投射物不施加减速', () => {
    install();
    const target = makeEnemy({ x: 0, y: 0, hp: 1000, maxHp: 1000 });
    spawnEnemies(target);
    const pr = world.add('projectiles', {
      x: 0, y: 0, vx: 0, vy: 0,
      r: 0, dmg: 10, pierce: 0, color: '#fff',
      hit: new Set(), wId: 'other',
      aoe: 1, maxR: 200, life: 2, speed: 0, range: 0,
    });
    buildSpatialGrid();

    for (let i = 0; i < 10; i++) projTick(pr, FRAME);

    expect(target.slow).toBe(0);
  });

  it('无玩家时安全空转', () => {
    const pr = spawnFrostAoe();
    expect(() => projTick(pr, FRAME)).not.toThrow();
  });
});
