/* =========================================================
   蚀月远征 · 入口
   ========================================================= */
import { renderState, resizeCanvas } from './state/render.js';
import { fillIconSpans } from './features/ui/icon_spans.js';
import { bindUI } from './features/ui/scheduler.js';
import { gameLoop } from './app/game.js';
import { initStateHooks } from './app/state_hooks.js';
import { bindDebugKeys } from './infra/debug/panel.js';
import { initRenderEventBridge } from './features/render/event_bridge.js';
import { initUIEventBridge } from './features/ui/event_bridge.js';
import { initPersistenceBridge } from './infra/persistence/event_bridge.js';
import { initHudReactive } from './features/ui/hud_reactive.js';
import { initGlassQuality } from './features/ui/glass_quality.js';
import { initGamepad } from './features/input/gamepad.js';
import { initHint } from './features/ui/gamepad_hint.js';
import { initTouch, showJoystick, hideJoystick } from './features/input/touch.js';
import { initOrientation } from './features/input/orientation.js';
import { STATE, sm } from './engine/core/states.js';
import { EventBus } from './engine/core/event_bus.js';
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
initPersistenceBridge();
initHudReactive();
initGlassQuality();
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