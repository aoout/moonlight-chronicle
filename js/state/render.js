/* =========================================================
   蚀月远征 · 状态切片：渲染
   震屏、闪烁、画布尺寸和上下文
   ========================================================= */

export const renderState = {
  shake: 0,
  hitFlash: 0,
  timestopTimer: 0,
  width: 0,
  height: 0,
  canvas: /** @type {HTMLCanvasElement|null} */ (null),
  ctx: /** @type {CanvasRenderingContext2D|null} */ (null),
  ctxBg: /** @type {CanvasRenderingContext2D|null} */ (null),
};