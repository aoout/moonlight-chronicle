/* =========================================================
   engine/util · 工具函数回归
   ---------------------------------------------------------
   覆盖 utils.ts 全部导出。该文件被引擎各层高频引用，
   覆盖率门禁对它单独设了阈值（statements 69%），
   缺一不可 —— 之前 distSq 无测试导致门禁不过。
   ========================================================= */
import { describe, it, expect, afterEach } from 'vitest';
import {
  RNG, dist, distSq, clamp, rand, pick, angTo,
} from '../../engine/util/utils.js';
import { queueRandom, pendingRandomCount, seedRng } from '../_harness/random.js';

afterEach(() => {
  seedRng(); // 复位确定性序列，避免用例间互扰
});

describe('dist / distSq', () => {
  it('dist 返回欧氏距离', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5, 9);
    expect(dist({ x: -2, y: -2 }, { x: 1, y: 2 })).toBeCloseTo(5, 9);
    expect(dist({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });

  it('distSq 返回平方距离（省去开方）', () => {
    expect(distSq({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
    expect(distSq({ x: 1, y: 2 }, { x: 4, y: 6 })).toBe(25);
    expect(distSq({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0);
  });
});

describe('clamp', () => {
  it('边界内原值返回', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-0.5, -1, 1)).toBe(-0.5);
  });

  it('超出范围钳到边界', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
  });
});

describe('rand / pick / RNG', () => {
  it('rand 在 [a, b) 区间内', () => {
    for (let i = 0; i < 100; i++) {
      const v = rand(10, 20);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThan(20);
    }
    // a === b 时恒等
    expect(rand(7, 7)).toBe(7);
  });

  it('rand 使用 RNG（可被种子接管）', () => {
    queueRandom(0.5);
    expect(rand(0, 100)).toBeCloseTo(50, 9);
    expect(pendingRandomCount()).toBe(0); // 队列被消费
  });

  it('pick 从数组中随机取一个元素', () => {
    queueRandom(0);
    expect(pick(['a', 'b', 'c'])).toBe('a');
    queueRandom(0.999);
    expect(pick(['a', 'b', 'c'])).toBe('c');
  });

  it('RNG 引用与 Math.random 同步（确定性夹具依赖此契约）', () => {
    expect(typeof RNG).toBe('function');
    queueRandom(0.123);
    expect(RNG()).toBe(0.123);
    expect(pendingRandomCount()).toBe(0);
  });
});

describe('angTo', () => {
  it('计算 a 指向 b 的角度', () => {
    // 正右方 → 0
    expect(angTo({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0, 9);
    // 正上方 → -PI/2（atan2 负 y）
    expect(angTo({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeCloseTo(-Math.PI / 2, 9);
    // 正下方 → +PI/2
    expect(angTo({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2, 9);
    // 左方 → ±PI
    const a = angTo({ x: 0, y: 0 }, { x: -1, y: 0 });
    expect(Math.abs(Math.abs(a) - Math.PI)).toBeLessThan(1e-9);
  });
});
