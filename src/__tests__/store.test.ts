import { describe, it, expect } from 'vitest';
import { Store } from '../engine/core/store.js';

interface TestSlice {
  count: number;
  name: string;
  items: string[];
}

const INITIAL: TestSlice = {
  count: 0,
  name: 'test',
  items: [],
};

describe('Store', () => {
  it('should initialize with initial state', () => {
    const store = new Store<TestSlice>(INITIAL);
    expect(store.state.count).toBe(0);
    expect(store.state.name).toBe('test');
    expect(store.state.items).toEqual([]);
  });

  it('should update a single field via set()', () => {
    const store = new Store<TestSlice>(INITIAL);
    store.set('count', 42);
    expect(store.state.count).toBe(42);
    expect(store.state.name).toBe('test'); // unchanged
  });

  it('should allow chained set calls', () => {
    const store = new Store<TestSlice>(INITIAL);
    store.set('count', 1);
    store.set('name', 'updated');
    expect(store.state.count).toBe(1);
    expect(store.state.name).toBe('updated');
  });

  it('should return the updated value via get()', () => {
    const store = new Store<TestSlice>(INITIAL);
    store.set('count', 99);
    expect(store.get('count')).toBe(99);
  });

  it('should preserve unchanged fields', () => {
    const store = new Store<TestSlice>(INITIAL);
    store.set('name', 'hello');
    expect(store.state.count).toBe(0);
    expect(store.state.items).toEqual([]);
  });
});