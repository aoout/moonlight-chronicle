/* =========================================================
   蚀月远征 · 入口
   ========================================================= */
import { renderState } from './state/render.js';
import { fillIconSpans } from './ui/icons.js';
import { bindUI } from './ui/scheduler.js';
import { gameLoop } from './game.js';
import { initStateHooks } from './core/state_hooks.js';
import { bindDebugKeys } from './debug/panel.js';
import { initRenderEventBridge } from './render/event_bridge.js';
import { initUIEventBridge } from './ui/event_bridge.js';
import { initHudReactive } from './ui/hud_reactive.js';
import { initGamepad } from './input/gamepad.js';
import { initHint } from './ui/gamepad_hint.js';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
renderState.set('canvas', canvas);
renderState.set('ctx', canvas.getContext('2d'));

const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
renderState.set('ctxBg', bgCanvas.getContext('2d'));

// 防抖 resize：利用 rAF 合并多次 resize 事件为每帧最多一次重排
let _resizePending = false;
function resize(): void {
  if (_resizePending) return;
  _resizePending = true;
  requestAnimationFrame(() => {
    renderState.set('width', window.innerWidth);
    renderState.set('height', window.innerHeight);
    canvas.width = renderState.get('width');
    canvas.height = renderState.get('height');
    bgCanvas.width = renderState.get('width');
    bgCanvas.height = renderState.get('height');
    _resizePending = false;
  });
}
window.addEventListener('resize', resize);
resize();

bindUI();
initStateHooks();
initRenderEventBridge();
initUIEventBridge();
initHudReactive();
bindDebugKeys();
fillIconSpans();
initHint();
initGamepad();
requestAnimationFrame(gameLoop);

// 阻止方向键滚动
window.addEventListener('keydown', e => {
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});