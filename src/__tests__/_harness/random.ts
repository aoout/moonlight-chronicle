/* =========================================================
   测试地基 · 确定性随机
   =========================================================

   为什么能零侵入接管：
   `engine/util/utils.ts` 里是 `export const RNG = Math.random`，
   这行在模块求值时捕获函数引用。只要在任何业务模块被 import 之前
   （即 vitest 的 setupFiles 阶段）替换掉 `Math.random`，
   RNG 以及全部 34 处直接调用 `Math.random()` 的地方就都指向了这里。
   生产代码一行不用改。

   默认所有测试都跑在确定性序列上 —— 随机的测试不是测试，是抽奖。
   ========================================================= */

const DEFAULT_SEED = 0x9e3779b9;

let _state = DEFAULT_SEED | 0;
let _queue: number[] = [];

/** mulberry32：体积小、周期足够、分布均匀 */
function mulberry32(): number {
  _state = (_state + 0x6d2b79f5) | 0;
  let t = _state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** 装到 globalThis.Math.random 上的替身 */
export function deterministicRandom(): number {
  if (_queue.length > 0) return _queue.shift()!;
  return mulberry32();
}

/** 重置随机序列。每个用例前自动调用，因此用例之间互不影响。 */
export function seedRng(seed: number = DEFAULT_SEED): void {
  _state = seed | 0;
  _queue = [];
}

/**
 * 让接下来的 N 次随机调用依次返回给定值，用完自动回落到种子序列。
 *
 * 这是测试概率分支的正道：想验证暴击就 `queueRandom(0)`，
 * 想验证不暴击就 `queueRandom(0.999)`，不必反复跑一万次碰运气。
 *
 *   queueRandom(0);        // 下一次 Math.random() → 0，必定触发暴击
 *   queueRandom(0.99, 0);  // 第一次不暴击、第二次暴击
 */
export function queueRandom(...values: number[]): void {
  _queue.push(...values);
}

/** 队列里还剩几个未被消费的值 —— 可用来断言「随机确实被调用了预期次数」 */
export function pendingRandomCount(): number {
  return _queue.length;
}

/** 在指定种子下执行一段逻辑，结束后恢复原种子状态 */
export function withSeed<T>(seed: number, fn: () => T): T {
  const savedState = _state;
  const savedQueue = _queue;
  seedRng(seed);
  try {
    return fn();
  } finally {
    _state = savedState;
    _queue = savedQueue;
  }
}
