/* =========================================================
   蚀月远征 · Store 基类
   支持状态切片、变更通知、批量更新
   ========================================================= */

type Listener<T = any> = (value: T, old: T) => void;

/**
 * 递归复制数组与纯对象，其余一律保持引用。
 *
 * 存在的理由：状态切片的初始值是模块级常量，形如
 * `const INITIAL = { enemies: [], runStats: { wDmg: {} } }`。
 * 若只做浅拷贝，`store.state.enemies` 与 `INITIAL.enemies` 会是同一个数组，
 * 运行时的 push 将永久污染这个「初始」常量，导致重置拿回脏数据。
 *
 * 刻意不用 structuredClone：状态里存有 canvas / ctx 等宿主对象会直接抛错。
 * 这些非纯对象保持引用正是期望行为。
 */
function cloneData<V>(v: V): V {
  if (Array.isArray(v)) return v.map(cloneData) as unknown as V;
  if (v !== null && typeof v === 'object') {
    const proto = Object.getPrototypeOf(v);
    if (proto === Object.prototype || proto === null) {
      const out: Record<string, any> = {};
      for (const k in v) out[k] = cloneData((v as Record<string, any>)[k]);
      return out as V;
    }
  }
  return v;
}

/** 可订阅的状态容器 */
export class Store<T extends Record<string, any>> {
  private _state: T;
  /** 构造时的初始快照，供 reset 使用；不对外暴露 */
  private readonly _initial: T;
  private _listeners: Map<string, Set<Listener>> = new Map();
  /** 浅拷贝缓存，任一写入即失效 */
  private _snapshot: T | null = null;

  constructor(initialState: T) {
    this._state = cloneData(initialState);
    this._initial = cloneData(initialState);
  }

  /** 读取整个状态快照（返回浅拷贝，防止外部直接修改绕过通知）
   *
   * 为什么要缓存：全项目有 268 处 `pSt()` / `rSt()` 这类访问器调用，
   * 且大量位于逐实体循环内部 —— 单是 `enemyTick` 每只敌人就要调 6 次。
   * 后期 250 敌时，仅此一处每帧就产生上千个短命对象，
   * 实测堆增长约 30 KB/帧（≈2 MB/s），GC 被迫频繁介入，
   * 表现为帧时间长尾抖动。
   *
   * 缓存不改变对外语义：返回的仍是与 `_state` 分离的浅拷贝，
   * 外部改它依旧影响不到 store（这一点原本就是设计意图，
   * `run.test.ts` 里也明确写了「直接写快照是无效写入」）。
   * 唯一的差别是同一批读取共享对象标识 —— 而依赖标识差异的写法
   * 本来就是 bug。
   */
  get state(): T {
    return (this._snapshot ??= { ...this._state });
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
      // 必须在通知前失效：监听器回调里读 .state 要能拿到新值
      this._snapshot = null;
      this._notify(key as string, value, old);
    }
  }

  /** 批量更新并触发通知 */
  patch(partial: Partial<T>): void {
    for (const [key, value] of Object.entries(partial)) {
      const old = (this._state as any)[key];
      if (old !== value) {
        (this._state as any)[key] = value;
        this._snapshot = null;
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

  /**
   * 重置为构造时的初始状态，可选覆盖部分字段。
   * 刻意不清空监听器 —— 重置状态与退订订阅是两件事，
   * 混在一起会让「重置一次后所有响应式绑定静默失效」。
   */
  reset(overrides?: Partial<T>): void {
    this._state = cloneData(this._initial);
    if (overrides) Object.assign(this._state, cloneData(overrides));
    this._snapshot = null;
  }

  /** 显式移除全部订阅（销毁 / 热重载场景） */
  clearListeners(): void {
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
