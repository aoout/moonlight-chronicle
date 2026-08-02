import { describe, it, expect, vi, beforeEach } from 'vitest';

// 模拟 DOM
globalThis.document = { createElement: () => ({ getContext: () => null }) } as any;

// 模拟 utils.js 中的 RNG 以控制随机性
vi.mock('../utils.js', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    RNG: vi.fn(() => 0.5), // 始终返回 0.5，避免随机触发暴击
  };
});

// 模拟 game.js 以避免系统初始化副作用
vi.mock('../game.js', () => ({ startStage: vi.fn() }));
vi.mock('../save.js', () => ({ persistUnlocked: vi.fn() }));

// 现在可以安全导入
import { calcDamage } from '../systems/CombatSystem.js';
import { statsState } from '../state/stats.js';

describe('calcDamage', () => {
  let player: any;

  beforeEach(() => {
    player = {
      x: 0, y: 0, r: 16,
      hp: 100, maxHp: 100,
      effAtk: 10, effCrit: 0, critDmg: 2,
      fullHpCrit: 0, lowHpDmg: 0,
      armor: 0, dodge: 0, thorns: 0,
      lifesteal: 0, boom: 0, area: 1,
      invuln: 0, _horde: 0, _splash: 0,
      _critBoom: 0, _shield: 0, _oath: 0,
      _nearDeath: 0, _tideRegen: 0, _devour: 0,
      _hunt: 0, _goldMeteor: 0, _cloak: 0,
      onKillHp: 0, luck: 1,
    };
    statsState.state.runStats.totalDmg = 0;
    statsState.state.runStats.wDmg = {};
  });

  it('should return base damage without crit', () => {
    const result = calcDamage(50, player);
    expect(result.dmg).toBe(50);
    expect(result.crit).toBe(false);
  });

  it('should apply crit damage when crit procs (effCrit=1)', () => {
    player.effCrit = 1; // RNG(0.5) < 1 = true
    const result = calcDamage(50, player);
    expect(result.crit).toBe(true);
    expect(result.dmg).toBe(100); // 50 * 2
  });

  it('should apply low health damage bonus', () => {
    player.hp = 20;
    player.maxHp = 100;
    player.lowHpDmg = 0.3;
    // effCrit=0, RNG(0.5) < 0 = false, 所以不会暴击
    const result = calcDamage(50, player);
    expect(result.dmg).toBe(65); // 50 * 1.3
  });

  it('should stack crit and low health bonus', () => {
    player.effCrit = 1;
    player.hp = 20;
    player.maxHp = 100;
    player.lowHpDmg = 0.3;
    const result = calcDamage(50, player);
    expect(result.crit).toBe(true);
    expect(result.dmg).toBe(130); // 50 * 2 * 1.3
  });

  it('should not crit when effCrit is 0', () => {
    player.effCrit = 0;
    const result = calcDamage(50, player);
    expect(result.crit).toBe(false);
    expect(result.dmg).toBe(50);
  });

  it('should handle zero base damage', () => {
    const result = calcDamage(0, player);
    expect(result.dmg).toBe(0);
    expect(result.crit).toBe(false);
  });
});
