// @ts-check
/* =========================================================
   蚀月远征 · 渲染层入口
   合并子模块并导出统一 render 函数
   ========================================================= */
import { G } from '../state.js';
import { rand } from '../utils.js';
import { drawBackground } from './background.js';
import { drawEnemies, drawPlayer, drawPhantoms } from './entities.js';
import { drawDrops, drawProjectiles, drawOrbitWeapons, drawParticles } from './effects.js';
import { drawBossBar } from './hud.js';
import { renderDebug, renderSpatialDebug } from '../debug/panel.js';

export { ENEMY_SHAPES } from './layers/enemies.js';
export { BOSS_SHAPES } from './layers/bosses.js';

export function render() {
  // ---- 背景层（bg-canvas）：不参与 shake，免 clearRect ----
  drawBackground();

  // ---- 游戏层（game-canvas）：每帧清空 + shake ----
  const ctx = G.ctx;
  if (!ctx) return;
  ctx.save();
  ctx.clearRect(0, 0, G.width, G.height);
  if (G.shake > 0.5) {
    ctx.translate(rand(-G.shake, G.shake) * 0.4, rand(-G.shake, G.shake) * 0.4);
  }
  renderSpatialDebug(ctx);
  drawDrops();
  drawEnemies();
  drawPlayer();
  drawPhantoms();
  drawOrbitWeapons();
  drawProjectiles();
  drawParticles();
  ctx.restore();
  drawBossBar();
  renderDebug(ctx);
}