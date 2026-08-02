// @ts-check
/* =========================================================
   蚀月远征 · 渲染层入口
   合并子模块并导出统一 render 函数
   ========================================================= */
import { rand } from '../utils.js';
import { drawBackground } from './background.js';
import { drawEnemies, drawPlayer, drawPhantoms } from './entities.js';
import { drawDrops, drawProjectiles, drawOrbitWeapons, drawParticles } from './effects.js';
import { drawBossBar } from './hud.js';
import { renderDebug, renderSpatialDebug } from '../debug/panel.js';
import { createRenderContext } from './context.js';

export { ENEMY_SHAPES } from './layers/enemies.js';
export { BOSS_SHAPES } from './layers/bosses.js';

export function render() {
  const rc = createRenderContext();

  // ---- 背景层（bg-canvas）：不参与 shake，免 clearRect ----
  drawBackground(rc);

  // ---- 游戏层（game-canvas）：每帧清空 + shake ----
  const ctx = rc.ctx;
  if (!ctx) return;
  ctx.save();
  ctx.clearRect(0, 0, rc.width, rc.height);
  if (rc.shake > 0.5) {
    ctx.translate(rand(-rc.shake, rc.shake) * 0.4, rand(-rc.shake, rc.shake) * 0.4);
  }
  renderSpatialDebug(ctx);
  drawDrops(rc);
  drawEnemies(rc);
  drawPlayer(rc);
  drawPhantoms(rc);
  drawOrbitWeapons(rc);
  drawProjectiles(rc);
  drawParticles(rc);
  ctx.restore();
  drawBossBar(rc);
  renderDebug(ctx);
}