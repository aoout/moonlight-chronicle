/* =========================================================
   蚀月远征 · 渲染层：环绕武器绘制（月华之环，离屏缓存）
   ========================================================= */
import { PALETTE } from '../../data/palette.js';
import type { RenderContext } from '../context.js';
import { shapeCache } from '../shape_cache.js';

const TAU = Math.PI * 2;
const ORBIT_CACHE_SIZE = 40;

/* 预渲染月牙本体 */
function drawOrbitBlade(ctx: CanvasRenderingContext2D): void {
  const cx = ORBIT_CACHE_SIZE / 2, cy = ORBIT_CACHE_SIZE / 2;
  // 月牙本体（渐变：外白内金）
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
  grad.addColorStop(0, 'rgba(255,255,255,.9)');
  grad.addColorStop(0.6, PALETTE.gold);
  grad.addColorStop(1, PALETTE.gold);
  ctx.fillStyle = grad;
  ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.arc(cx, cy, 7.5, 0, TAU); ctx.arc(cx + 3.6, cy, 4.8, 0, TAU, true); ctx.fill();
  ctx.shadowBlur = 0;
  // 外刃白线
  ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(cx, cy, 7.2, -1.2, 1.2); ctx.stroke();
  // 刃尖光点（前后两端）
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(cx + 6.2, cy, 1.1, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - 6.2, cy, 0.9, 0, TAU); ctx.fill();
}

export function drawOrbitWeapons(rc: RenderContext): void {
  const p = rc.player;
  if (!p || !p.effects.orbits || !p.effects.orbits.length) return;
  const ctx = rc.ctx;
  if (!ctx) return;
  const orbitCache = shapeCache.get('orbit_blade', ORBIT_CACHE_SIZE, ORBIT_CACHE_SIZE, drawOrbitBlade);
  for (const o of p.effects.orbits) {
    ctx.save();
    ctx.translate(o.x, o.y);
    // 轨道余光（细圆环，随环绕缓慢转动）
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
    // 月牙（使用缓存，旋转朝向）
    ctx.save();
    ctx.rotate(o.a + 1.57);
    ctx.drawImage(orbitCache, -ORBIT_CACHE_SIZE / 2, -ORBIT_CACHE_SIZE / 2);
    ctx.restore();
    // 微光尾迹
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(-9.5, Math.sin(o.a * 4) * 2, 1.2, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
