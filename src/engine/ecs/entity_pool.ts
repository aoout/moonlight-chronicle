/* =========================================================
   蚀月远征 · TypedArray 实体池（连续内存存储）
   热路径通过池直接读写 TypedArray，
   冷路径通过可复用的视图对象保持 API 兼容。
   每个池由具体类型参数化（EnemyInstance / Projectile / ...），
   视图对象通过 getter/setter 代理到 TypedArray。
   ========================================================= */

import type {
  EnemyInstance, Projectile, Drop, Phantom, Particle,
} from '../../types/core.d.ts';

/* ---------- 敌人属性模式 ---------- */
export const E_SCHEMA = [
  'x','y','vx','vy',
  'hp','maxHp','dmg','spd','size',
  'flash','t','wob',
  'slow','auraSlow','dead',
  'stateT','skillT','skillP',
  'skillA','skillB',
  'bleed','stun',
  'attT','attCd',
];

/* ---------- 投射物属性模式 ---------- */
export const P_SCHEMA = [
  'x','y','vx','vy',
  'r','dmg','t','life','pierce',
  'speed','range','width','maxR','delay','spin','dir',
  'owner','ret','hitPlayer',
  'meteor','aoe','beam','boomerang','homing','trail','acid','ground','breath','slow','enemy','dead',
];

/* ---------- 掉落物属性模式 ---------- */
export const D_SCHEMA = [
  'x','y','vx','vy',
  't','amount','take',
];

/* ---------- 残像属性模式 ---------- */
export const PH_SCHEMA = [
  'x','y','t','max','dmg','fireT','lv',
];

/* ---------- 粒子属性模式 ---------- */
export const PA_SCHEMA = [
  'x','y','vx','vy',
  't','max','life','size',
  'r0','r1','lw','rot','vr','ang','len','w',
  'x1','y1','x2','y2',
  'chain','ring','spark','star','shard','streak','glow','timestop','echo','dead',
];

/* ---------- 视图约束：所有视图必须含 _idx 与 _meta ---------- */
export interface BaseEntityView {
  _idx?: number;
  _meta?: Record<string, any>;
}

/* ---------- 实体池 ----------
 * 泛型参数 T 为具体视图类型（EnemyInstance 等），
 * 内部通过 _data TypedArray 存储 schema 数值字段，
 * 通过 _meta 数组存储非 schema 动态属性。
 */
export class EntityPool<T extends BaseEntityView> {
  _schema: string[];
  _stride: number;
  _maxSize: number;
  _data: Float64Array;
  _meta: Record<string, any>[];
  _views: T[];
  count: number;
  _offsets: Record<string, number>;

  constructor(maxSize: number, schema: string[]) {
    this._schema = schema;
    this._stride = schema.length;
    this._maxSize = maxSize;
    this._data = new Float64Array(maxSize * this._stride);
    this._meta = new Array(maxSize);
    this._views = new Array(maxSize);
    this.count = 0;
    this._offsets = {};
    for (let i = 0; i < schema.length; i++) this._offsets[schema[i]] = i;
    for (let i = 0; i < maxSize; i++) this._views[i] = this._createView(i);
  }

  /** 创建单个视图（getter/setter 代理到 TypedArray）
   *
   * 关键不变量：`_views[i]._idx === i` 恒成立。
   * 压缩时移动的是**数据**（把 slot r 的内容拷到 slot w），视图对象本身
   * 始终绑定自己的槽位，从不改绑。因此槽位偏移 `idx * stride + off`
   * 是编译期常量，可以直接闭包捕获。
   *
   * 这一点很值钱：原实现每次读 `e.x` 都要做
   * `vw._idx` → `pool._stride` → 乘加 → `pool._data` 四步，
   * 而属性访问在这个引擎里是最高频的操作（后期每帧数十万次）。
   * 预计算成单个常量下标后，getter 塌缩成一次数组读取，V8 可以内联。
   *
   * `_data` 仍需通过 `pool` 间接引用 —— 扩容时数组会被整体替换，
   * 捕获数组本身会拿到失效的旧缓冲。
   */
  private _createView(idx: number): T {
    const pool = this;
    const view = {} as unknown as T;
    const base = idx * this._stride;
    for (const key of this._schema) {
      const slot = base + this._offsets[key];
      Object.defineProperty(view, key, {
        get() { return pool._data[slot]; },
        set(v: number) { pool._data[slot] = v; },
        // 不可枚举：让 Object.keys(view) 只返回动态属性。
        // 压缩时要逐个搬运动态属性，若 schema 字段混在里面，
        // 每搬一个实体就要白扫 24 个键。
        enumerable: false, configurable: true,
      });
    }
    Object.defineProperty(view, '_idx', {
      value: idx, writable: false, enumerable: false, configurable: false,
    });
    Object.defineProperty(view, '_meta', {
      get() { return pool._meta[idx]; },
      set(v: Record<string, any>) { pool._meta[idx] = v; },
      enumerable: false, configurable: true,
    });
    return view;
  }

  /** 容量不足时自动扩容（数据 / 元数据 / 视图数组同步扩展） */
  private _ensureCapacity(idx: number): void {
    if (idx < this._maxSize) return;
    const newMax = Math.max(this._maxSize * 2, idx + 1);
    const newData = new Float64Array(newMax * this._stride);
    newData.set(this._data);
    this._data = newData;
    const newMeta = new Array(newMax);
    for (let i = 0; i < this._meta.length; i++) newMeta[i] = this._meta[i];
    this._meta = newMeta;
    const oldLen = this._views.length;
    this._views.length = newMax;
    for (let i = oldLen; i < newMax; i++) this._views[i] = this._createView(i);
    this._maxSize = newMax;
  }

  /** 分配新实体，返回可复用的视图对象 */
  add(): T {
    const idx = this.count++;
    this._ensureCapacity(idx);
    const base = idx * this._stride;
    for (let i = 0; i < this._stride; i++) this._data[base + i] = 0;
    this._meta[idx] = {};
    const view = this._views[idx];
    // _idx 由 _createView 固定绑定，无需重设。
    // schema 字段不可枚举，Object.keys 到手的就是上一轮残留的动态属性。
    const vw = view as unknown as Record<string, any>;
    const stale = Object.keys(vw);
    for (let i = 0; i < stale.length; i++) delete vw[stale[i]];
    return view;
  }

  /** 分配新实体并用数据对象填充 */
  addWith(data: Record<string, any>): T {
    const view = this.add();
    const idx = view._idx ?? 0;
    const base = idx * this._stride;
    const vw = view as unknown as Record<string, any>;
    for (const key of Object.keys(data)) {
      const off = this._offsets[key];
      if (off !== undefined) {
        this._data[base + off] = data[key];
      } else {
        vw[key] = data[key];
      }
    }
    return view;
  }

  /** 批量设置数值属性 */
  setFields(idx: number, values: Record<string, number>): void {
    const base = idx * this._stride;
    for (const key of Object.keys(values)) {
      const off = this._offsets[key];
      if (off !== undefined) this._data[base + off] = values[key];
    }
  }

  /** 直接读写 TypedArray（不经过视图 getter/setter） */
  get(idx: number, field: string): number {
    return this._data[idx * this._stride + this._offsets[field]];
  }
  set(idx: number, field: string, val: number): void {
    this._data[idx * this._stride + this._offsets[field]] = val;
  }

  /** 获取视图对象 */
  view(idx: number): T { return this._views[idx]; }

  /** 原地压缩：移除死实体，同步更新外部数组
   *
   * 压缩是后期的 p95 尖峰来源之一：一波清场后要搬运上百个实体，
   * 而搬运成本主要不在数值字段（TypedArray 连续拷贝很便宜），
   * 而在动态属性的搬家。原实现对每个被移动的实体做两轮
   * `Object.keys()`，且每轮都要扫过全部 24 个 schema 字段并逐一
   * 查表排除；再叠加 `delete` 触发的对象形状迁移，V8 会把这些
   * 视图降级成字典模式，之后所有属性访问一起变慢。
   *
   * 现在 schema 字段不可枚举，`Object.keys()` 直接命中动态属性；
   * 数值字段整段 copyWithin 搬运，不再逐元素循环。
   */
  compact(arr: T[], isDeadFn: (e: T) => boolean): void {
    let w = 0;
    const oldCount = this.count;
    const stride = this._stride;
    for (let r = 0; r < oldCount; r++) {
      const view = this._views[r];
      if (isDeadFn(view)) continue;
      if (w !== r) {
        const src = r * stride;
        // copyWithin 走的是底层 memmove，比逐元素赋值快一个量级
        this._data.copyWithin(w * stride, src, src + stride);
        this._meta[w] = this._meta[r];

        // 动态属性搬家（O10）：先覆盖、后清理残留。
        // 旧实现是 delete-then-set —— delete 会触发 V8 隐藏类迁移，
        // 把视图对象降级成字典模式，之后所有属性访问一起变慢。
        // 同构实体（绝大多数：同类型敌人/粒子共享同一组动态键）覆盖即可
        // 保持对象形状不变；只有异构迁移时才需要 delete 残留键。
        const dstVw = this._views[w] as unknown as Record<string, any>;
        const srcVw = view as unknown as Record<string, any>;
        const live = Object.keys(srcVw);
        for (let i = 0; i < live.length; i++) dstVw[live[i]] = srcVw[live[i]];
        const stale = Object.keys(dstVw);
        for (let i = 0; i < stale.length; i++) {
          if (!(stale[i] in srcVw)) delete dstVw[stale[i]];
        }
      }
      arr[w] = this._views[w];
      w++;
    }
    // 清理残留（旧 count 范围内的 meta 引用）
    for (let i = w; i < oldCount; i++) this._meta[i] = {};
    this.count = w;
    arr.length = w;
  }

  /** 重置池（清空所有实体，同时清理 _meta 引用防止内存泄漏） */
  reset(): void {
    for (let i = 0; i < this.count; i++) this._meta[i] = {};
    this.count = 0;
  }
}

/* ---------- 全局池（按具体类型参数化） ---------- */
export const ENEMY_POOL = new EntityPool<EnemyInstance>(500, E_SCHEMA);
export const PROJECTILE_POOL = new EntityPool<Projectile>(500, P_SCHEMA);
export const DROP_POOL = new EntityPool<Drop>(200, D_SCHEMA);
export const PHANTOM_POOL = new EntityPool<Phantom>(20, PH_SCHEMA);
export const PARTICLE_POOL = new EntityPool<Particle>(512, PA_SCHEMA);
