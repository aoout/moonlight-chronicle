/* =========================================================
   蚀月远征 · ECS World
   实体管理核心：封装所有 EntityPool，提供统一 API
   系统通过 World 访问实体，不直接接触 EntityPool
   包含空间哈希网格（碰撞检测加速）
   ========================================================= */
import {
  ENEMY_POOL, PROJECTILE_POOL, DROP_POOL,
  PHANTOM_POOL, PARTICLE_POOL,
  type EntityPool, type BaseEntityView,
} from './entity_pool.js';
import type {
  EnemyInstance, Projectile, Drop, Phantom, Particle,
} from '../types/core.d.ts';
import { dist } from '../utils.js';

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

const SPATIAL_CELL = 120;

export class World {
  private _lists: { [K in EntityType]: EntityTypeMap[K][] } = {
    enemies: [], projectiles: [], drops: [], particles: [], phantoms: [],
  };
  private _initialized = false;

  /* ========== 空间哈希网格 ========== */
  private _spatialGrid = new Map<string, EnemyInstance[]>();

  private _cellKey(c: number, r: number): string { return c + ',' + r; }
  private _cellCoord(v: number): number { return Math.floor(v / SPATIAL_CELL); }

  /** 重建空间网格（每帧由 SpatialSystem 调用） */
  buildSpatialGrid(): void {
    this._spatialGrid.clear();
    for (const e of this._lists.enemies) {
      if (e.dead) continue;
      const key = this._cellKey(this._cellCoord(e.x), this._cellCoord(e.y));
      let cell = this._spatialGrid.get(key);
      if (!cell) { cell = []; this._spatialGrid.set(key, cell); }
      cell.push(e);
    }
  }

  /** 返回 (x,y) 周围相邻 cell 内的所有敌人（去重） */
  neighborEnemies(x: number, y: number, radius?: number): EnemyInstance[] {
    const col = this._cellCoord(x), row = this._cellCoord(y);
    const cellR = radius !== undefined ? Math.ceil(radius / SPATIAL_CELL) : 1;
    const seen = new Set<EnemyInstance>();
    const out: EnemyInstance[] = [];
    for (let dc = -cellR; dc <= cellR; dc++) {
      for (let dr = -cellR; dr <= cellR; dr++) {
        const cell = this._spatialGrid.get(this._cellKey(col + dc, row + dr));
        if (!cell) continue;
        for (const e of cell) {
          if (!seen.has(e)) { seen.add(e); out.push(e); }
        }
      }
    }
    return out;
  }

  /** 半径范围查询（精确距离） */
  queryRadius(x: number, y: number, r: number): EnemyInstance[] {
    const r2 = r * r;
    return this.neighborEnemies(x, y, r).filter(e => {
      const dx = e.x - x, dy = e.y - y;
      return dx * dx + dy * dy <= r2;
    });
  }

  /** 最近邻查询（可排除指定实体） */
  nearestInGrid(x: number, y: number, maxR?: number, exclude?: EnemyInstance): EnemyInstance | null {
    const candidates = this.neighborEnemies(x, y, maxR);
    let best: EnemyInstance | null = null, bd = maxR === undefined ? 1e9 : maxR;
    for (const e of candidates) {
      if (e === exclude) continue;
      const d = dist({ x, y }, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

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
