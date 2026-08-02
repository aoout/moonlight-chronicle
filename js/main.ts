/* =========================================================
   蚀月远征 · 入口
   ========================================================= */
import { renderState } from './state/render.js';
import { fillIconSpans } from './ui/icons.js';
import { bindUI } from './ui/scheduler.js';
import { gameLoop } from './game.js';
import { bindDebugKeys } from './debug/panel.js';

const rSt = () => renderState.state;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
rSt().canvas = canvas;
rSt().ctx = canvas.getContext('2d');

const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
rSt().ctxBg = bgCanvas.getContext('2d');

function resize(): void {
  rSt().width = window.innerWidth;
  rSt().height = window.innerHeight;
  canvas.width = rSt().width;
  canvas.height = rSt().height;
  bgCanvas.width = rSt().width;
  bgCanvas.height = rSt().height;
}
window.addEventListener('resize', resize);
resize();

bindUI();
bindDebugKeys();
fillIconSpans();
requestAnimationFrame(gameLoop);

// 阻止方向键滚动
window.addEventListener('keydown', e => {
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});
