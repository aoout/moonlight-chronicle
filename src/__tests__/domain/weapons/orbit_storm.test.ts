/* =========================================================
   domain/weapons · 环绕类武器的生命周期
   ---------------------------------------------------------
   原来这里挂了三个 vi.mock：
     ../render/effects/fx.js   → 路径已不存在（分层重构后是 platform/fx）
     ../audio/engine.js        → 同上（现为 platform/audio）
     ../domain/combat.js       → 注释说「依赖链会触达 window」

   前两个是解析不到的死路径，vi.mock 静默空转，等于没挡；
   第三个的前提也已经不成立 —— arch/layering_runtime 每次都会证明
   domain 层全量模块能在无 DOM 环境加载。

   所以这里一个 mock 都不留，跑的是真实的伤害/特效/音频链路。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { orbitTick } from '../../../domain/weapons/orbit.js';
import { stormTick } from '../../../domain/weapons/storm.js';
import { installPlayer, equip, makeEnemy, spawnEnemies, bindWorld } from '../../_harness/index.js';
import { buildSpatialGrid } from '../../../engine/spatial/SpatialSystem.js';
import { entityState } from '../../../state/entities.js';
import { WEAPONS } from '../../../config/index.js';
import type { Player } from '../../../types/core.d.ts';

const FRAME = 1 / 60;

beforeEach(() => { bindWorld(); });

/* ========== 环舞之刃 ========== */

describe('orbit · 环舞之刃', () => {
  it('装备后生成环绕月牙', () => {
    const p = equip(installPlayer(), 'orbit');
    orbitTick(FRAME);

    expect(p.effects.orbits!.length).toBeGreaterThan(0);
  });

  it('月牙数量随等级增加', () => {
    const p = equip(installPlayer(), { id: 'orbit', lv: 1 });
    orbitTick(FRAME);
    const atLv1 = p.effects.orbits!.length;

    p.weapons[0].lv = 5;
    orbitTick(FRAME);

    expect(p.effects.orbits!.length).toBeGreaterThan(atLv1);
  });

  it('月牙均匀分布在以玩家为心、area 缩放后的圆周上', () => {
    const p = equip(installPlayer({ x: 100, y: 200, area: 2 }), 'orbit');
    orbitTick(FRAME);

    const expectedR = ((WEAPONS.orbit as any).radius || 120) * 2;
    for (const o of p.effects.orbits!) {
      const d = Math.hypot(o.x - 100, o.y - 200);
      expect(d).toBeCloseTo(expectedR, 6);
    }
  });

  it('出售武器后下一帧清空月牙（不再残留在场上）', () => {
    const p = equip(installPlayer(), 'orbit');
    orbitTick(FRAME);
    expect(p.effects.orbits!.length).toBeGreaterThan(0);

    p.weapons = [];
    orbitTick(FRAME);

    expect(p.effects.orbits!).toEqual([]);
  });

  it('重新购买后月牙恢复', () => {
    const p = installPlayer();
    orbitTick(FRAME);
    expect(p.effects.orbits!).toEqual([]);

    equip(p, 'orbit');
    orbitTick(FRAME);

    expect(p.effects.orbits!.length).toBeGreaterThan(0);
  });

  it('无玩家时安全空转', () => {
    expect(() => orbitTick(FRAME)).not.toThrow();
  });

  it('月牙扫到敌人会造成伤害', () => {
    const p = equip(installPlayer({ x: 0, y: 0, area: 1 }), 'orbit');
    orbitTick(FRAME);
    const [first] = p.effects.orbits!;

    const target = makeEnemy({ x: first.x, y: first.y, hp: 1000, maxHp: 1000 });
    spawnEnemies(target);
    buildSpatialGrid();

    orbitTick(FRAME);

    expect(target.hp).toBeLessThan(1000);
  });

  it('同一敌人在冷却窗口内不会被同一帧重复打爆', () => {
    const p = equip(installPlayer({ x: 0, y: 0, area: 1 }), 'orbit');
    orbitTick(FRAME);
    const target = makeEnemy({ x: p.effects.orbits![0].x, y: p.effects.orbits![0].y, hp: 1e6, maxHp: 1e6 });
    spawnEnemies(target);
    buildSpatialGrid();

    orbitTick(FRAME);
    const afterFirst = target.hp;

    orbitTick(FRAME);   // 时间没推进，仍在 0.25s 冷却内
    expect(target.hp).toBe(afterFirst);
  });
});

/* ========== 风暴之眼 ========== */

describe('storm · 风暴之眼', () => {
  it('装备后生成风暴核心', () => {
    const p = equip(installPlayer(), 'storm');
    stormTick(FRAME);

    expect(p.effects.stormCores!.length).toBeGreaterThan(0);
  });

  it('核心数量取自配置，不随等级膨胀', () => {
    const p = equip(installPlayer(), { id: 'storm', lv: 1 });
    stormTick(FRAME);
    const cores = (WEAPONS.storm as any).cores || 2;
    expect(p.effects.stormCores!).toHaveLength(cores);

    p.weapons[0].lv = 9;
    stormTick(FRAME);
    expect(p.effects.stormCores!).toHaveLength(cores);
  });

  it('出售后下一帧清空核心', () => {
    const p = equip(installPlayer(), 'storm');
    stormTick(FRAME);
    expect(p.effects.stormCores!.length).toBeGreaterThan(0);

    p.weapons = [];
    stormTick(FRAME);

    expect(p.effects.stormCores!).toEqual([]);
  });

  it('首帧即开火，产出投射物', () => {
    equip(installPlayer(), 'storm');
    const before = entityState.state.projectiles.length;

    stormTick(FRAME);

    expect(entityState.state.projectiles.length).toBeGreaterThan(before);
  });

  it('开火后进入冷却，不会每帧都倾泻弹幕', () => {
    const p = equip(installPlayer(), 'storm');
    stormTick(FRAME);
    const afterFirst = entityState.state.projectiles.length;

    stormTick(FRAME);   // 冷却未走完
    expect(entityState.state.projectiles.length).toBe(afterFirst);

    // 把冷却直接推到 0，下一帧应当再次开火
    for (const k of Object.keys(p.effects.stormFireT!)) p.effects.stormFireT![k] = 0;
    stormTick(FRAME);
    expect(entityState.state.projectiles.length).toBeGreaterThan(afterFirst);
  });

  it('cdr 缩短开火间隔', () => {
    const read = (p: Player) => Object.values(p.effects.stormFireT!)[0] as number;

    const slow = equip(installPlayer({ cdr: 0 }), 'storm');
    stormTick(FRAME);
    const slowCd = read(slow);

    const fast = equip(installPlayer({ cdr: 0.5 }), 'storm');
    stormTick(FRAME);
    const fastCd = read(fast);

    expect(fastCd).toBeLessThan(slowCd);
  });

  it('无玩家时安全空转', () => {
    expect(() => stormTick(FRAME)).not.toThrow();
  });
});
