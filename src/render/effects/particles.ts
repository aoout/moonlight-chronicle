/* =========================================================
   蚀月远征 · 渲染层：粒子绘制（离屏缓存优化）
   ========================================================= */
import { PALETTE } from '../../data/palette.js';
import type { RenderContext } from '../context.js';
import { shapeCache } from '../shape_cache.js';

/* 预渲染简单圆形粒子（含阴影） */
function drawCircleParticle(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(8, 8, 8, 0, 6.28); ctx.fill();
}

const PARTICLE_CIRCLE_SIZE = 16;

/* 预渲染星形粒子（8 角星，含阴影） */
function drawStarShape(ctx: CanvasRenderingContext2D, s: number, color: string): void {
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * 1.5708, r = i % 2 === 0 ? s : s * 0.35;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
}

/* 预渲染碎片粒子（菱形，含阴影） */
function drawShardShape(ctx: CanvasRenderingContext2D, s: number, color: string): void {
  ctx.fillStyle = color;
  ctx.shadowColor = color; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, -s); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.72, 0);
  ctx.closePath(); ctx.fill();
}

export function drawParticles(rc: RenderContext): void {
  const ctx = rc.ctx;
  if (!ctx) return;
  const list = rc.particles;
  const circleCache = shapeCache.get('particle_circle', PARTICLE_CIRCLE_SIZE, PARTICLE_CIRCLE_SIZE, drawCircleParticle);

  // ---- 批量绘制简单圆形粒子（使用缓存） ----
  ctx.save();
  for (const pa of list) {
    if (pa.chain || pa.ring || pa.spark || pa.star || pa.shard || pa.streak || pa.glow || pa.timestop || pa.echo) continue;
    const life = 1 - (pa.t || 0) / (pa.max || 0.7);
    ctx.globalAlpha = life;
    ctx.fillStyle = pa.color || '#fff';
    // 使用预渲染的圆形缓存，按实际大小缩放
    const s = pa.size || 3;
    ctx.drawImage(circleCache, pa.x - s, pa.y - s, s * 2, s * 2);
  }
  ctx.restore();

  // ---- 单独绘制复杂粒子 ----
  for (const pa of list) {
    if (!(pa.chain || pa.ring || pa.spark || pa.star || pa.shard || pa.streak || pa.glow || pa.timestop || pa.echo)) continue;
    const life = 1 - (pa.t || 0) / (pa.max || 0.7);
    ctx.save();
    if (pa.chain) {
      ctx.globalAlpha = life;
      ctx.strokeStyle = pa.color || '#fff'; ctx.lineWidth = 3;
      ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(pa.x1, pa.y1); ctx.lineTo(pa.x2, pa.y2); ctx.stroke();
      // 电弧白芯
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pa.x1, pa.y1); ctx.lineTo(pa.x2, pa.y2); ctx.stroke();
    } else if (pa.ring) {
      const k = pa.t / pa.max;
      ctx.globalAlpha = life * 0.9;
      ctx.strokeStyle = pa.color || '#fff'; ctx.lineWidth = Math.max(0.5, (pa.lw || 3) * (1 - k));
      ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, (pa.r0 || 4) + ((pa.r1 || 60) - (pa.r0 || 4)) * k, 0, 6.28); ctx.stroke();
    } else if (pa.spark) {
      ctx.globalAlpha = life;
      ctx.strokeStyle = pa.color || '#fff'; ctx.lineWidth = pa.size || 1.6;
      ctx.lineCap = 'round';
      ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pa.x - pa.vx * 0.055, pa.y - pa.vy * 0.055); ctx.stroke();
    } else if (pa.star) {
      ctx.globalAlpha = life;
      const baseSize = pa.size || 10;
      const color = pa.color || '#fff';
      const cacheKey = 'star_' + color + '_' + Math.round(baseSize);
      const cacheSize = Math.ceil(baseSize * 2) + 20;
      const starCache = shapeCache.get(cacheKey, cacheSize, cacheSize, (bctx) => {
        bctx.translate(cacheSize / 2, cacheSize / 2);
        drawStarShape(bctx, baseSize, color);
      });
      ctx.translate(pa.x, pa.y); ctx.rotate(pa.t * 6);
      const scale = 0.4 + 0.6 * life;
      ctx.scale(scale, scale);
      ctx.drawImage(starCache, -cacheSize / 2, -cacheSize / 2);
    } else if (pa.shard) {
      ctx.globalAlpha = life;
      const baseSize = pa.size || 3;
      const color = pa.color || '#fff';
      const cacheKey = 'shard_' + color + '_' + Math.round(baseSize * 10);
      const cacheSize = Math.ceil(baseSize * 2) + 12;
      const shardCache = shapeCache.get(cacheKey, cacheSize, cacheSize, (bctx) => {
        bctx.translate(cacheSize / 2, cacheSize / 2);
        drawShardShape(bctx, baseSize, color);
      });
      ctx.translate(pa.x, pa.y); ctx.rotate(pa.rot + pa.t * pa.vr);
      const scale = 0.5 + 0.5 * life;
      ctx.scale(scale, scale);
      ctx.drawImage(shardCache, -cacheSize / 2, -cacheSize / 2);
    } else if (pa.streak) {
      ctx.globalAlpha = life;
      ctx.translate(pa.x, pa.y); ctx.rotate(pa.ang);
      ctx.strokeStyle = pa.color || '#fff'; ctx.lineCap = 'round';
      ctx.shadowColor = pa.color || '#fff'; ctx.shadowBlur = 10;
      ctx.lineWidth = pa.w || 2;
      ctx.beginPath(); ctx.moveTo(-(pa.len || 26), 0); ctx.lineTo(0, 0); ctx.stroke();
    } else if (pa.glow) {
      const k = pa.t / pa.max;
      const r = Math.max(0.5, (pa.size || 14) * (0.5 + k * 0.8));
      ctx.globalAlpha = life * 0.45;
      // 径向渐变光晕替代 shadowBlur
      const g = ctx.createRadialGradient(pa.x, pa.y, 0, pa.x, pa.y, r + 9);
      g.addColorStop(0, pa.color || '#fff');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, r + 9, 0, 6.28); ctx.fill();
      ctx.fillStyle = pa.color || '#fff';
      ctx.beginPath(); ctx.arc(pa.x, pa.y, r, 0, 6.28); ctx.fill();
    } else if (pa.timestop) {
      ctx.globalAlpha = life * 0.25;
      ctx.fillStyle = PALETTE.ice;
      ctx.fillRect(0, 0, rc.width, rc.height);
    } else if (pa.echo) {
      ctx.globalAlpha = life;
      ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(pa.x, pa.y, Math.max(2, 14 + (0.7 - pa.t) * 30), 0, 6.28); ctx.stroke();
    }
    ctx.restore();
  }
}
