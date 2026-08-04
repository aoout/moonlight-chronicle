import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 掉特效、音频与战斗副作用，聚焦状态清理逻辑
vi.mock('../render/effects/fx.js', () => ({
  addFx: vi.fn(), spawnSpark: vi.fn(), spawnGlow: vi.fn(), spawnShard: vi.fn(),
  spawnBurst: vi.fn(), spawnRing: vi.fn(), spawnStar: vi.fn(), spawnStreak: vi.fn(),
  spawnImpact: vi.fn(), spawnHitFx: vi.fn(),
}));
vi.mock('../audio/engine.js', () => ({
  AudioEngine: { playSfx: vi.fn() },
}));
// combat.js 依赖链会触达 game.ts（→render→debug/panel 访问 window），在 node 环境不可用
vi.mock('../domain/combat.js', () => ({
  damageEnemy: vi.fn(),
}));

import { orbitTick } from '../weapons/orbit.js';
import { stormTick } from '../weapons/storm.js';
import { playerState } from '../state/player.js';
import { stageState } from '../state/stage.js';

function makePlayer(weaponIds: string[]): any {
  return {
    x: 0, y: 0, r: 10, area: 1, cdr: 0, pierce: 0, projCount: 0,
    effAtk: 10, effCrit: 0.1, speed: 50, atkSpd: 1,
    weapons: weaponIds.map(id => ({ id, lv: 1 })),
    effects: {},
  };
}

describe('武器出售后清除残留特效状态', () => {
  // 前提：OrbitSystem / StormSystem 无条件注册且每帧调用 tick
  //（见 systems/index.ts），因此出售武器后下一帧 tick 即清空残留。
  beforeEach(() => {
    playerState.set('player', null);
    stageState.set('time', 0);
  });

  it('orbit：移除环舞之刃后清空 orbits（月牙不再残留）', () => {
    const p = makePlayer(['orbit']);
    playerState.set('player', p);
    orbitTick(1 / 60);
    expect(p.effects.orbits.length).toBeGreaterThan(0);
    // 卖掉武器（从 weapons 中移除）
    p.weapons = [];
    orbitTick(1 / 60);
    expect(p.effects.orbits.length).toBe(0);
  });

  it('storm：移除风暴之眼后清空 stormCores（风暴核心不再残留）', () => {
    const p = makePlayer(['storm']);
    playerState.set('player', p);
    stormTick(1 / 60);
    expect(p.effects.stormCores.length).toBeGreaterThan(0);
    // 卖掉武器
    p.weapons = [];
    stormTick(1 / 60);
    expect(p.effects.stormCores.length).toBe(0);
  });

  it('orbit：重新购买后 orbits 恢复', () => {
    const p = makePlayer([]);
    playerState.set('player', p);
    orbitTick(1 / 60);
    expect(p.effects.orbits.length).toBe(0);
    // 重新购买
    p.weapons = [{ id: 'orbit', lv: 1 }];
    orbitTick(1 / 60);
    expect(p.effects.orbits.length).toBeGreaterThan(0);
  });
});
