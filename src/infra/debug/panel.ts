/* =========================================================
   蚀月远征 · 调试面板
   集成所有调试工具，按 F3 切换显示
   ========================================================= */
import { FPSCounter, DrawCallCounter, systemProfiler } from './performance.js';
import { drawEntityMonitor } from './entity_monitor.js';
import { drawSpatialDebug } from './spatial_debug.js';
import { drawBenchUI, bindBenchKeys, runBenchmark, cancelBenchmark, exportReportHTML, exportComparisonHTML, getLastReport, getAllReports } from './bench/index.js';
import { addUnderlay, addOverlay } from '../../features/render/overlays.js';

let _visible = false;
let _showGrid = false;

export const fps = new FPSCounter();
export const profiler = systemProfiler;
export const drawCalls = new DrawCallCounter();

// 挂载到 window 以便其他模块访问
if (typeof window !== 'undefined') {
  (window as any).__profiler = profiler;
  (window as any).__bench = { runBenchmark, cancelBenchmark, exportReportHTML, exportComparisonHTML, getLastReport, getAllReports };
}

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
  if (!ctx) return;
  // 基准测试 UI 独立于 F3 调试面板：按 F5 后应立即可见
  drawBenchUI(ctx);
  if (!_visible) return;

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
  // 把调试绘制挂到渲染层预留的插槽上（z-order 与原先完全一致）：
  //   underlay = 实体之下 / 世界空间，overlay = 全部之上 / 屏幕空间
  addUnderlay(renderSpatialDebug);
  addOverlay(renderDebug);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F3') {
      e.preventDefault();
      toggleDebug();
    } else if (e.key === 'F4') {
      e.preventDefault();
      toggleGrid();
    }
  });
  bindBenchKeys();  // F5 运行基准测试，F6 切换 UI
}
