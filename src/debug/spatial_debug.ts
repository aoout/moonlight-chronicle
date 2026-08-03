/* =========================================================
   蚀月远征 · 调试：空间网格可视化
   绘制网格边界，高亮当前查询区域
   ========================================================= */
import { rSt } from '../state/accessors.js';

const CELL = 120;

export function drawSpatialDebug(ctx: any): void {
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 0.5;

  const w = rSt().width || 800;
  const h = rSt().height || 600;
  const cols = Math.ceil(w / CELL) + 2;
  const rows = Math.ceil(h / CELL) + 2;
  const ox = 0;
  const oy = 0;

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
