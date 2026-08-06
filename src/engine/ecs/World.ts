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
} from '../../types/core.d.ts';
import { dist } from '../util/utils.js';

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
  private _compactDirty: Record<EntityType, boolean> = {
    enemies: false, projectiles: false, drops: false, particles: false, phantoms: false,
  };
  private _compactFrame = 0;

  /* ========== 空间哈希网格 ========== */
  private _spatialGrid = new Map<string, EnemyInstance[]>();

  /* 基于时间戳的去重（替代 Set 分配） */
  private _queryId = 1;
  private _queryStamps = new Uint32Array(ENEMY_POOL._maxSize);

  /* 共享空数组（当网格为空时复用，避免分配） */
  private static EMPTY: EnemyInstance[] = [];

  private _cellKey(c: number, r: number): string { return c + ',' + r; }
  private _cellCoord(v: number): number { return Math.floor(v / SPATIAL_CELL); }

  /** 重建空间网格（每帧由 SpatialSystem 调用） */
  buildSpatialGrid(): void {
    this._spatialGrid.clear();
    // 确保时间戳数组足够大
    if (this._queryStamps.length < ENEMY_POOL._maxSize) {
      this._queryStamps = new Uint32Array(ENEMY_POOL._maxSize);
    }
    for (const e of this._lists.enemies) {
      if (e.dead) continue;
      const key = this._cellKey(this._cellCoord(e.x), this._cellCoord(e.y));
      let cell = this._spatialGrid.get(key);
      if (!cell) { cell = []; this._spatialGrid.set(key, cell); }
      cell.push(e);
    }
  }

  /** 返回 (x,y) 周围相邻 cell 内的所有敌人（去重，基于时间戳避免 Set 分配） */
  neighborEnemies(x: number, y: number, radius?: number): EnemyInstance[] {
    // 网格为空时直接返回共享空数组，避免分配
    if (this._spatialGrid.size === 0) return World.EMPTY;
    this._queryId++;
    // 溢出保护：重置所有时间戳
    if (this._queryId >= 0xFFFFFFFF) {
      this._queryId = 1;
      this._queryStamps.fill(0);
    }
    const col = this._cellCoord(x), row = this._cellCoord(y);
    const cellR = radius !== undefined ? Math.ceil(radius / SPATIAL_CELL) : 1;
    const out: EnemyInstance[] = [];
    for (let dc = -cellR; dc <= cellR; dc++) {
      for (let dr = -cellR; dr <= cellR; dr++) {
        const cell = this._spatialGrid.get(this._cellKey(col + dc, row + dr));
        if (!cell) continue;
        for (const e of cell) {
          const idx = e._idx;
          if (idx === undefined) {
            out.push(e);
            continue;
          }
          if (this._queryStamps[idx] !== this._queryId) {
            this._queryStamps[idx] = this._queryId;
            out.push(e);
          }
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

  markCompactDirty(type: EntityType): void {
    this._compactDirty[type] = true;
  }

  query<K extends EntityType>(type: K): EntityTypeMap[K][] {
    return this._lists[type];
  }

  compact<K extends EntityType>(type: K, isDeadFn?: (e: EntityTypeMap[K]) => boolean): void {
    const entry = POOL_MAP[type];
    const fn = isDeadFn || entry.deadFn;
    entry.pool.compact(this._lists[type], fn);
  }

  /** 批量压缩所有实体池（在全部系统更新完成后统一调用，替代各系统分别 compact） */
  compactAll(): void {
    this._compactFrame++;

    if (this._compactDirty.projectiles) {
      this.compact('projectiles', pr => !!pr.dead);
      this._compactDirty.projectiles = false;
    }
    if (this._compactDirty.drops) {
      this.compact('drops', d => !!d.take);
      this._compactDirty.drops = false;
    }
    if (this._compactDirty.enemies) {
      this.compact('enemies', e => !!e.dead);
      this._compactDirty.enemies = false;
    }
    if (this._compactDirty.phantoms) {
      this.compact('phantoms', ph => ph.t >= ph.max);
      this._compactDirty.phantoms = false;
    }

    // 粒子自然过期非常频繁，按帧降频压缩，避免每帧全池扫描。
    if (this._compactDirty.particles || this._compactFrame % 4 === 0) {
      this.compact('particles', pa => (pa.t || 0) >= (pa.max || 0.7));
      this._compactDirty.particles = false;
    }
  }

  resetAll(): void {
    for (const type of Object.keys(POOL_MAP) as EntityType[]) {
      POOL_MAP[type].pool.count = 0;
      this._lists[type].length = 0;
      this._compactDirty[type] = false;
    }
  }

  getPool<K extends EntityType>(type: K): EntityPool<EntityTypeMap[K]> {
    return POOL_MAP[type].pool;
  }

  get initialized(): boolean { return this._initialized; }
}

/** 单例 */
export const world = new World();
