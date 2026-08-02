/* =========================================================
   蚀月远征 · 渲染层：环绕武器绘制
   ========================================================= */
import { PALETTE } from '../../palette.js';
import type { RenderContext } from '../context.js';

export function drawOrbitWeapons(rc: RenderContext): void {
  const p = rc.player;
  if (!p || !p.orbits || !p.orbits.length) return;
  const ctx = rc.ctx;
  if (!ctx) return;
  for (const o of p.orbits) {
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.rotate(o.a + 1.57);
    ctx.shadowColor = PALETTE.gold; ctx.shadowBlur = 14;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, 6.28);
    ctx.arc(3.5, 0, 4.5, 0, 6.28, true);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(-2, -2, 1.8, 0, 6.28); ctx.fill();
    ctx.restore();
  }
}
