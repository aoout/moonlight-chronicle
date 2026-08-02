/* =========================================================
   蚀月远征 · 渲染上下文
   聚合所有渲染所需数据，消除渲染函数对各 Store 的直接依赖
   ========================================================= */
import { renderState } from '../state/render.js';
import { playerState } from '../state/player.js';
import { stageState } from '../state/stage.js';
import { entityState } from '../state/entities.js';
import type { Player, EnemyInstance } from '../types/core.d.ts';

const rSt = () => renderState.state;
const pSt = () => playerState.state;
const gSt = () => stageState.state;
const eSt = () => entityState.state;

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
    ctx: rSt().ctx,
    ctxBg: rSt().ctxBg,
    player: pSt().player,
    boss: gSt().boss,
    enemies: eSt().enemies,
    projectiles: eSt().projectiles,
    drops: eSt().drops,
    particles: eSt().particles,
    phantoms: eSt().phantoms,
    time: gSt().time,
    shake: rSt().shake,
    hitFlash: rSt().hitFlash,
    width: rSt().width,
    height: rSt().height,
  };
}
