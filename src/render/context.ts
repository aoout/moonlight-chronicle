/* =========================================================
   蚀月远征 · 渲染上下文
   聚合所有渲染所需数据，消除渲染函数对各 Store 的直接依赖
   ========================================================= */
import { rSt, pSt, gSt, eSt } from '../state/accessors.js';
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

/** 可复用的渲染上下文对象（避免每帧分配） */
const _rc: RenderContext = {
  ctx: null,
  ctxBg: null,
  player: null,
  boss: null,
  enemies: [],
  projectiles: [],
  drops: [],
  particles: [],
  phantoms: [],
  time: 0,
  shake: 0,
  hitFlash: 0,
  width: 0,
  height: 0,
};

/**
 * 创建当前帧的渲染上下文（复用对象，避免每帧分配新对象）
 * 注意：返回的对象仅在当前帧内有效，不可跨帧持有引用
 */
export function createRenderContext(): RenderContext {
  _rc.ctx = rSt().ctx;
  _rc.ctxBg = rSt().ctxBg;
  _rc.player = pSt().player;
  _rc.boss = gSt().boss;
  _rc.enemies = eSt().enemies;
  _rc.projectiles = eSt().projectiles;
  _rc.drops = eSt().drops;
  _rc.particles = eSt().particles;
  _rc.phantoms = eSt().phantoms;
  _rc.time = gSt().time;
  _rc.shake = rSt().shake;
  _rc.hitFlash = rSt().hitFlash;
  _rc.width = rSt().width;
  _rc.height = rSt().height;
  return _rc;
}
