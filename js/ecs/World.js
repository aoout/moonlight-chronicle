// @ts-check
/* =========================================================
   蚀月远征 · ECS World
   实体管理核心：封装所有 EntityPool，提供统一 API
   系统通过 World 访问实体，不直接接触 G 或 EntityPool
   ========================================================= */
import {
  ENEMY_POOL, PROJECTILE_POOL, DROP_POOL,
  PHANTOM_POOL, PARTICLE_POOL,
} from '../entity_pool.js';

/**
 * @typedef {import('../entity_pool.js').EntityPool} EntityPool
 */

/**
 * 实体类型映射条目
 * @typedef {{ pool: EntityPool, deadFn: (e: any) => any }} PoolEntry
 */

/**
 * 实体类型映射
 * 将类型名 → { pool, listKey }
 * @type {Record<string, PoolEntry>}
 */
const POOL_MAP = {
  enemies:    { pool: ENEMY_POOL,    deadFn: e => e.dead },
  projectiles:{ pool: PROJECTILE_POOL, deadFn: e => e.dead },
  drops:      { pool: DROP_POOL,     deadFn: e => e.take },
  particles:  { pool: PARTICLE_POOL, deadFn: e => e.dead },
  phantoms:   { pool: PHANTOM_POOL,  deadFn: e => e.dead },
};

export class World {
  constructor() {
    /** @type {Record<string, any[]>} */
    this._lists = {};
    this._initialized = false;
  }

  /**
   * 初始化 World：绑定外部实体列表（来自 G 切片）
   * @param {Record<string, any[]>} lists
   */
  init(lists) {
    this._lists = lists;
    this._initialized = true;
  }

  /**
   * 添加实体
   * @param {string} type 实体类型（enemies|projectiles|drops|particles|phantoms）
   * @param {Record<string, any>} data 实体数据
   * @returns {any} 实体视图对象
   */
  add(type, data) {
    const entry = POOL_MAP[type];
    if (!entry) throw new Error(`World.add: 未知实体类型 "${type}"`);
    const entity = entry.pool.addWith(data);
    this._lists[type].push(entity);
    return entity;
  }

  /**
   * 查询所有指定类型的实体
   * @param {string} type
   * @returns {any[]}
   */
  query(type) {
    return this._lists[type] || [];
  }

  /**
   * 压缩实体池：移除死实体，同步更新外部列表
   * @param {string} type
   * @param {(e:any)=>boolean} [isDeadFn] 自定义死亡判定，默认使用注册表
   */
  compact(type, isDeadFn) {
    const entry = POOL_MAP[type];
    if (!entry) return;
    const fn = isDeadFn || entry.deadFn;
    entry.pool.compact(this._lists[type], fn);
  }

  /**
   * 重置所有实体池
   */
  resetAll() {
    for (const type of Object.keys(POOL_MAP)) {
      POOL_MAP[type].pool.count = 0;
      this._lists[type].length = 0;
    }
  }

  /**
   * 获取底层池：用于高性能直接访问（渲染层等）
   * @param {string} type
   * @returns {import('../entity_pool.js').EntityPool|undefined}
   */
  getPool(type) {
    const entry = POOL_MAP[type];
    return entry ? entry.pool : undefined;
  }

  /**
   * 判断是否已初始化
   * @returns {boolean}
   */
  get initialized() { return this._initialized; }
}

/** 单例 */
export const world = new World();