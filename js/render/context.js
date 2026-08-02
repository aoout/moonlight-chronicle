// @ts-check
/* =========================================================
   蚀月远征 · 渲染上下文
   聚合所有渲染所需数据，消除渲染函数对 G 的直接依赖
   ========================================================= */
import { G } from '../state.js';

/**
 * @typedef {Object} RenderContext
 * @property {CanvasRenderingContext2D|null} ctx 游戏画布上下文
 * @property {CanvasRenderingContext2D|null} ctxBg 背景画布上下文
 * @property {import('../types/core.d.ts').Player|null} player 玩家对象
 * @property {import('../types/core.d.ts').EnemyInstance|null} boss 当前 Boss
 * @property {import('../types/core.d.ts').EnemyInstance[]} enemies 敌人列表
 * @property {any[]} projectiles 投射物列表
 * @property {any[]} drops 掉落物列表
 * @property {any[]} particles 粒子列表
 * @property {any[]} phantoms 残像列表
 * @property {number} time 游戏时间
 * @property {number} shake 屏幕震动强度
 * @property {number} hitFlash 受击闪白
 * @property {number} width 画布宽度
 * @property {number} height 画布高度
 */

/**
 * 创建当前帧的渲染上下文
 * @returns {RenderContext}
 */
export function createRenderContext() {
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