/* =========================================================
   蚀月远征 · 状态切片：渲染
   震屏、闪烁、画布尺寸和上下文
   ========================================================= */
import { Store } from '../engine/core/store.js';
import { settingsState } from './settings.js';

export interface RenderState {
  shake: number;
  hitFlash: number;
  timestopTimer: number;
  width: number;
  height: number;
  dpr: number;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  bgCanvas: HTMLCanvasElement | null;
  ctxBg: CanvasRenderingContext2D | null;
}

const INITIAL: RenderState = {
  shake: 0,
  hitFlash: 0,
  timestopTimer: 0,
  width: 0,
  height: 0,
  dpr: 1,
  canvas: null,
  ctx: null,
  bgCanvas: null,
  ctxBg: null,
};

export const renderState = new Store<RenderState>(INITIAL);

/** 便捷访问 */
export const rState = () => renderState.state;

/** 震屏（受「月震」开关节制） */
export function shakeScreen(n: number): void {
  if (!settingsState.get('shake')) return;
  renderState.set('shake', Math.max(renderState.get('shake'), n));
}

/**
 * 依窗口尺寸与「月镜析度」重算画布物理像素。
 * 逻辑坐标（width/height）保持不变，仅 dpr 融合 devicePixelRatio 与 renderScale，
 * 渲染层统一以 dpr 变换，缩放即时全局生效。
 */
export function resizeCanvas(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = (window.devicePixelRatio || 1) * settingsState.get('renderScale');
  renderState.set('width', w);
  renderState.set('height', h);
  renderState.set('dpr', dpr);
  const canvas = renderState.get('canvas');
  if (canvas) {
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
  }
  const bgCanvas = renderState.get('bgCanvas');
  if (bgCanvas) {
    bgCanvas.width = Math.floor(w * dpr);
    bgCanvas.height = Math.floor(h * dpr);
  }
}
