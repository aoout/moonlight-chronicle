/* =========================================================
   domain/erosion · 月蚀侵蚀机制
   ---------------------------------------------------------
   侵蚀是「加法」加成，这一点是设计上的硬约束：写成乘法会在深层
   指数爆炸。所以这里不止验证数值对不对，还验证它对基础伤害的
   影响确实是可加的、与武器等级线性相关的。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { erosionChance, rollErosion, erosionBonus, weaponDmg } from '../../../domain/erosion.js';
import { WEAPONS } from '../../../config/index.js';
import { stageState } from '../../../state/stage.js';
import { makePlayer, queueRandom } from '../../_harness/index.js';
import type { Player, WeaponInstance } from '../../../types/core.d.ts';

/**
 * 一个数值可控的玩家：effAtk 钉成 100、speed 钉成 50，
 * 让武器伤害公式的期望值能手算出来。
 *
 * 直接改 effAtk 是刻意的 —— computeDerived 的转换公式已经在
 * domain/player.test.ts 里覆盖过了，这里要隔离的是侵蚀本身。
 */
function scaledPlayer(): Player {
  const p = makePlayer({ speed: 50 });
  p.effAtk = 100;
  return p;
}

const w = (id: string, lv = 1, eroded = false): WeaponInstance =>
  ({ id, lv, ...(eroded ? { eroded: true } : {}) }) as WeaponInstance;

beforeEach(() => {
  stageState.set('depth', 0);
});

describe('erosionChance · 概率曲线', () => {
  it('深度 1 → 3%，深度 9 → 12%，中间线性插值', () => {
    expect(erosionChance(1)).toBeCloseTo(0.03);
    expect(erosionChance(5)).toBeCloseTo(0.075);
    expect(erosionChance(9)).toBeCloseTo(0.12);
  });

  it('深度 0 按同一条直线外推，不做特判', () => {
    expect(erosionChance(0)).toBeCloseTo(0.01875);
  });

  it('两端钳制：上不破 12%，下不破 0', () => {
    expect(erosionChance(99)).toBe(0.12);
    expect(erosionChance(-3)).toBe(0);
  });

  it('全深度区间单调不减', () => {
    let prev = -1;
    for (let d = 0; d <= 9; d++) {
      const c = erosionChance(d);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
});

describe('rollErosion · 掷骰', () => {
  it('掷点低于概率则侵蚀', () => {
    queueRandom(0.02);
    expect(rollErosion(1)).toBe(true);           // 0.02 < 0.03
  });

  it('掷点高于概率则不侵蚀', () => {
    queueRandom(0.05);
    expect(rollErosion(1)).toBe(false);          // 0.05 > 0.03
  });

  it('深度提高会把原本不中的掷点变成中', () => {
    queueRandom(0.05, 0.05);
    expect(rollErosion(1)).toBe(false);
    expect(rollErosion(9)).toBe(true);
  });
});

describe('erosionBonus · 加成数值', () => {
  it('未侵蚀恒为 0', () => {
    stageState.set('depth', 7);
    expect(erosionBonus(w('orbit', 3))).toBe(0);
  });

  it('侵蚀按 深度 ×(x + y×等级) 计算', () => {
    stageState.set('depth', 7);
    const { x, y } = WEAPONS.orbit.erosion!;
    expect(erosionBonus(w('orbit', 3, true))).toBeCloseTo(7 * (x + y * 3));
  });

  it('深度为 0 时侵蚀也没有收益', () => {
    stageState.set('depth', 0);
    expect(erosionBonus(w('orbit', 3, true))).toBe(0);
  });

  it('等级越高加成越大（y 项线性成长）', () => {
    stageState.set('depth', 5);
    const lv1 = erosionBonus(w('orbit', 1, true));
    const lv5 = erosionBonus(w('orbit', 5, true));
    expect(lv5).toBeGreaterThan(lv1);
  });

  it('未知武器 id 安全返回 0，不抛异常', () => {
    stageState.set('depth', 5);
    expect(erosionBonus(w('不存在的武器', 1, true))).toBe(0);
  });
});

describe('weaponDmg · 与基础伤害的合成', () => {
  it('未侵蚀时就是武器自身的伤害公式', () => {
    const p = scaledPlayer();
    stageState.set('depth', 5);

    const expected = WEAPONS.moonRing.dmg(p, 1, 5);
    expect(weaponDmg(w('moonRing', 1), p)).toBeCloseTo(expected);
  });

  it('侵蚀加成是加法叠加，不放大基础伤害', () => {
    const p = scaledPlayer();
    stageState.set('depth', 5);

    const base = weaponDmg(w('moonRing', 1), p);
    const eroded = weaponDmg(w('moonRing', 1, true), p);
    const { x, y } = WEAPONS.moonRing.erosion!;

    expect(eroded - base).toBeCloseTo(5 * (x + y * 1));
  });

  it('深度加深只影响加成项的大小，差值随深度线性增长', () => {
    const p = scaledPlayer();
    const { x, y } = WEAPONS.moonRing.erosion!;

    stageState.set('depth', 5);
    const d5 = weaponDmg(w('moonRing', 1, true), p) - weaponDmg(w('moonRing', 1), p);
    stageState.set('depth', 9);
    const d9 = weaponDmg(w('moonRing', 1, true), p) - weaponDmg(w('moonRing', 1), p);

    expect(d5).toBeCloseTo(5 * (x + y));
    expect(d9).toBeCloseTo(9 * (x + y));
  });

  it('未知武器 id 返回 0 而不是 NaN', () => {
    const p = scaledPlayer();
    expect(weaponDmg(w('不存在的武器'), p)).toBe(0);
  });

  it('全部武器在满深度满等级下都能算出有限正数（配置完整性）', () => {
    const p = scaledPlayer();
    stageState.set('depth', 9);

    for (const id of Object.keys(WEAPONS)) {
      const dmg = weaponDmg(w(id, 10, true), p);
      expect(Number.isFinite(dmg), `${id} 伤害不是有限数`).toBe(true);
      expect(dmg, `${id} 伤害非正`).toBeGreaterThan(0);
    }
  });
});
