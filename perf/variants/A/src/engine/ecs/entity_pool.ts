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

  /** 创建单个视图（getter/setter 代理到 TypedArray） */
  private _createView(idx: number): T {
    const pool = this;
    const view = { _idx: idx } as unknown as T;
    const vw = view as unknown as Record<string, any>;
    for (const key of this._schema) {
      const off = this._offsets[key];
      Object.defineProperty(view, key, {
        get() { return pool._data[(vw._idx as number) * pool._stride + off]; },
        set(v: number) { pool._data[(vw._idx as number) * pool._stride + off] = v; },
        enumerable: true, configurable: true,
      });
    }
    Object.defineProperty(view, '_meta', {
      get() { return pool._meta[vw._idx as number]; },
      set(v: Record<string, any>) { pool._meta[vw._idx as number] = v; },
      enumerable: false,
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
    view._idx = idx;
    const vw = view as unknown as Record<string, any>;
    for (const key of Object.keys(vw)) {
      if (key !== '_idx' && key !== '_meta' && this._offsets[key] === undefined) {
        delete vw[key];
      }
    }
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

  /** 原地压缩：移除死实体，同步更新外部数组 */
  compact(arr: T[], isDeadFn: (e: T) => boolean): void {
    let w = 0;
    const oldCount = this.count;
    for (let r = 0; r < oldCount; r++) {
      const view = this._views[r];
      if (isDeadFn(view)) continue;
      if (w !== r) {
        const src = r * this._stride;
        const dst = w * this._stride;
        for (let i = 0; i < this._stride; i++) this._data[dst + i] = this._data[src + i];
        this._meta[w] = this._meta[r];
        const dstView = this._views[w];
        const dstVw = dstView as unknown as Record<string, any>;
        for (const key of Object.keys(dstVw)) {
          if (key !== '_idx' && key !== '_meta' && this._offsets[key] === undefined) {
            delete dstVw[key];
          }
        }
        const srcVw = view as unknown as Record<string, any>;
        for (const key of Object.keys(srcVw)) {
          if (key !== '_idx' && key !== '_meta' && this._offsets[key] === undefined) {
            dstVw[key] = srcVw[key];
          }
        }
        dstView._idx = w;
      }
      arr[w] = this._views[w];
      w++;
    }
    // 清理残留（旧 count 范围内的 meta 引用）
    for (let i = w; i < oldCount; i++) this._meta[i] = {};
    this.count = w;
    arr.length = w;
  }

  /** 重置池（清空所有实体） */
  reset(): void {
    this.count = 0;
  }
}

/* ---------- 全局池（按具体类型参数化） ---------- */
export const ENEMY_POOL = new EntityPool<EnemyInstance>(500, E_SCHEMA);
export const PROJECTILE_POOL = new EntityPool<Projectile>(500, P_SCHEMA);
export const DROP_POOL = new EntityPool<Drop>(200, D_SCHEMA);
export const PHANTOM_POOL = new EntityPool<Phantom>(20, PH_SCHEMA);
export const PARTICLE_POOL = new EntityPool<Particle>(512, PA_SCHEMA);
