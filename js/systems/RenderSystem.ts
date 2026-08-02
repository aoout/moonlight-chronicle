/* =========================================================
   蚀月远征 · ECS System：渲染系统
   将渲染逻辑包装为 ECS System，使渲染层与游戏循环解耦
   ========================================================= */
import { System } from '../core/system.js';
import { rand } from '../utils.js';
import { drawBackground } from '../render/background.js';
import { drawEnemies, drawPlayer, drawPhantoms } from '../render/entities.js';
import { drawDrops, drawProjectiles, drawOrbitWeapons, drawParticles } from '../render/effects/index.js';
import { drawBossBar } from '../render/hud.js';
import { renderDebug, renderSpatialDebug } from '../debug/panel.js';
import { createRenderContext } from '../render/context.js';

export class RenderSystem extends System {
  name = 'RenderSystem';

  update(dt: number): void {
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
}
