/* =========================================================
   蚀月远征 · 入口
   ========================================================= */
import { renderState, resizeCanvas } from './state/render.js';
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
import { initTouch, showJoystick, hideJoystick } from './input/touch.js';
import { initOrientation } from './input/orientation.js';
import { STATE, sm } from './core/states.js';
import { EventBus } from './core/event_bus.js';
import './state/settings.js';   // 模块加载即恢复辉光调校，供首帧 resize 使用

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
renderState.set('canvas', canvas);
renderState.set('ctx', canvas.getContext('2d'));

const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
renderState.set('bgCanvas', bgCanvas);
renderState.set('ctxBg', bgCanvas.getContext('2d'));

// 防抖 resize：利用 rAF 合并多次 resize 事件为每帧最多一次重排
let _resizePending = false;
function resize(): void {
  if (_resizePending) return;
  _resizePending = true;
  requestAnimationFrame(() => {
    resizeCanvas();
    _resizePending = false;
  });
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => {
  // 方向变化后延迟 resize，等浏览器完成布局
  setTimeout(resize, 300);
});
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
initTouch();
initOrientation();
requestAnimationFrame(gameLoop);

// 摇杆可见性：进入 PLAYING 时显示，离开 PLAYING 时隐藏
sm.onEnter(STATE.PLAYING, () => showJoystick());
[STATE.MENU, STATE.LEVELUP, STATE.SHOP, STATE.RESULT].forEach(s => {
  sm.onEnter(s, () => hideJoystick());
});

// 暂停时隐藏摇杆，恢复时显示
EventBus.on('pause:open', () => hideJoystick());
EventBus.on('pause:close', () => {
  if (sm.is(STATE.PLAYING)) showJoystick();
});

// 阻止方向键滚动
window.addEventListener('keydown', e => {
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});