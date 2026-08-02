// @ts-check
/* =========================================================
   蚀月远征 · ECS System：空间哈希网格重建
   ========================================================= */
import { System } from '../core/system.js';
import { buildSpatialGrid } from '../spatial.js';

export class SpatialSystem extends System {
  name = 'SpatialSystem';

  /** @param {number} dt */
  update(dt) {
    buildSpatialGrid();
  }
}