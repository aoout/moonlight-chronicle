import { describe, it, expect, vi } from 'vitest';

// Mock stage state for computeDerived
vi.mock('../state/stage.js', () => ({
  stageState: {
    state: { stage: 1 },
    get: (k: string) => k === 'stage' ? 1 : undefined,
    set: () => {},
  },
}));

import { computeDerived, xpNeeded } from '../domain/player.js';
import type { Player } from '../types/core.d.ts';

describe('xpNeeded', () => {
  it('should return correct XP for level 1', () => {
    // CONFIG: XP_PER_LEVEL=8, XP_GROWTH=1.22
    // xpNeeded(1) = round(8 * 1.22^0) = 8
    expect(xpNeeded(1)).toBe(8);
  });

  it('should return increasing XP for higher levels', () => {
    // xpNeeded(2) = round(8 * 1.22^1) = round(9.76) = 10
    expect(xpNeeded(2)).toBe(10);
    // xpNeeded(5) = round(8 * 1.22^4) = round(8 * 2.215) = round(17.72) = 18
    expect(xpNeeded(5)).toBe(18);
  });
});

describe('computeDerived', () => {
  it('should compute effAtk from base stats', () => {
    const p: any = {
      atk: 10, armor: 5, maxHp: 100, critRate: 0.1, level: 1, speed: 50,
      armorToAtk: 0, hpToAtk: 0, critToAtk: 0, scaleLevel: 0, scaleStage: 0,
      speedToCrit: 0, atkToSpd: 0, goldGain: 1, luck: 1, luckToGold: 0,
      atkSpd: 1, critDmg: 2,
    };
    computeDerived(p);
    // effAtk = 10 + 0 + 0 + 0 + 0 + 0 = 10
    expect(p.effAtk).toBe(10);
    // effCrit = min(0.9, 0.1 + 0) = 0.1
    expect(p.effCrit).toBe(0.1);
    // effSpeed = 50 + 0 = 50
    expect(p.effSpeed).toBe(50);
    // effGold = 1 + 0 = 1
    expect(p.effGold).toBe(1);
    // effAtkSpd = 1 * (1 + 0.1 * 0.3) = 1.03
    expect(p.effAtkSpd).toBeCloseTo(1.03);
  });

  it('should include conversion stats in effAtk', () => {
    const p: any = {
      atk: 10, armor: 5, maxHp: 100, critRate: 0.1, level: 3, speed: 50,
      armorToAtk: 0.5, hpToAtk: 0.05, critToAtk: 1.0, scaleLevel: 2, scaleStage: 0,
      speedToCrit: 0.1, atkToSpd: 0.2, goldGain: 1, luck: 1, luckToGold: 0,
      atkSpd: 1, critDmg: 2,
    };
    computeDerived(p);
    // effAtk = 10 + 5*0.5 + 100*0.05 + 0.1*1.0 + 3*2 + 0 = 10 + 2.5 + 5 + 0.1 + 6 = 23.6
    expect(p.effAtk).toBeCloseTo(23.6);
  });

  it('should cap effCrit at 0.9', () => {
    const p: any = {
      atk: 10, armor: 0, maxHp: 100, critRate: 0.85, level: 1, speed: 200,
      armorToAtk: 0, hpToAtk: 0, critToAtk: 0, scaleLevel: 0, scaleStage: 0,
      speedToCrit: 0.1, atkToSpd: 0, goldGain: 1, luck: 1, luckToGold: 0,
      atkSpd: 1, critDmg: 2,
    };
    computeDerived(p);
    // effCrit = min(0.9, 0.85 + 200*0.1/100) = min(0.9, 0.85 + 0.2) = min(0.9, 1.05) = 0.9
    expect(p.effCrit).toBe(0.9);
  });
});