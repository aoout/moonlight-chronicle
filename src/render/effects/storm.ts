/* =========================================================
   蚀月远征 · 渲染层：风暴之眼核心绘制（离屏缓存）
   ========================================================= */
import type { RenderContext } from '../context.js';
import { shapeCache } from '../shape_cache.js';

const STORM_CACHE_SIZE = 36;

/* 预渲染风暴内核 */
function drawStormCore(ctx: CanvasRenderingContext2D): void {
  const cx = STORM_CACHE_SIZE / 2, cy = STORM_CACHE_SIZE / 2;
  // 外层旋风轨迹环
  ctx.shadowColor = 'rgba(143,227,216,0.6)';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = 'rgba(143,227,216,0.35)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 11, 0, 4.8);
  ctx.stroke();
  // 中层旋转环
  ctx.shadowBlur = 10;
  ctx.strokeStyle = 'rgba(143,227,216,0.55)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 2.8, 5.6);
  ctx.stroke();
  // 内核渐变球
  ctx.shadowBlur = 12;
  const grad = ctx.createRadialGradient(cx - 2, cy - 2, 0.5, cx, cy, 7);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.25, '#8fe3d8');
  grad.addColorStop(0.55, 'rgba(143,227,216,0.5)');
  grad.addColorStop(0.85, 'rgba(143,227,216,0.12)');
  grad.addColorStop(1, 'rgba(143,227,216,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, 6.28);
  ctx.fill();
  // 中心亮核
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.2, 0, 6.28);
  ctx.fill();
}

export function drawStormCores(rc: RenderContext): void {
  const p = rc.player;
  if (!p || !p.effects.stormCores || !p.effects.stormCores.length) return;
  const ctx = rc.ctx;
  if (!ctx) return;
  const stormCache = shapeCache.get('storm_core', STORM_CACHE_SIZE, STORM_CACHE_SIZE, drawStormCore);
  for (const s of p.effects.stormCores) {
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.drawImage(stormCache, -STORM_CACHE_SIZE / 2, -STORM_CACHE_SIZE / 2);
    ctx.restore();
  }
}
