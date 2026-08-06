/* =========================================================
   蚀月远征 · 渲染层：掉落物绘制（离屏缓存）
   ========================================================= */
import { PALETTE } from '../../../assets/palette.js';
import type { RenderContext } from '../context.js';
import { shapeCache } from '../shape_cache.js';

/* 预渲染金币和经验的形状（含阴影） */
function drawGoldShape(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PALETTE.gold;
  ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 10;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * 6.28 - 1.57;
    const r = 5.5;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fdf6dd';
  ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 6.28); ctx.fill();
}

function drawXpShape(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PALETTE.ice;
  ctx.shadowColor = PALETTE.ice; ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.lineTo(4.5, 0); ctx.lineTo(0, 6); ctx.lineTo(-4.5, 0);
  ctx.closePath(); ctx.fill();
}

const DROP_CACHE_SIZE = 32; // 足够容纳 5.5*2 + 10(阴影) 的范围

export function drawDrops(rc: RenderContext): void {
  const ctx = rc.ctx;
  if (!ctx) return;
  const goldCache = shapeCache.get('drop_gold', DROP_CACHE_SIZE, DROP_CACHE_SIZE, (bctx) => {
    bctx.translate(DROP_CACHE_SIZE / 2, DROP_CACHE_SIZE / 2);
    drawGoldShape(bctx);
  });
  const xpCache = shapeCache.get('drop_xp', DROP_CACHE_SIZE, DROP_CACHE_SIZE, (bctx) => {
    bctx.translate(DROP_CACHE_SIZE / 2, DROP_CACHE_SIZE / 2);
    drawXpShape(bctx);
  });
  for (const d of rc.drops) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.t * 2);
    ctx.drawImage(d.kind === 'gold' ? goldCache : xpCache, -DROP_CACHE_SIZE / 2, -DROP_CACHE_SIZE / 2);
    ctx.restore();
  }
}
