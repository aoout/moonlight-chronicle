// @ts-check
/* =========================================================
   蚀月远征 · 调试：实体监视器
   显示当前实体数量（敌人/投射物/粒子/掉落物）
   ========================================================= */
import { G } from '../state.js';

/**
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawEntityMonitor(ctx) {
  if (!ctx) return;
  const y = 4;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(4, y, 140, 80);
  ctx.font = '11px monospace';
  ctx.textBaseline = 'top';
  let line = 0;

  ctx.fillStyle = '#ccc';
  ctx.fillText('Enemies: ' + G.enemies.length, 10, y + 4 + line++ * 16);
  ctx.fillText('Projectiles: ' + G.projectiles.length, 10, y + 4 + line++ * 16);
  ctx.fillText('Particles: ' + G.particles.length, 10, y + 4 + line++ * 16);
  ctx.fillText('Drops: ' + G.drops.length, 10, y + 4 + line++ * 16);
  ctx.fillText('Phantoms: ' + G.phantoms.length, 10, y + 4 + line++ * 16);

  ctx.restore();
}