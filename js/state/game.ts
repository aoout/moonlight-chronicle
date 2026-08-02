/* =========================================================
   蚀月远征 · 状态切片：游戏流程
   状态机当前态、面板开关、恢复态、时间缩放、回响减速
   ========================================================= */
import { Store } from '../core/store.js';
import { STATE } from '../core/states.js';

interface GameStateSlice {
  /* 状态机当前态（由 sm.onTransition 同步） */
  state: string;
  /* 面板开关 */
  levelUpOpen: boolean;
  shopOpen: boolean;
  /* 升级/商店关闭后恢复到的状态 */
  _resumeState: string;
  /* 时停缩放（1=正常，0.15=时停激活） */
  _timeScale: number;
  /* 回响减速持续时间 */
  _echoSlowT: number;
}

const INITIAL: GameStateSlice = {
  state: STATE.MENU,
  levelUpOpen: false,
  shopOpen: false,
  _resumeState: STATE.PLAYING,
  _timeScale: 1,
  _echoSlowT: 0,
};

export const gameState = new Store<GameStateSlice>(INITIAL);

/** 便捷访问 */
export const gmState = () => gameState.state;
