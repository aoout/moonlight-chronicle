/* =========================================================
   config · refillPrice 涨潮补货价格曲线
   ========================================================= */
import { describe, it, expect } from 'vitest';
import { refillPrice } from '../../config/index.js';

describe('refillPrice（涨潮补货价格曲线）', () => {
  it('首次刷新为基础价 2 金', () => {
    expect(refillPrice(1)).toBe(2);
  });

  it('逐次单调上涨', () => {
    let prev = 0;
    for (let n = 1; n <= 10; n++) {
      const p = refillPrice(n);
      expect(p).toBeGreaterThan(prev);
      prev = p;
    }
  });

  it('比线性快：P(n) > 2n（n≥2）', () => {
    for (let n = 2; n <= 8; n++) {
      expect(refillPrice(n)).toBeGreaterThan(2 * n);
    }
  });

  it('前几次温和（2/6/10/16/22），不劝退但逐次加压', () => {
    expect(refillPrice(2)).toBe(6);
    expect(refillPrice(3)).toBe(10);
    expect(refillPrice(4)).toBe(16);
    expect(refillPrice(5)).toBe(22);
  });

  it('参数小于 1 时按 1 处理（防脏数据）', () => {
    expect(refillPrice(0)).toBe(2);
    expect(refillPrice(-3)).toBe(2);
  });
});
