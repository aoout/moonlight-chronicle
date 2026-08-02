/* =========================================================
   蚀月远征 · 状态切片：渲染
   震屏、闪烁、画布尺寸和上下文
   ========================================================= */
import { Store } from '../core/store.js';

interface RenderState {
  shake: number;
  hitFlash: number;
  timestopTimer: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  ctxBg: CanvasRenderingContext2D | null;
}

const INITIAL: RenderState = {
  shake: 0,
  hitFlash: 0,
  timestopTimer: 0,
  width: 0,
  height: 0,
  canvas: null,
  ctx: null,
  ctxBg: null,
};

export const renderState = new Store<RenderState>(INITIAL);

/** 便捷访问 */
export const rState = () => renderState.state;
