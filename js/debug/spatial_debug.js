// @ts-check
/* =========================================================
   蚀月远征 · 调试：空间网格可视化
   绘制网格边界，高亮当前查询区域
   ========================================================= */
import { G } from '../state.js';

const CELL = 120;

/**
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawSpatialDebug(ctx) {
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.5;

  const w = G.width || 800;
  const h = G.height || 600;
  const cols = Math.ceil(w / CELL) + 2;
  const rows = Math.ceil(h / CELL) + 2;
  const ox = G.camera?.x || 0;
  const oy = G.camera?.y || 0;

  const startCol = Math.floor((ox - w / 2) / CELL);
  const startRow = Math.floor((oy - h / 2) / CELL);

  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const x = (startCol + c) * CELL - ox + w / 2;
      const y = (startRow + r) * CELL - oy + h / 2;
      ctx.strokeRect(x, y, CELL, CELL);
    }
  }

  ctx.restore();
}