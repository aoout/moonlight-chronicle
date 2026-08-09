/* =========================================================
   config/blessings · luckWeight luck=0 修复
   ---------------------------------------------------------
   覆盖 luckWeight 中 luck=0 时返回 weight * 1 的修复行为。
   ========================================================= */
import { describe, it, expect } from 'vitest';
import { luckWeight } from '../../config/blessings.js';

describe('luckWeight · luck=0 修复', () => {
  it('luckWeight 当 luck=0 时返回 weight * 1', () => {
    // common 不受 luck 影响
    expect(luckWeight(10, 'common', 0)).toBe(10);
    // epic: weight * (1 + 0) = weight
    expect(luckWeight(10, 'epic', 0)).toBe(10);
    // legend: weight * (1 + 0*2) = weight
    expect(luckWeight(10, 'legend', 0)).toBe(10);
  });

  it('luckWeight 当 luck=1 时正常返回', () => {
    // common 始终不变
    expect(luckWeight(10, 'common', 1)).toBe(10);
    // epic: 10 * (1 + 1) = 20
    expect(luckWeight(10, 'epic', 1)).toBe(20);
    // legend: 10 * (1 + 1*2) = 30
    expect(luckWeight(10, 'legend', 1)).toBe(30);
  });

  it('luckWeight 当 luck 为负数时钳位到 0', () => {
    expect(luckWeight(10, 'epic', -1)).toBe(10);
    expect(luckWeight(10, 'legend', -5)).toBe(10);
  });

  it('luckWeight 当 tier 为 common 时始终返回原值', () => {
    expect(luckWeight(10, 'common', 999)).toBe(10);
    expect(luckWeight(10, 'common', 0)).toBe(10);
  });
});