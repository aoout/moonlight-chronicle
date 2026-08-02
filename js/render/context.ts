/* =========================================================
   蚀月远征 · 渲染上下文
   聚合所有渲染所需数据，消除渲染函数对 G 的直接依赖
   ========================================================= */
import { G } from '../state.js';
import type { Player, EnemyInstance } from '../types/core.d.ts';

export interface RenderContext {
  ctx: CanvasRenderingContext2D | null;
  ctxBg: CanvasRenderingContext2D | null;
  player: Player | null;
  boss: EnemyInstance | null;
  enemies: EnemyInstance[];
  projectiles: any[];
  drops: any[];
  particles: any[];
  phantoms: any[];
  time: number;
  shake: number;
  hitFlash: number;
  width: number;
  height: number;
}

/**
 * 创建当前帧的渲染上下文
 */
export function createRenderContext(): RenderContext {
  return {
    ctx: G.ctx,
    ctxBg: G.ctxBg,
    player: G.player,
    boss: G.boss,
    enemies: G.enemies,
    projectiles: G.projectiles,
    drops: G.drops,
    particles: G.particles,
    phantoms: G.phantoms,
    time: G.time,
    shake: G.shake,
    hitFlash: G.hitFlash,
    width: G.width,
    height: G.height,
  };
}
