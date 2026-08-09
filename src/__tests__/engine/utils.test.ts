/* =========================================================
   engine/util · 工具函数回归
   ---------------------------------------------------------
   覆盖 utils.ts 全部导出。该文件被引擎各层高频引用，
   覆盖率门禁对它单独设了阈值（statements 69%），
   缺一不可 —— 之前 distSq 无测试导致门禁不过。
   ========================================================= */
import { describe, it, expect, afterEach } from 'vitest';
import {
  RNG, dist, distSq, clamp, rand, pick, angTo, TAU, HALF_PI, tickCooldown,
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

  it('pick 从空数组抛出错误', () => {
    expect(() => pick([])).toThrow('pick from empty array');
  });

  it('pick 从非空数组正常返回元素', () => {
    queueRandom(0);
    expect(pick(['a', 'b', 'c'])).toBe('a');
    queueRandom(0.5);
    expect(pick(['x'])).toBe('x');
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

describe('TAU / HALF_PI', () => {
  it('TAU 等于 2π（统一 6.28 类字面量）', () => {
    expect(TAU).toBeCloseTo(Math.PI * 2, 12);
    expect(TAU).toBeCloseTo(6.2831853, 6);
  });

  it('HALF_PI 等于 π/2（统一 1.57 类字面量）', () => {
    expect(HALF_PI).toBeCloseTo(Math.PI / 2, 12);
    expect(HALF_PI).toBeCloseTo(1.5707963, 6);
  });
});

describe('tickCooldown', () => {
  it('未到点：递减并返回 fired=false', () => {
    const r = tickCooldown(5, 10, 2);
    expect(r.t).toBeCloseTo(3, 9);
    expect(r.fired).toBe(false);
  });

  it('首次调用（undefined）从 interval 起算', () => {
    const r = tickCooldown(undefined, 10, 2);
    expect(r.t).toBeCloseTo(8, 9);
    expect(r.fired).toBe(false);
  });

  it('到点：重置为 interval 并返回 fired=true', () => {
    const r = tickCooldown(1.5, 10, 2);
    expect(r.t).toBe(10);
    expect(r.fired).toBe(true);
  });

  it('连续调用形成周期性触发', () => {
    // 模拟 10 帧：interval=5, dt=1，第 5 帧与第 10 帧触发
    const fires: number[] = [];
    let t: number | undefined;
    for (let i = 1; i <= 10; i++) {
      const r = tickCooldown(t, 5, 1);
      t = r.t;
      if (r.fired) fires.push(i);
    }
    expect(fires).toEqual([5, 10]);
  });

  it('cur=0 时视为已到点，立即触发并重置（?? 修复）', () => {
    const r = tickCooldown(0, 10, 2);
    // 0 ?? interval → 0（?? 不把 0 当 nullish），
    // t = 0 - 2 = -2 ≤ 0 → fired=true, t=interval
    expect(r.t).toBe(10);
    expect(r.fired).toBe(true);
  });
});
