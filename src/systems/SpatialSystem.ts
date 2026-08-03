/* =========================================================
   蚀月远征 · ECS System：空间哈希网格（碰撞检测加速）
   单元格大小 120px，每帧重建
   网格数据已移至 World 类，本系统仅负责触发重建
   ========================================================= */
import { System } from '../core/system.js';
import { container } from '../core/container.js';
import type { World } from '../ecs/World.js';
import type { EnemyInstance } from '../types/core.d.ts';

export class SpatialSystem extends System {
  name = 'SpatialSystem';

  update(_dt: number): void {
    container.resolve<World>('world').buildSpatialGrid();
  }
}

/* ---------- 兼容导出：直接调用 World 单例 ---------- */
import { world } from '../ecs/World.js';
export const queryRadius = (x: number, y: number, r: number) => world.queryRadius(x, y, r);
export const nearestInGrid = (x: number, y: number, maxR?: number, exclude?: EnemyInstance) => world.nearestInGrid(x, y, maxR, exclude);
export const neighborEnemies = (x: number, y: number, radius?: number) => world.neighborEnemies(x, y, radius);
export const buildSpatialGrid = () => world.buildSpatialGrid();