/* =========================================================
   蚀月远征 · Store 基类
   支持状态切片、变更通知、批量更新
   ========================================================= */

/**
 * @template T
 */
export class Store {
  /** @param {T} initialState */
  constructor(initialState) {
    /** @type {T} */
    this._state = { ...initialState };
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /** 读取整个状态快照 */
  get state() {
    return this._state;
  }

  /** 读取单个属性 */
  get(key) {
    return this._state[key];
  }

  /** 设置单个属性并触发通知 */
  set(key, value) {
    const old = this._state[key];
    if (old !== value) {
      this._state[key] = value;
      this._notify(key, value, old);
    }
  }

  /** 批量更新并触发通知 */
  patch(partial) {
    for (const [key, value] of Object.entries(partial)) {
      const old = this._state[key];
      if (old !== value) {
        this._state[key] = value;
        this._notify(key, value, old);
      }
    }
  }

  /** 订阅指定属性的变更 */
  on(key, fn) {
    if (!this._listeners.has(key)) {
      this._listeners.set(key, new Set());
    }
    this._listeners.get(key).add(fn);
    return () => this._listeners.get(key)?.delete(fn);
  }

  /** 重置为初始状态 */
  reset(initialState) {
    this._state = { ...initialState };
    this._listeners.clear();
  }

  /** @private */
  _notify(key, value, old) {
    const listeners = this._listeners.get(key);
    if (listeners) {
      for (const fn of listeners) {
        fn(value, old);
      }
    }
  }
}