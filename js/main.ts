/* =========================================================
   蚀月远征 · 入口
   ========================================================= */
import { G } from './state.js';
import { fillIconSpans } from './icons.js';
import { bindUI } from './ui.js';
import { gameLoop } from './game.js';
import { bindDebugKeys } from './debug/panel.js';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
G.canvas = canvas;
G.ctx = canvas.getContext('2d');

const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
G.ctxBg = bgCanvas.getContext('2d');

function resize(): void {
  G.width = window.innerWidth;
  G.height = window.innerHeight;
  canvas.width = G.width;
  canvas.height = G.height;
  bgCanvas.width = G.width;
  bgCanvas.height = G.height;
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
