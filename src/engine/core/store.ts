/* =========================================================
   蚀月远征 · Store 基类
   支持状态切片、变更通知、批量更新
   ========================================================= */

type Listener<T = any> = (value: T, old: T) => void;

/** 可订阅的状态容器 */
export class Store<T extends Record<string, any>> {
  private _state: T;
  private _listeners: Map<string, Set<Listener>> = new Map();

  constructor(initialState: T) {
    this._state = { ...initialState };
  }

  /** 读取整个状态快照（返回浅拷贝，防止外部直接修改绕过通知） */
  get state(): T {
    return { ...this._state };
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
