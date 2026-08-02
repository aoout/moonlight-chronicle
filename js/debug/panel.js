// @ts-check
/* =========================================================
   蚀月远征 · 调试面板
   集成所有调试工具，按 F3 切换显示
   ========================================================= */
import { G } from '../state.js';
import { FPSCounter, SystemProfiler, DrawCallCounter } from './performance.js';
import { drawEntityMonitor } from './entity_monitor.js';
import { drawSpatialDebug } from './spatial_debug.js';

/** @type {boolean} */
let _visible = false;
/** @type {boolean} */
let _showGrid = false;

export const fps = new FPSCounter();
export const profiler = new SystemProfiler();
export const drawCalls = new DrawCallCounter();

// 挂载到 window 以便其他模块访问
/** @type {any} */ (window).__profiler = profiler;

/**
 * 切换调试面板显示
 */
export function toggleDebug() {
  _visible = !_visible;
}

/**
 * 切换网格可视化
 */
export function toggleGrid() {
  _showGrid = !_showGrid;
}

/**
 * 在游戏画布上渲染调试信息
 * @param {CanvasRenderingContext2D} ctx
 */
export function renderDebug(ctx) {
  if (!_visible || !ctx) return;

  fps.update(ctx);
  fps.draw(ctx);
  profiler.draw(ctx);
  drawCalls.draw(ctx);
  drawEntityMonitor(ctx);
}

/**
 * 渲染空间网格调试
 * @param {CanvasRenderingContext2D} ctx
 */
export function renderSpatialDebug(ctx) {
  if (!_showGrid || !ctx) return;
  drawSpatialDebug(ctx);
}

/**
 * 绑定键盘事件（F3 切换面板，F4 切换网格）
 */
export function bindDebugKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F3') {
      e.preventDefault();
      toggleDebug();
    } else if (e.key === 'F4') {
      e.preventDefault();
      toggleGrid();
    }
  });
}