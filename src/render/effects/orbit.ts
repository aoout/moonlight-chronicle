/* =========================================================
   蚀月远征 · 渲染层：环绕武器绘制（月华之环）
   ========================================================= */
import { PALETTE } from '../../data/palette.js';
import type { RenderContext } from '../context.js';

const TAU = Math.PI * 2;

export function drawOrbitWeapons(rc: RenderContext): void {
  const p = rc.player;
  if (!p || !p.effects.orbits || !p.effects.orbits.length) return;
  const ctx = rc.ctx;
  if (!ctx) return;
  for (const o of p.effects.orbits) {
    ctx.save();
    ctx.translate(o.x, o.y);

    // 轨道余光（细圆环，随环绕缓慢转动）
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.rotate(o.a + 1.57);
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 16;

    // 月牙本体（渐变：外白内金）
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 10);
    grad.addColorStop(0, 'rgba(255,255,255,.9)');
    grad.addColorStop(0.6, PALETTE.gold);
    grad.addColorStop(1, PALETTE.gold);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, TAU); ctx.arc(3.6, 0, 4.8, 0, TAU, true); ctx.fill();

    // 外刃白线
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(0, 0, 7.2, -1.2, 1.2); ctx.stroke();

    // 刃尖光点（前后两端）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(6.2, 0, 1.1, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(-6.2, 0, 0.9, 0, TAU); ctx.fill();

    // 微光尾迹
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath(); ctx.arc(-9.5, Math.sin(o.a * 4) * 2, 1.2, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }
}
