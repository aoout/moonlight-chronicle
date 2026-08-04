/* =========================================================
   蚀月远征 · 状态常量与状态机实例
   独立于 state.ts，避免状态切片导入时的循环依赖
   ========================================================= */
import { achOnStageCleared } from '../systems/AchievementSystem.js';
import { StateMachine } from './state_machine.js';

/* 游戏状态常量枚举 */
export const STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  LEVELUP: 'levelup',
  SHOP: 'shop',
  OVER: 'over',
  WIN: 'win',
  RESULT: 'result',
} as const;

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

/* ---------- 状态机便捷操作 ---------- */

/** 关卡结算（进入商店） */
export function endStage(_early?: boolean): void {
  achOnStageCleared();
  sm.transition(STATE.SHOP);
}

/** 玩家死亡 */
export function playerDeath(): void {
  sm.transition(STATE.OVER);
}
