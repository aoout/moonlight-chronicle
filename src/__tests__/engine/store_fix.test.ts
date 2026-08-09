/* =========================================================
   engine/store · 批量通知 & reset 通知修复
   ---------------------------------------------------------
   覆盖 patch 批量更新后的通知行为、reset 的通知触发条件。
   ========================================================= */
import { describe, it, expect, vi } from 'vitest';
import { Store } from '../../engine/core/store.js';

describe('Store · patch 批量通知', () => {
  it('patch 批量更新后监听器只收到一次通知，且看到的是最终状态', () => {
    const s = new Store({ a: 1, b: 2 });
    const seenA: Array<{ value: number; stateB: number }> = [];
    s.on('a', (v) => {
      // 在 a 的回调里读 b —— 应该看到最终的 b 值，而不是旧值
      seenA.push({ value: v, stateB: s.get('b') });
    });
    s.patch({ a: 10, b: 20 });
    // 只收到一次通知
    expect(seenA).toHaveLength(1);
    // 看到的是最终状态
    expect(seenA[0]).toEqual({ value: 10, stateB: 20 });
  });
});

describe('Store · reset 通知行为', () => {
  it('reset 后监听器收到通知（使用 spy 验证）', () => {
    const s = new Store({ n: 0 });
    s.set('n', 5);                           // 改变状态，使 reset 时新旧值不同
    const fn = vi.fn();
    s.on('n', fn);
    s.reset();
    expect(fn).toHaveBeenCalledTimes(1);
    // 验证恢复为初始值
    expect(fn).toHaveBeenCalledWith(0, 5);
  });

  it('reset 时旧值与新值不同时才触发通知', () => {
    const s = new Store({ n: 5 });
    // 先改到 10，再改回 5，让当前状态与初始状态一致
    s.set('n', 10);
    s.set('n', 5);
    const fn = vi.fn();
    s.on('n', fn);
    s.reset();                                // 新旧值相同，不应通知
    expect(fn).not.toHaveBeenCalled();
  });

  it('reset 多个 key 时只通知有变化的 key', () => {
    const s = new Store({ a: 1, b: 2, c: 3 });
    s.set('a', 10);                           // 改变 a
    s.set('b', 20);                           // 改变 b
    // 改回 a，让 a 与初始值一致
    s.set('a', 1);
    const fnA = vi.fn(), fnB = vi.fn(), fnC = vi.fn();
    s.on('a', fnA);
    s.on('b', fnB);
    s.on('c', fnC);
    s.reset();
    // a 已恢复为初始值，不通知
    expect(fnA).not.toHaveBeenCalled();
    // b 从 20 变回 2，通知
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(fnB).toHaveBeenCalledWith(2, 20);
    // c 未变过，c 的旧值 3 === 新值 3，不通知
    expect(fnC).not.toHaveBeenCalled();
  });
});