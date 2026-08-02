/* =========================================================
   蚀月远征 · 全局状态聚合层
   状态切片导出 + 便捷工具函数
   ========================================================= */
import { STATE, sm } from './core/states.js';
import { renderState } from './state/render.js';

/* 重新导出 Store 实例，供各模块直接导入使用 */
export { playerState } from './state/player.js';
export { stageState } from './state/stage.js';
export { statsState } from './state/stats.js';
export { renderState } from './state/render.js';
export { inputState } from './state/input.js';
export { entityState } from './state/entities.js';
export { gameState } from './state/game.js';

/* 重新导出状态常量与状态机实例 */
export { STATE, sm } from './core/states.js';

/* 震屏 */
export function shakeScreen(n: number): void {
  renderState.set('shake', Math.max(renderState.get('shake'), n));
}

/* 关卡结算 */
export function endStage(_early?: boolean): void {
  sm.transition(STATE.SHOP);
}

/* 玩家死亡 */
export function playerDeath(): void {
  sm.transition(STATE.OVER);
}
