import { describe, it, expect, beforeEach } from 'vitest';
import { erosionChance, erosionBonus, weaponDmg } from '../domain/erosion.js';
import { stageState } from '../state/stage.js';
import { playerState } from '../state/player.js';

function makePlayer(): any {
  return {
    level: 1, effAtk: 100, speed: 50, atkSpd: 1, maxHp: 1000,
    critDmg: 1.5, critRate: 0.05, effCrit: 0.05, armor: 0, armorToAtk: 0,
    hpToAtk: 0, critToAtk: 0, scaleLevel: 0, scaleStage: 0, speedToCrit: 0,
    atkToSpd: 0, goldGain: 1, luck: 1, luckToGold: 0, xpGain: 1, effAtkSpd: 1,
  };
}

describe('月蚀侵蚀机制', () => {
  beforeEach(() => {
    stageState.set('depth', 0);
    playerState.set('player', null);
  });

  it('侵蚀概率：深度 1 → 3%，深度 9 → 12%，线性插值', () => {
    expect(erosionChance(1)).toBeCloseTo(0.03);
    expect(erosionChance(9)).toBeCloseTo(0.12);
    expect(erosionChance(5)).toBeCloseTo(0.075);
    // 深度 0 线性外推
    expect(erosionChance(0)).toBeCloseTo(0.01875);
    // 越界钳制
    expect(erosionChance(99)).toBe(0.12);
    expect(erosionChance(-3)).toBe(0);
  });

  it('未侵蚀武器：伤害 = 基础公式，无额外加成', () => {
    const p = makePlayer();
    const w = { id: 'moonRing', lv: 1 };
    stageState.set('depth', 5);
    expect(weaponDmg(w, p)).toBeCloseTo(73); // 100*(0.55+0.12) + 50*0.12
  });

  it('侵蚀武器：伤害额外 +月蚀深度×(x+y×L)（加法）', () => {
    const p = makePlayer();
    const w = { id: 'moonRing', lv: 1, eroded: true };
    stageState.set('depth', 5);
    // moonRing 侵蚀系数 x=0.1, y=0.02 → 加成 5*(0.1+0.02) = 0.6
    expect(weaponDmg(w, p)).toBeCloseTo(73 + 0.6);
    // 深度越高加成越大
    stageState.set('depth', 9);
    expect(weaponDmg(w, p)).toBeCloseTo(73 + 9 * (0.1 + 0.02));
  });

  it('erosionBonus：未侵蚀为 0；侵蚀按深度与等级成长', () => {
    const w1 = { id: 'orbit', lv: 3, eroded: true };
    const w2 = { id: 'orbit', lv: 3 };
    stageState.set('depth', 7);
    // orbit 侵蚀系数 x=0.08, y=0.02
    expect(erosionBonus(w1)).toBeCloseTo(7 * (0.08 + 0.02 * 3));
    expect(erosionBonus(w2)).toBe(0);
  });
});
