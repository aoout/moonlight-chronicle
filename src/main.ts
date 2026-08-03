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

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
renderState.set('canvas', canvas);
renderState.set('ctx', canvas.getContext('2d'));

const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
renderState.set('ctxBg', bgCanvas.getContext('2d'));

function resize(): void {
  renderState.set('width', window.innerWidth);
  renderState.set('height', window.innerHeight);
  canvas.width = renderState.get('width');
  canvas.height = renderState.get('height');
  bgCanvas.width = renderState.get('width');
  bgCanvas.height = renderState.get('height');
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
requestAnimationFrame(gameLoop);

// 阻止方向键滚动
window.addEventListener('keydown', e => {
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});