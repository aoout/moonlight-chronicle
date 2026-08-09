/* =========================================================
   蚀月远征 · 入口
   ========================================================= */
import { EVENTS } from './engine/core/events.js';
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

// 蚀月之望（右上角残月 · 存档同步）：云同步模块（含 WebDAV 客户端与完整存档序列化）
// 体积较大且非首屏必需，改为点击残月时才动态加载；按钮显形联动则为启动期常驻逻辑。
const planetBtn = document.getElementById('btn-planet') as HTMLElement;
let _planetMod: typeof import('./features/ui/planet.js') | null = null;
let _planetLoading: Promise<typeof import('./features/ui/planet.js')> | null = null;
function loadPlanet(): Promise<typeof import('./features/ui/planet.js')> {
  _planetLoading ??= import('./features/ui/planet.js').then(m => { _planetMod = m; return m; });
  return _planetLoading;
}
planetBtn.onclick = () => {
  // 首次点击：加载模块并绑定面板事件后打开；之后 initPlanetUI 已接管按钮 onclick
  void loadPlanet().then(m => { m.initPlanetUI(); m.openPlanet(); }).catch(e => console.error('loadPlanet failed', e));
};
// 残月与主菜单同生共死：只在 MENU 状态显形，战斗/升级/商店/结算/暂停一律隐去
function setPlanetVisible(visible: boolean): void {
  planetBtn.classList.toggle('planet-hidden', !visible);
}
setTimeout(() => {
  if (sm.is(STATE.MENU)) setPlanetVisible(true);
}, sm.is(STATE.MENU) ? 600 : 0);
sm.onEnter(STATE.MENU, () => setPlanetVisible(true));
[STATE.PLAYING, STATE.LEVELUP, STATE.SHOP, STATE.CURSE, STATE.RESULT].forEach(s => {
  sm.onEnter(s, () => setPlanetVisible(false));
});
EventBus.on(EVENTS.PAUSE_OPEN, () => setPlanetVisible(false));
EventBus.on(EVENTS.PAUSE_CLOSE, () => setPlanetVisible(false));

// 摇杆可见性：进入 PLAYING 时显示，离开 PLAYING 时隐藏
sm.onEnter(STATE.PLAYING, () => showJoystick());
[STATE.MENU, STATE.LEVELUP, STATE.SHOP, STATE.CURSE, STATE.RESULT].forEach(s => {
  sm.onEnter(s, () => hideJoystick());
});

// 暂停时隐藏摇杆，恢复时显示
EventBus.on(EVENTS.PAUSE_OPEN, () => hideJoystick());
EventBus.on(EVENTS.PAUSE_CLOSE, () => {
  if (sm.is(STATE.PLAYING)) showJoystick();
});

// 阻止方向键滚动
window.addEventListener('keydown', e => {
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});