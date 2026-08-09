/* =========================================================
   蚀月远征 · 渲染层：粒子绘制（离屏缓存优化）
   ========================================================= */
import { TAU, HALF_PI } from '../../../engine/util/utils.js';
import { PALETTE } from '../../../assets/palette.js';
import type { RenderContext } from '../context.js';
import { shapeCache } from '../shape_cache.js';
import { settingsState } from '../../../state/settings.js';
import { PARTICLE_POOL } from '../../../engine/ecs/entity_pool.js';

/* 预渲染简单圆形粒子（含阴影） */
function drawCircleParticle(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = PALETTE.white;
  ctx.beginPath(); ctx.arc(8, 8, 8, 0, TAU); ctx.fill();
}

const PARTICLE_CIRCLE_SIZE = 16;

/* 预渲染星形粒子（8 角星，含阴影） */
function drawStarShape(ctx: CanvasRenderingContext2D, s: number, color: string): void {
  // 光晕层（径向渐变替代 shadowBlur）
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s + 8);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, s + 8, 0, Math.PI * 2); ctx.fill();
  // 星形
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4, r = i % 2 === 0 ? s : s * 0.35;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
}

/* 预渲染碎片粒子（菱形，含阴影） */
function drawShardShape(ctx: CanvasRenderingContext2D, s: number, color: string): void {
  // 光晕层（径向渐变替代 shadowBlur）
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s + 6);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, s + 6, 0, Math.PI * 2); ctx.fill();
  // 菱形
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s); ctx.lineTo(s * 0.72, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.72, 0);
  ctx.closePath(); ctx.fill();
}

/* 局部径向渐变光晕（与 bosses.ts 一致） */
function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'transparent');
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawParticles(rc: RenderContext): void {
  const ctx = rc.ctx;
  if (!ctx) return;
  // O7：直读 TypedArray。粒子池满 512 时，视图遍历每帧产生上万次 getter 调用，
  // 是 O1 之后最大的残留热点。渲染上下文里的粒子列表与池视图一一对应
  // （world.compact 同步 arr.length），故可直接按池的下标直读。
  const pool = PARTICLE_POOL;
  const data = pool._data;
  const stride = pool._stride;
  const off = pool._offsets;
  // color 等动态属性存于视图对象（addWith 的 else 分支），
  // 普通属性访问不经过 getter，比走 _meta 更快也更正确。
  const views = pool._views;
  const count = pool.count;
  const circleCache = shapeCache.get('particle_circle', PARTICLE_CIRCLE_SIZE, PARTICLE_CIRCLE_SIZE, drawCircleParticle);

  // ---- 批量绘制简单圆形粒子（使用缓存） ----
  ctx.save();
  for (let i = 0; i < count; i++) {
    const base = i * stride;
    // 复杂粒子判定：9 个标志位任一非 0 即跳过
    if (data[base + off.chain] || data[base + off.ring] || data[base + off.spark] ||
        data[base + off.star] || data[base + off.shard] || data[base + off.streak] ||
        data[base + off.glow] || data[base + off.timestop] || data[base + off.echo]) continue;
    const t = data[base + off.t] || 0, max = data[base + off.max] || 0.7;
    const life = 1 - t / max;
    ctx.globalAlpha = life;
    ctx.fillStyle = views[i].color || PALETTE.white;
    const s = data[base + off.size] || 3;
    ctx.drawImage(circleCache, data[base + off.x] - s, data[base + off.y] - s, s * 2, s * 2);
  }
  ctx.restore();

  // ---- 单独绘制复杂粒子 ----
  const glowFx = settingsState.get('glowFx');
  for (let i = 0; i < count; i++) {
    const base = i * stride;
    const isComplex = data[base + off.chain] || data[base + off.ring] || data[base + off.spark] ||
      data[base + off.star] || data[base + off.shard] || data[base + off.streak] ||
      data[base + off.glow] || data[base + off.timestop] || data[base + off.echo];
    if (!isComplex) continue;
    // 辉光溢彩关闭时：省略星芒 / 碎片 / 流光 / 光晕等重光效，保留命中反馈（电弧/冲击环/火花）
    if (!glowFx && (data[base + off.star] || data[base + off.shard] || data[base + off.streak] || data[base + off.glow])) continue;
    const t = data[base + off.t] || 0, max = data[base + off.max] || 0.7;
    const life = 1 - t / max;
    const color = views[i].color || PALETTE.white;
    const x = data[base + off.x], y = data[base + off.y];
    ctx.save();
    if (data[base + off.chain]) {
      ctx.globalAlpha = life;
      // 发光辅助线（替代 shadowBlur）
      ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.globalAlpha = life * 0.3;
      ctx.beginPath(); ctx.moveTo(data[base + off.x1], data[base + off.y1]); ctx.lineTo(data[base + off.x2], data[base + off.y2]); ctx.stroke();
      ctx.globalAlpha = life;
      ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(data[base + off.x1], data[base + off.y1]); ctx.lineTo(data[base + off.x2], data[base + off.y2]); ctx.stroke();
      // 电弧白芯
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(data[base + off.x1], data[base + off.y1]); ctx.lineTo(data[base + off.x2], data[base + off.y2]); ctx.stroke();
    } else if (data[base + off.ring]) {
      const k = t / max;
      ctx.globalAlpha = life * 0.9;
      ctx.strokeStyle = color; ctx.lineWidth = Math.max(0.5, (data[base + off.lw] || 3) * (1 - k));
      const ringR = (data[base + off.r0] || 4) + ((data[base + off.r1] || 60) - (data[base + off.r0] || 4)) * k;
      glow(ctx, x, y, ringR + 6, color, 0.3);
      ctx.beginPath(); ctx.arc(x, y, ringR, 0, TAU); ctx.stroke();
    } else if (data[base + off.spark]) {
      ctx.globalAlpha = life;
      ctx.lineCap = 'round';
      // 发光辅助线（替代 shadowBlur）
      ctx.strokeStyle = color; ctx.lineWidth = (data[base + off.size] || 1.6) + 4; ctx.globalAlpha = life * 0.25;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - data[base + off.vx] * 0.055, y - data[base + off.vy] * 0.055); ctx.stroke();
      ctx.globalAlpha = life;
      ctx.strokeStyle = color; ctx.lineWidth = data[base + off.size] || 1.6;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - data[base + off.vx] * 0.055, y - data[base + off.vy] * 0.055); ctx.stroke();
    } else if (data[base + off.star]) {
      ctx.globalAlpha = life;
      const baseSize = data[base + off.size] || 10;
      const cacheKey = 'star_' + color + '_' + Math.round(baseSize);
      const cacheSize = Math.ceil(baseSize * 2) + 20;
      const starCache = shapeCache.get(cacheKey, cacheSize, cacheSize, (bctx) => {
        bctx.translate(cacheSize / 2, cacheSize / 2);
        drawStarShape(bctx, baseSize, color);
      });
      ctx.translate(x, y); ctx.rotate(t * 6);
      const scale = 0.4 + 0.6 * life;
      ctx.scale(scale, scale);
      ctx.drawImage(starCache, -cacheSize / 2, -cacheSize / 2);
    } else if (data[base + off.shard]) {
      ctx.globalAlpha = life;
      const baseSize = data[base + off.size] || 3;
      const cacheKey = 'shard_' + color + '_' + Math.round(baseSize * 10);
      const cacheSize = Math.ceil(baseSize * 2) + 12;
      const shardCache = shapeCache.get(cacheKey, cacheSize, cacheSize, (bctx) => {
        bctx.translate(cacheSize / 2, cacheSize / 2);
        drawShardShape(bctx, baseSize, color);
      });
      ctx.translate(x, y); ctx.rotate((data[base + off.rot] || 0) + t * (data[base + off.vr] || 0));
      const scale = 0.5 + 0.5 * life;
      ctx.scale(scale, scale);
      ctx.drawImage(shardCache, -cacheSize / 2, -cacheSize / 2);
    } else if (data[base + off.streak]) {
      ctx.globalAlpha = life;
      ctx.translate(x, y); ctx.rotate(data[base + off.ang] || 0);
      ctx.lineCap = 'round';
      // 发光辅助线（替代 shadowBlur）
      ctx.strokeStyle = color; ctx.lineWidth = (data[base + off.w] || 2) + 6; ctx.globalAlpha = life * 0.25;
      ctx.beginPath(); ctx.moveTo(-(data[base + off.len] || 26), 0); ctx.lineTo(0, 0); ctx.stroke();
      ctx.globalAlpha = life;
      ctx.strokeStyle = color; ctx.lineWidth = data[base + off.w] || 2;
      ctx.beginPath(); ctx.moveTo(-(data[base + off.len] || 26), 0); ctx.lineTo(0, 0); ctx.stroke();
    } else if (data[base + off.glow]) {
      const k = t / max;
      const r = Math.max(0.5, (data[base + off.size] || 14) * (0.5 + k * 0.8));
      ctx.globalAlpha = life * 0.45;
      // 径向渐变光晕替代 shadowBlur
      const g = ctx.createRadialGradient(x, y, 0, x, y, r + 9);
      g.addColorStop(0, color);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r + 9, 0, TAU); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    } else if (data[base + off.timestop]) {
      ctx.globalAlpha = life * 0.25;
      ctx.fillStyle = PALETTE.ice;
      ctx.fillRect(0, 0, rc.width, rc.height);
    } else if (data[base + off.echo]) {
      ctx.globalAlpha = life;
      ctx.strokeStyle = PALETTE.gold; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, Math.max(2, 14 + (0.7 - t) * 30), 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
}
