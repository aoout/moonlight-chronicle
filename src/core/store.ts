/* =========================================================
   蚀月远征 · Store 基类 & Derived 响应式派生
   支持状态切片、变更通知、批量更新、派生计算
   ========================================================= */

type Listener<T = any> = (value: T, old: T) => void;

/** 可观察对象接口（Store 或 DerivedStore 均实现） */
export interface Observable<T> {
  get(): T;
  subscribe(fn: (v: T) => void): () => void;
}

/** 可订阅的 Store 键 */
export class Store<T extends Record<string, any>> {
  private _state: T;
  private _listeners: Map<string, Set<Listener>> = new Map();

  constructor(initialState: T) {
    this._state = { ...initialState };
  }

  /** 读取整个状态快照 */
  get state(): T {
    return this._state;
  }

  /** 读取单个属性 */
  get<K extends keyof T>(key: K): T[K] {
    return this._state[key];
  }

  /** 设置单个属性并触发通知 */
  set<K extends keyof T>(key: K, value: T[K]): void {
    const old = this._state[key];
    if (old !== value) {
      this._state[key] = value;
      this._notify(key as string, value, old);
    }
  }

  /** 批量更新并触发通知 */
  patch(partial: Partial<T>): void {
    for (const [key, value] of Object.entries(partial)) {
      const old = (this._state as any)[key];
      if (old !== value) {
        (this._state as any)[key] = value;
        this._notify(key, value, old);
      }
    }
  }

  /** 订阅指定属性的变更 */
  on<K extends keyof T>(key: K, fn: Listener<T[K]>): () => void {
    const k = key as string;
    if (!this._listeners.has(k)) {
      this._listeners.set(k, new Set());
    }
    this._listeners.get(k)!.add(fn as Listener);
    return () => this._listeners.get(k)?.delete(fn as Listener);
  }

  /** 重置为初始状态 */
  reset(initialState: T): void {
    this._state = { ...initialState };
    this._listeners.clear();
  }

  private _notify(key: string, value: any, old: any): void {
    const listeners = this._listeners.get(key);
    if (listeners) {
      for (const fn of listeners) {
        fn(value, old);
      }
    }
  }
}

/**
 * 派生值：监听一个或多个 Store 的变更，自动重新计算
 * 返回 Observable 接口，可 .get() 读取或 .subscribe() 订阅
 */
/** 将 Store 的某个键包装为 Observable */
export function storeKey<T extends Record<string, any>, K extends keyof T>(store: Store<T>, key: K): Observable<T[K]> {
  return {
    get: () => store.get(key),
    subscribe: (fn: (v: T[K]) => void) => {
      fn(store.get(key));
      return store.on(key, fn as any);
    },
  };
}

/** 将 Store 的整个 state 包装为 Observable */
export function storeState<T extends Record<string, any>>(store: Store<T>): Observable<T> {
  return {
    get: () => store.state,
    subscribe: (fn: (v: T) => void) => {
      fn(store.state);
      // 订阅所有键的变更，重新通知整个 state
      const unsubs = Object.keys(store.state).map(k =>
        store.on(k, () => fn(store.state))
      );
      return () => unsubs.forEach(u => u());
    },
  };
}

/**
 * 派生值：监听一个或多个 Store 键的变更，自动重新计算
 * 返回 Observable 接口，可 .get() 读取或 .subscribe() 订阅
 */
export function derived<T>(stores: { subscribe: (fn: (v: any) => void) => () => void }[], compute: () => T): Observable<T> {
  let value = compute();
  const listeners = new Set<(v: T) => void>();
  const unsubs = stores.map(s => s.subscribe(() => {
    const next = compute();
    if (next !== value) {
      value = next;
      for (const fn of listeners) fn(value);
    }
  }));
  return {
    get: () => value,
    subscribe: (fn: (v: T) => void) => {
      listeners.add(fn);
      fn(value);
      return () => { listeners.delete(fn); };
    },
  };
}
