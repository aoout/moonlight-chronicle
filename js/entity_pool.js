// @ts-check
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

/* ---------- 实体池 ---------- */
export class EntityPool {
  /**
   * @param {number} maxSize  最大实体数
   * @param {string[]} schema 属性名列表（定义内存布局）
   */
  constructor(maxSize, schema) {
    this._schema = schema;
    this._stride = schema.length;
    this._maxSize = maxSize;
    this._data   = new Float64Array(maxSize * this._stride);
    this._meta   = new Array(maxSize);          // 非数值元数据
    this._views  = new Array(maxSize);          // 可复用的视图对象
    this.count   = 0;                           // 有效实体数

    // 构建属性名 → 偏移映射
    this._offsets = /** @type {Record<string, number>} */ ({});
    for (let i = 0; i < schema.length; i++) this._offsets[schema[i]] = i;

    // 预创建所有视图，避免运行时 GC
    for (let i = 0; i < maxSize; i++) this._views[i] = this._createView(i);
  }

  /* 创建单个视图（getter/setter 代理到 TypedArray） */
  /** @param {number} idx */
  _createView(idx) {
    const pool = this;
    /** @type {Record<string, any>} */
    const view = { _idx: idx };
    for (const key of this._schema) {
      const off = this._offsets[key];
      Object.defineProperty(view, key, {
        get() { return pool._data[view._idx * pool._stride + off]; },
        set(v) { pool._data[view._idx * pool._stride + off] = v; },
        enumerable: true, configurable: true,
      });
    }
    Object.defineProperty(view, '_meta', {
      get() { return pool._meta[view._idx]; },
      set(v) { pool._meta[view._idx] = v; },
      enumerable: false,
    });
    return view;
  }

  /* 分配新实体，返回可复用的视图对象 */
  add() {
    const idx = this.count++;
    const base = idx * this._stride;
    // 清零 TypedArray（复用槽位可能有残留）
    for (let i = 0; i < this._stride; i++) this._data[base + i] = 0;
    // 重置元数据
    this._meta[idx] = {};
    const view = this._views[idx];
    view._idx = idx;
    // 清除非 schema 属性残留（如 hit Set、color 等），避免复用污染
    for (const key of Object.keys(view)) {
      if (key !== '_idx' && this._offsets[key] === undefined) {
        delete view[key];
      }
    }
    return view;
  }

  /**
   * 分配新实体并用数据对象填充
   * @param {Record<string, any>} data  属性键值对（数值属性写入 TypedArray，其余写入 _meta）
   * @returns {any} 视图对象
   */
  addWith(data) {
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

  /**
   * 批量设置数值属性
   * @param {number} idx
   * @param {Record<string, number>} values
   */
  setFields(idx, values) {
    const base = idx * this._stride;
    for (const key of Object.keys(values)) {
      const off = this._offsets[key];
      if (off !== undefined) this._data[base + off] = values[key];
    }
  }

  /**
   * 直接读写 TypedArray（不经过视图 getter/setter）
   * @param {number} idx
   * @param {string} field
   * @returns {number}
   */
  get(idx, field) {
    return this._data[idx * this._stride + this._offsets[field]];
  }
  /**
   * @param {number} idx
   * @param {string} field
   * @param {number} val
   */
  set(idx, field, val) {
    this._data[idx * this._stride + this._offsets[field]] = val;
  }

  /**
   * 获取视图对象
   * @param {number} idx
   * @returns {any}
   */
  view(idx) { return this._views[idx]; }

  /**
   * 原地压缩：移除死实体，同步更新外部数组
   * @param {any[]} arr  外部数组（如 G.enemies），同步更新
   * @param {(e:any)=>boolean} isDeadFn  判断视图是否死亡
   */
  compact(arr, isDeadFn) {
    let w = 0;
    for (let r = 0; r < this.count; r++) {
      const view = this._views[r];
      if (isDeadFn(view)) continue;
      if (w !== r) {
        // 复制 TypedArray 行
        const src = r * this._stride;
        const dst = w * this._stride;
        for (let i = 0; i < this._stride; i++) this._data[dst + i] = this._data[src + i];
        // 迁移元数据
        this._meta[w] = this._meta[r];
        // 迁移非 schema 属性（type, color, state, boss 等）
        const dstView = this._views[w];
        // 清除目标视图的旧非 schema 属性
        for (const key of Object.keys(dstView)) {
          if (key !== '_idx' && this._offsets[key] === undefined) {
            delete dstView[key];
          }
        }
        // 从源视图复制非 schema 属性
        for (const key of Object.keys(view)) {
          if (key !== '_idx' && this._offsets[key] === undefined) {
            dstView[key] = view[key];
          }
        }
        // 更新视图索引
        this._views[w]._idx = w;
      }
      arr[w] = this._views[w];
      w++;
    }
    this.count = w;
    arr.length = w;
  }

  /** 重置池（清空所有实体） */
  reset() {
    this.count = 0;
  }
}

/* ---------- 全局池 ---------- */
export const ENEMY_POOL = new EntityPool(500, E_SCHEMA);
export const PROJECTILE_POOL = new EntityPool(500, P_SCHEMA);
export const DROP_POOL = new EntityPool(200, D_SCHEMA);
export const PHANTOM_POOL = new EntityPool(20, PH_SCHEMA);
export const PARTICLE_POOL = new EntityPool(512, PA_SCHEMA);