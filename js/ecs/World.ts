/* =========================================================
   蚀月远征 · ECS World
   实体管理核心：封装所有 EntityPool，提供统一 API
   系统通过 World 访问实体，不直接接触 EntityPool
   ========================================================= */
import {
  ENEMY_POOL, PROJECTILE_POOL, DROP_POOL,
  PHANTOM_POOL, PARTICLE_POOL,
  type EntityPool, type BaseEntityView,
} from './entity_pool.js';
import type {
  EnemyInstance, Projectile, Drop, Phantom, Particle,
} from '../types/core.d.ts';

/** 实体类型 → 视图类型映射 */
export interface EntityTypeMap {
  enemies: EnemyInstance;
  projectiles: Projectile;
  drops: Drop;
  particles: Particle;
  phantoms: Phantom;
}

export type EntityType = keyof EntityTypeMap;

interface PoolEntry<T extends BaseEntityView> {
  pool: EntityPool<T>;
  deadFn: (e: T) => boolean;
}

const POOL_MAP: { [K in EntityType]: PoolEntry<EntityTypeMap[K]> } = {
  enemies:     { pool: ENEMY_POOL,     deadFn: (e) => !!e.dead },
  projectiles: { pool: PROJECTILE_POOL, deadFn: (e) => !!e.dead },
  drops:       { pool: DROP_POOL,      deadFn: (e) => !!e.take },
  particles:   { pool: PARTICLE_POOL,  deadFn: (e) => !!e.dead },
  phantoms:    { pool: PHANTOM_POOL,   deadFn: (e) => e.t >= e.max },
};

export class World {
  private _lists: { [K in EntityType]: EntityTypeMap[K][] } = {
    enemies: [], projectiles: [], drops: [], particles: [], phantoms: [],
  };
  private _initialized = false;
  /** 玩家引用（由外部设置） */
  _player: any = null;

  init(lists: Record<string, BaseEntityView[]>): void {
    // 接受外部传入的列表引用，绑定到对应类型槽
    for (const k of Object.keys(this._lists) as EntityType[]) {
      this._lists[k] = lists[k] as any;
    }
    this._initialized = true;
  }

  add<K extends EntityType>(type: K, data: Record<string, any>): EntityTypeMap[K] {
    const entry = POOL_MAP[type];
    const entity = entry.pool.addWith(data) as EntityTypeMap[K];
    this._lists[type].push(entity);
    return entity;
  }

  query<K extends EntityType>(type: K): EntityTypeMap[K][] {
    return this._lists[type];
  }

  compact<K extends EntityType>(type: K, isDeadFn?: (e: EntityTypeMap[K]) => boolean): void {
    const entry = POOL_MAP[type];
    const fn = isDeadFn || entry.deadFn;
    entry.pool.compact(this._lists[type], fn);
  }

  resetAll(): void {
    for (const type of Object.keys(POOL_MAP) as EntityType[]) {
      POOL_MAP[type].pool.count = 0;
      this._lists[type].length = 0;
    }
  }

  getPool<K extends EntityType>(type: K): EntityPool<EntityTypeMap[K]> {
    return POOL_MAP[type].pool;
  }

  get initialized(): boolean { return this._initialized; }
}

/** 单例 */
export const world = new World();
