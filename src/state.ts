/* =========================================================
   蚀月远征 · 全局状态背向兼容层
   逐步迁移至直接导入各切片
   ========================================================= */
export { playerState } from './state/player.js';
export { stageState } from './state/stage.js';
export { statsState } from './state/stats.js';
export { renderState, shakeScreen } from './state/render.js';
export { inputState } from './state/input.js';
export { entityState } from './state/entities.js';
export { gameState } from './state/game.js';
export { STATE, sm, endStage, playerDeath } from './core/states.js';