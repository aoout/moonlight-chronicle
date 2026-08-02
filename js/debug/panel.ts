/* =========================================================
   蚀月远征 · 调试面板
   集成所有调试工具，按 F3 切换显示
   ========================================================= */
import { FPSCounter, SystemProfiler, DrawCallCounter } from './performance.js';
import { drawEntityMonitor } from './entity_monitor.js';
import { drawSpatialDebug } from './spatial_debug.js';

let _visible = false;
let _showGrid = false;

export const fps = new FPSCounter();
export const profiler = new SystemProfiler();
export const drawCalls = new DrawCallCounter();

// 挂载到 window 以便其他模块访问
(window as any).__profiler = profiler;

/**
 * 切换调试面板显示
 */
export function toggleDebug(): void {
  _visible = !_visible;
}

/**
 * 切换网格可视化
 */
export function toggleGrid(): void {
  _showGrid = !_showGrid;
}

/**
 * 在游戏画布上渲染调试信息
 */
export function renderDebug(ctx: any): void {
  if (!_visible || !ctx) return;

  fps.update(ctx);
  fps.draw(ctx);
  profiler.draw(ctx);
  drawCalls.draw(ctx);
  drawEntityMonitor(ctx);
}

/**
 * 渲染空间网格调试
 */
export function renderSpatialDebug(ctx: any): void {
  if (!_showGrid || !ctx) return;
  drawSpatialDebug(ctx);
}

/**
 * 绑定键盘事件（F3 切换面板，F4 切换网格）
 */
export function bindDebugKeys(): void {
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
