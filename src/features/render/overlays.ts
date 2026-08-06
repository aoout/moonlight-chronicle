/* =========================================================
   蚀月远征 · 渲染叠加层插槽（依赖倒置）
   渲染主流程在固定的 z-order 位置预留两个插槽：
     under —— 位于所有实体之下，处于世界变换内（受 DPI / shake 影响）
     over  —— 位于全部内容之上，处于世界变换外（屏幕空间）
   谁来画由外部注册决定；未注册时为零开销空操作。
   渲染层因此不再依赖 infra/debug。
   ========================================================= */

type OverlayFn = (ctx: CanvasRenderingContext2D) => void;

const under: OverlayFn[] = [];
const over: OverlayFn[] = [];

/** 注册"实体之下 / 世界空间"叠加层，返回注销函数 */
export function addUnderlay(fn: OverlayFn): () => void {
  under.push(fn);
  return () => { const i = under.indexOf(fn); if (i >= 0) under.splice(i, 1); };
}

/** 注册"全部之上 / 屏幕空间"叠加层，返回注销函数 */
export function addOverlay(fn: OverlayFn): () => void {
  over.push(fn);
  return () => { const i = over.indexOf(fn); if (i >= 0) over.splice(i, 1); };
}

/** 渲染主流程内部调用 */
export function drawUnderlays(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < under.length; i++) under[i](ctx);
}

/** 渲染主流程内部调用 */
export function drawOverlays(ctx: CanvasRenderingContext2D): void {
  for (let i = 0; i < over.length; i++) over[i](ctx);
}
