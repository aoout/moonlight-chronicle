/* =========================================================
   蚀月远征 · ECS World
   实体管理核心：封装所有 EntityPool，提供统一 API
   系统通过 World 访问实体，不直接接触 G 或 EntityPool
   ========================================================= */
import {
  ENEMY_POOL, PROJECTILE_POOL, DROP_POOL,
  PHANTOM_POOL, PARTICLE_POOL,
  type EntityPool, type EntityView,
} from '../entity_pool.js';

interface PoolEntry {
  pool: EntityPool;
  deadFn: (e: EntityView) => boolean;
}

const POOL_MAP: Record<string, PoolEntry> = {
  enemies:     { pool: ENEMY_POOL,     deadFn: (e) => !!e.dead },
  projectiles: { pool: PROJECTILE_POOL, deadFn: (e) => !!e.dead },
  drops:       { pool: DROP_POOL,      deadFn: (e) => !!e.take },
  particles:   { pool: PARTICLE_POOL,  deadFn: (e) => !!e.dead },
  phantoms:    { pool: PHANTOM_POOL,   deadFn: (e) => !!e.dead },
};

export class World {
  private _lists: Record<string, EntityView[]> = {};
  private _initialized = false;
  /** 玩家引用（由外部设置） */
  _player: any = null;

  init(lists: Record<string, EntityView[]>): void {
    this._lists = lists;
    this._initialized = true;
  }

  add(type: string, data: Record<string, any>): EntityView {
    const entry = POOL_MAP[type];
    if (!entry) throw new Error(`World.add: 未知实体类型 "${type}"`);
    const entity = entry.pool.addWith(data);
    this._lists[type].push(entity);
    return entity;
  }

  query(type: string): EntityView[] {
    return this._lists[type] || [];
  }

  compact(type: string, isDeadFn?: (e: EntityView) => boolean): void {
    const entry = POOL_MAP[type];
    if (!entry) return;
    const fn = isDeadFn || entry.deadFn;
    entry.pool.compact(this._lists[type], fn);
  }

  resetAll(): void {
    for (const type of Object.keys(POOL_MAP)) {
      POOL_MAP[type].pool.count = 0;
      if (this._lists[type]) this._lists[type].length = 0;
    }
  }

  getPool(type: string): EntityPool | undefined {
    const entry = POOL_MAP[type];
    return entry ? entry.pool : undefined;
  }

  get initialized(): boolean { return this._initialized; }
}

/** 单例 */
export const world = new World();
