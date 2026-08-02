/* =========================================================
   蚀月远征 · 空间哈希网格（向后兼容重新导出）
   核心逻辑已迁移至 SpatialSystem 静态方法
   ========================================================= */
import { SpatialSystem } from './systems/SpatialSystem.js';

// 重新导出静态方法，保持所有现有导入正常工作
export const buildSpatialGrid = SpatialSystem.buildSpatialGrid;
export const queryRadius = SpatialSystem.queryRadius;
export const nearestInGrid = SpatialSystem.nearestInGrid;
export const _neighborEnemies = SpatialSystem.neighborEnemies;