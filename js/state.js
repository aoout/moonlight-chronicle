// @ts-check
/* =========================================================
   蚀月远征 · 全局状态 + 状态常量 + 状态机
   状态切片策略：G 是向后兼容的聚合层，新代码可直接导入切片
   ========================================================= */
import { CONFIG } from './data/index.js';
import { StateMachine } from './core/state_machine.js';
import { playerState } from './state/player.js';
import { stageState } from './state/stage.js';
import { statsState } from './state/stats.js';
import { renderState } from './state/render.js';
import { inputState } from './state/input.js';
import { entityState } from './state/entities.js';

/* 重新导出切片，供新代码直接导入使用 */
export { playerState } from './state/player.js';
export { stageState } from './state/stage.js';
export { statsState } from './state/stats.js';
export { renderState } from './state/render.js';
export { inputState } from './state/input.js';
export { entityState } from './state/entities.js';

/* 游戏状态常量枚举 */
/** @type {{ MENU: string, PLAYING: string, LEVELUP: string, SHOP: string, OVER: string, WIN: string, RESULT: string }} */
export const STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  LEVELUP: 'levelup',
  SHOP: 'shop',
  OVER: 'over',
  WIN: 'win',
  RESULT: 'result',
};

/* 状态机定义 */
export const sm = new StateMachine({
  initial: STATE.MENU,
  states: {
    [STATE.MENU]:     { transitions: [STATE.PLAYING] },
    [STATE.PLAYING]:  { transitions: [STATE.LEVELUP, STATE.SHOP, STATE.OVER, STATE.WIN, STATE.MENU] },
    [STATE.LEVELUP]:  { transitions: [STATE.PLAYING] },
    [STATE.SHOP]:     { transitions: [STATE.PLAYING] },
    [STATE.OVER]:     { transitions: [STATE.RESULT] },
    [STATE.WIN]:      { transitions: [STATE.RESULT] },
    [STATE.RESULT]:   { transitions: [STATE.MENU, STATE.PLAYING] },
  },
});

/** @type {import('./types/core.d.ts').GState} */
export const G = {
  state: STATE.MENU,          // 由状态机同步更新
  // 领域切片在此展开为平面属性，使 G.* 访问保持不变
  ...playerState,
  ...stageState,
  ...statsState,
  ...renderState,
  ...inputState,
  ...entityState,
  // 运行时动态属性（不在切片中，由各模块动态设置）
  stageMax: CONFIG.STAGE_TIME,
  xpNeeded: CONFIG.XP_PER_LEVEL,
  levelUpOpen: false,
  shopOpen: false,
  _resumeState: STATE.PLAYING,
};

// 状态机同步：每次状态转换后更新 G.state
sm.onTransition('*', '*', () => { G.state = sm.current; });

/* 震屏 */

/**
 * @param {number} n
 */
export function shakeScreen(n) { G.shake = Math.max(G.shake, n); }

/* 关卡结算 */

/**
 * @param {boolean} [_early]
 */
export function endStage(_early) {
  sm.transition(STATE.SHOP);
}

/* 玩家死亡 */
export function playerDeath() {
  sm.transition(STATE.OVER);
}