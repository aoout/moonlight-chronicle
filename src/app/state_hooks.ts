/* =========================================================
   蚀月远征 · 状态机钩子注册
   将 gameLoop 中的 UI 轮询逻辑移至状态机钩子，
   消除 game.ts ↔ scheduler.ts 循环依赖
   ========================================================= */
import { STATE, sm } from '../engine/core/states.js';
import { gameState } from '../state/flow.js';
import { stageState } from '../state/stage.js';
import { statsState } from '../state/stats.js';
import { startRun, startStage } from '../commands/run.js';
import { openLevelUp, openResult } from '../features/ui/scheduler.js';
import { openShop } from '../features/ui/shop/index.js';
import { EventBus } from '../engine/core/event_bus.js';

/**
 * 注册所有状态机钩子。
 * 在游戏启动时（main.ts）调用一次。
 */
export function initStateHooks(): void {
  // ----- 进入 LEVELUP 时打开升级面板 -----
  sm.onEnter(STATE.LEVELUP, () => {
    gameState.set('levelUpOpen', true);
    try { openLevelUp(); }
    catch (err) {
      gameState.set('levelUpOpen', false);
      console.error('升级界面打开失败，重试:', err);
    }
  });

  // ----- 离开 LEVELUP 时重置面板标志 -----
  sm.onExit(STATE.LEVELUP, () => {
    gameState.set('levelUpOpen', false);
  });

  // ----- 进入 SHOP 时打开商店面板 -----
  sm.onEnter(STATE.SHOP, () => {
    gameState.set('shopOpen', true);
    openShop();
  });

  // ----- 离开 SHOP 时重置面板标志 -----
  sm.onExit(STATE.SHOP, () => {
    gameState.set('shopOpen', false);
  });

  // ----- 从 PLAYING 进入 OVER 时打开结算并进入 RESULT 态 -----
  sm.onTransition(STATE.PLAYING, STATE.OVER, () => {
    const gs = stageState.state;
    EventBus.emit('game:runEnd', {
      win: false,
      stage: gs.stage,
      kills: statsState.state.kills,
      gold: statsState.state.gold,
    });
    openResult(false);
    sm.transition(STATE.RESULT);
  });

  // ----- 从 PLAYING 进入 WIN 时打开结算并进入 RESULT 态 -----
  sm.onTransition(STATE.PLAYING, STATE.WIN, () => {
    const gs = stageState.state;
    EventBus.emit('game:runEnd', {
      win: true,
      stage: gs.stage,
      kills: statsState.state.kills,
      gold: statsState.state.gold,
    });
    openResult(true);
    sm.transition(STATE.RESULT);
  });
}