// @ts-check
/* =========================================================
   蚀月远征 · ECS System：空间哈希网格（碰撞检测加速）
   单元格大小 120px，每帧重建
   所有空间查询方法作为静态方法暴露，供其他模块直接调用
   ========================================================= */
import { System } from '../core/system.js';
import { G } from '../state.js';
import { dist } from '../utils.js';

const SPATIAL_CELL = 120;
const _grid = new Map();

/**
 * @param {number} c
 * @param {number} r
 */
function _cellKey(c, r) { return c + ',' + r; }
/**
 * @param {number} v
 */
function _cellCoord(v) { return Math.floor(v / SPATIAL_CELL); }

export class SpatialSystem extends System {
  name = 'SpatialSystem';

  /**
   * 每帧重建网格
   * @param {number} dt
   */
  update(dt) {
    SpatialSystem.buildSpatialGrid();
  }

  /* =============================================================
     静态方法：空间查询（供 weapons/ 等模块直接调用）
     ============================================================= */

  /** 从 G.enemies 重建网格 */
  static buildSpatialGrid() {
    _grid.clear();
    for (const e of G.enemies) {
      if (e.dead) continue;
      const key = _cellKey(_cellCoord(e.x), _cellCoord(e.y));
      let cell = _grid.get(key);
      if (!cell) { cell = []; _grid.set(key, cell); }
      cell.push(e);
    }
  }

  /**
   * 返回 (x,y) 周围半径内的所有敌人（去重）
   * @param {number} x
   * @param {number} y
   * @param {number} [radius] 缺省时只查相邻 3×3 cell
   * @returns {any[]}
   */
  static neighborEnemies(x, y, radius) {
    const col = _cellCoord(x), row = _cellCoord(y);
    const cellR = radius !== undefined ? Math.ceil(radius / SPATIAL_CELL) : 1;
    const seen = new Set();
    const out = [];
    for (let dc = -cellR; dc <= cellR; dc++) {
      for (let dr = -cellR; dr <= cellR; dr++) {
        const cell = _grid.get(_cellKey(col + dc, row + dr));
        if (!cell) continue;
        for (const e of cell) {
          if (!seen.has(e)) { seen.add(e); out.push(e); }
        }
      }
    }
    return out;
  }

  /**
   * 半径范围查询
   * @param {number} x
   * @param {number} y
   * @param {number} r
   * @returns {any[]}
   */
  static queryRadius(x, y, r) {
    const r2 = r * r;
    const out = [];
    for (const e of SpatialSystem.neighborEnemies(x, y, r)) {
      const dx = e.x - x, dy = e.y - y;
      if (dx * dx + dy * dy <= r2) out.push(e);
    }
    return out;
  }

  /**
   * 最近邻（网格加速版）
   * @param {number} x
   * @param {number} y
   * @param {number} [maxR]
   * @returns {any|null}
   */
  static nearestInGrid(x, y, maxR) {
    const candidates = SpatialSystem.neighborEnemies(x, y, maxR);
    let best = null, bd = maxR === undefined ? 1e9 : maxR;
    for (const e of candidates) {
      const d = dist({ x, y }, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
}