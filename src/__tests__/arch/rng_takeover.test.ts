/* =========================================================
   不变量守卫 · 确定性随机必须真的生效
   ---------------------------------------------------------
   整套测试的确定性建立在「Math.random 在任何业务模块求值前被替换」
   之上。这个前提一旦被打破，症状极其阴险：测试不会报错，只是变成
   偶发性红 —— 概率分支回到抽奖，每次跑挂的用例都不一样。

   这里把前提本身钉成断言。哪天有人往 install.ts 顶部加了一条业务
   import，这条用例会立刻变红，而不是留给后人去 debug 玄学 flaky。
   ========================================================= */
import { describe, it, expect } from 'vitest';
import { RNG } from '../../engine/util/utils.js';
import { deterministicRandom, seedRng, queueRandom } from '../_harness/random.js';
/* 故意 import 一条业务链路：证明它先于本断言求值也不影响接管 */
import { sm } from '../../engine/core/states.js';

describe('确定性随机接管', () => {
  it('utils.RNG 捕获到的必须是确定性替身，而不是原生 Math.random', () => {
    expect(sm).toBeTruthy();
    expect(RNG).toBe(deterministicRandom);
    expect(Math.random).toBe(deterministicRandom);
  });

  it('queueRandom 能钉死业务侧 RNG 的返回值', () => {
    queueRandom(0.25, 0.75);
    expect(RNG()).toBe(0.25);
    expect(RNG()).toBe(0.75);
  });

  it('同一种子下序列完全可复现', () => {
    seedRng(1234);
    const a = [RNG(), RNG(), RNG()];
    seedRng(1234);
    const b = [RNG(), RNG(), RNG()];
    expect(a).toEqual(b);
  });

  it('序列本身分布正常，不是常量替身', () => {
    seedRng(7);
    const xs = Array.from({ length: 200 }, () => RNG());
    expect(new Set(xs).size).toBeGreaterThan(190);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
  });
});
