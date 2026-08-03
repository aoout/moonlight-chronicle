/* =========================================================
   蚀月远征 · 状态访问器集中导出
   所有模块统一从此导入状态快捷访问器
   避免每文件重复声明 const pSt = () => playerState.state
   ========================================================= */
import { playerState } from './player.js';
import { statsState } from './stats.js';
import { stageState } from './stage.js';
import { renderState } from './render.js';
import { gameState } from './game.js';
import { inputState } from './input.js';
import { entityState } from './entities.js';

export const pSt = () => playerState.state;
export const sSt = () => statsState.state;
export const gSt = () => stageState.state;
export const rSt = () => renderState.state;
export const gmSt = () => gameState.state;
export const iSt = () => inputState.state;
export const eSt = () => entityState.state;