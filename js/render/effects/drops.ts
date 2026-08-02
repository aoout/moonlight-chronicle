/* =========================================================
   蚀月远征 · 渲染层：掉落物绘制
   ========================================================= */
import { PALETTE } from '../../palette.js';
import type { RenderContext } from '../context.js';

export function drawDrops(rc: RenderContext): void {
  const ctx = rc.ctx;
  if (!ctx) return;
  for (const d of rc.drops) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.t * 2);
    if (d.kind === 'gold') {
      // 星形金币 + 内芯
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
      ctx.fillStyle = '#fdf6dd';
      ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 6.28); ctx.fill();
    } else {
      // 菱形经验
      ctx.fillStyle = PALETTE.ice;
      ctx.shadowColor = PALETTE.ice; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(4.5, 0); ctx.lineTo(0, 6); ctx.lineTo(-4.5, 0);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
