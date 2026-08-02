/* =========================================================
   蚀月远征 · TypedArray 实体池（连续内存存储）
   热路径通过池直接读写 TypedArray，
   冷路径通过可复用的视图对象保持 API 兼容。
   ========================================================= */

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

/* ---------- 实体视图类型 ---------- */
export interface EntityView {
  _idx: number;
  _meta?: Record<string, any>;
  // 显式声明数值字段，覆盖 Projectile 所有必要属性（含 EnemyInstance 的 hp），
  // 使视图可结构化赋值给 Projectile / Point 等具名属性类型（索引签名不参与赋值检查）
  x: number; y: number; vx: number; vy: number;
  r: number; dmg: number; t: number; life: number; pierce: number;
  speed: number; range: number; width: number; maxR: number;
  delay: number; spin: number; dir: number;
  owner: number; ret: number; hitPlayer: number;
  meteor: number; aoe: number; beam: number; boomerang: number;
  homing: number; trail: number; acid: number; ground: number;
  breath: number; slow: number; enemy: number; dead: number;
  hp: number;
  [key: string]: any;
}

/* ---------- 实体池 ---------- */
export class EntityPool {
  _schema: string[];
  _stride: number;
  _maxSize: number;
  _data: Float64Array;
  _meta: Record<string, any>[];
  _views: EntityView[];
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
  private _createView(idx: number): EntityView {
    const pool = this;
    const view: EntityView = { _idx: idx } as EntityView;
    for (const key of this._schema) {
      const off = this._offsets[key];
      Object.defineProperty(view, key, {
        get() { return pool._data[view._idx * pool._stride + off]; },
        set(v: number) { pool._data[view._idx * pool._stride + off] = v; },
        enumerable: true, configurable: true,
      });
    }
    Object.defineProperty(view, '_meta', {
      get() { return pool._meta[view._idx]; },
      set(v: Record<string, any>) { pool._meta[view._idx] = v; },
      enumerable: false,
    });
    return view;
  }

  /** 分配新实体，返回可复用的视图对象 */
  add(): EntityView {
    const idx = this.count++;
    const base = idx * this._stride;
    for (let i = 0; i < this._stride; i++) this._data[base + i] = 0;
    this._meta[idx] = {};
    const view = this._views[idx];
    view._idx = idx;
    for (const key of Object.keys(view)) {
      if (key !== '_idx' && this._offsets[key] === undefined) {
        delete view[key];
      }
    }
    return view;
  }

  /** 分配新实体并用数据对象填充 */
  addWith(data: Record<string, any>): EntityView {
    const view = this.add();
    const idx = view._idx;
    const base = idx * this._stride;
    for (const key of Object.keys(data)) {
      const off = this._offsets[key];
      if (off !== undefined) {
        this._data[base + off] = data[key];
      } else {
        view[key] = data[key];
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
  view(idx: number): EntityView { return this._views[idx]; }

  /** 原地压缩：移除死实体，同步更新外部数组 */
  compact(arr: EntityView[], isDeadFn: (e: EntityView) => boolean): void {
    let w = 0;
    for (let r = 0; r < this.count; r++) {
      const view = this._views[r];
      if (isDeadFn(view)) continue;
      if (w !== r) {
        const src = r * this._stride;
        const dst = w * this._stride;
        for (let i = 0; i < this._stride; i++) this._data[dst + i] = this._data[src + i];
        this._meta[w] = this._meta[r];
        const dstView = this._views[w];
        for (const key of Object.keys(dstView)) {
          if (key !== '_idx' && this._offsets[key] === undefined) {
            delete dstView[key];
          }
        }
        for (const key of Object.keys(view)) {
          if (key !== '_idx' && this._offsets[key] === undefined) {
            dstView[key] = view[key];
          }
        }
        this._views[w]._idx = w;
      }
      arr[w] = this._views[w];
      w++;
    }
    this.count = w;
    arr.length = w;
  }

  /** 重置池（清空所有实体） */
  reset(): void {
    this.count = 0;
  }
}

/* ---------- 全局池 ---------- */
export const ENEMY_POOL = new EntityPool(500, E_SCHEMA);
export const PROJECTILE_POOL = new EntityPool(500, P_SCHEMA);
export const DROP_POOL = new EntityPool(200, D_SCHEMA);
export const PHANTOM_POOL = new EntityPool(20, PH_SCHEMA);
export const PARTICLE_POOL = new EntityPool(512, PA_SCHEMA);
