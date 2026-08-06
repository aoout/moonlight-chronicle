import { describe, it, expect, vi } from 'vitest';
import { Store } from '../../engine/core/store.js';

describe('Store · 读写与通知', () => {
  it('构造后可读回初始值', () => {
    const s = new Store({ a: 1, b: 'x' });
    expect(s.get('a')).toBe(1);
    expect(s.get('b')).toBe('x');
  });

  it('set 变更时通知订阅者并携带新旧值', () => {
    const s = new Store({ n: 0 });
    const seen: Array<[number, number]> = [];
    s.on('n', (v, old) => seen.push([v, old]));
    s.set('n', 1);
    s.set('n', 2);
    expect(seen).toEqual([[1, 0], [2, 1]]);
  });

  it('set 相同值时不通知（避免无谓重渲染）', () => {
    const s = new Store({ n: 1 });
    const fn = vi.fn();
    s.on('n', fn);
    s.set('n', 1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('on 返回的函数可退订', () => {
    const s = new Store({ n: 0 });
    const fn = vi.fn();
    const off = s.on('n', fn);
    s.set('n', 1);
    off();
    s.set('n', 2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('patch 批量更新，逐键通知，未变更的键不通知', () => {
    const s = new Store({ a: 1, b: 2, c: 3 });
    const hitA = vi.fn(), hitB = vi.fn(), hitC = vi.fn();
    s.on('a', hitA); s.on('b', hitB); s.on('c', hitC);
    s.patch({ a: 10, b: 2, c: 30 });
    expect(hitA).toHaveBeenCalledTimes(1);
    expect(hitB).not.toHaveBeenCalled();
    expect(hitC).toHaveBeenCalledTimes(1);
    expect(s.state).toEqual({ a: 10, b: 2, c: 30 });
  });

  it('state 返回快照，改快照不影响内部状态', () => {
    const s = new Store({ a: 1 });
    const snap = s.state;
    snap.a = 999;
    expect(s.get('a')).toBe(1);
  });
});

describe('Store · 初始状态隔离（回归：嵌套引用泄漏）', () => {
  it('通过 state 拿到的数组不是构造入参持有的同一个数组', () => {
    // 曾经的缺陷：构造函数只做 { ...initialState } 浅拷贝，
    // 导致 store.state.list === INITIAL.list，运行时 push 会污染模块级常量，
    // 使得后续任何「重置」都拿回被污染的数据。
    const INITIAL = { list: [] as number[] };
    const s = new Store(INITIAL);
    s.state.list.push(1);
    expect(INITIAL.list).toEqual([]);
  });

  it('嵌套两层的纯对象同样隔离', () => {
    const INITIAL = { stats: { total: 0, byId: {} as Record<string, number> } };
    const s = new Store(INITIAL);
    s.state.stats.byId.sword = 50;
    s.state.stats.total = 50;
    expect(INITIAL.stats.byId).toEqual({});
    expect(INITIAL.stats.total).toBe(0);
  });

  it('非纯对象（类实例 / DOM 引用）按引用保留，不做克隆', () => {
    class Ctx { id = 1; }
    const ctx = new Ctx();
    const s = new Store({ ctx, fn: () => 42 });
    expect(s.get('ctx')).toBe(ctx);
    expect(s.get('fn')()).toBe(42);
  });
});

describe('Store · reset', () => {
  it('无参 reset 回到构造时的初始状态', () => {
    const s = new Store({ a: 1, b: 2 });
    s.patch({ a: 100, b: 200 });
    s.reset();
    expect(s.state).toEqual({ a: 1, b: 2 });
  });

  it('reset 可带覆盖值', () => {
    const s = new Store({ a: 1, b: 2 });
    s.set('a', 100);
    s.reset({ b: 99 });
    expect(s.state).toEqual({ a: 1, b: 99 });
  });

  it('reset 后嵌套结构仍是全新副本（可反复重置）', () => {
    const s = new Store({ list: [] as number[] });
    s.state.list.push(1, 2, 3);
    s.reset();
    expect(s.get('list')).toEqual([]);
    s.state.list.push(9);
    s.reset();
    expect(s.get('list')).toEqual([]);
  });

  it('reset 不会清空监听器（重置状态不等于退订所有人）', () => {
    const s = new Store({ n: 0 });
    const fn = vi.fn();
    s.on('n', fn);
    s.reset();
    s.set('n', 5);
    expect(fn).toHaveBeenCalledWith(5, 0);
  });

  it('clearListeners 显式退订全部', () => {
    const s = new Store({ n: 0 });
    const fn = vi.fn();
    s.on('n', fn);
    s.clearListeners();
    s.set('n', 5);
    expect(fn).not.toHaveBeenCalled();
  });
});
