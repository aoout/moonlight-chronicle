// @ts-check
/* =========================================================
   蚀月远征 · 渲染层：背景（离屏缓存 + 微尘）
   ========================================================= */

/* ---------- 离屏背景缓存 ---------- */
/** @type {HTMLCanvasElement|null} */
let _bgCache = null;
let _bgCacheW = 0, _bgCacheH = 0;

/**
 * @param {import('./context.js').RenderContext} rc
 */
function initBackgroundCache(rc) {
  if (_bgCache && _bgCacheW === rc.width && _bgCacheH === rc.height) return;
  _bgCache = document.createElement('canvas');
  _bgCache.width = rc.width;
  _bgCache.height = rc.height;
  _bgCacheW = rc.width;
  _bgCacheH = rc.height;
  const bc = /** @type {CanvasRenderingContext2D} */ (_bgCache.getContext('2d'));

  // 月面底色（俯视：月灰蓝渐变）
  const grd = bc.createRadialGradient(rc.width / 2, rc.height / 2, 60, rc.width / 2, rc.height / 2, Math.max(rc.width, rc.height) * 0.72);
  grd.addColorStop(0, '#262c48');
  grd.addColorStop(0.55, '#151a30');
  grd.addColorStop(1, '#0b0e1e');
  bc.fillStyle = grd;
  bc.fillRect(0, 0, rc.width, rc.height);

  // 月光方向（左上受光 → 右下微暗）
  const light = bc.createLinearGradient(0, 0, rc.width, rc.height);
  light.addColorStop(0, 'rgba(233,201,135,.07)');
  light.addColorStop(1, 'rgba(0,0,0,.14)');
  bc.fillStyle = light;
  bc.fillRect(0, 0, rc.width, rc.height);

  // 月海（暗色平滑区）
  for (let i = 0; i < 4; i++) {
    const hx = ((i * 137.5 + 40) % 100) / 100 * rc.width;
    const hy = ((i * 89.7 + 20) % 100) / 100 * rc.height;
    const hr = 90 + i * 55;
    const hg = bc.createRadialGradient(hx, hy, hr * 0.2, hx, hy, hr);
    hg.addColorStop(0, 'rgba(8,10,22,.20)');
    hg.addColorStop(1, 'rgba(8,10,22,0)');
    bc.fillStyle = hg;
    bc.beginPath(); bc.arc(hx, hy, hr, 0, 6.28); bc.fill();
  }

  // 环形山（立体凹陷：左上亮边 + 右下暗边 + 内凹）
  for (let i = 0; i < 14; i++) {
    const cx = ((i * 61.7 + 9) % 100) / 100 * rc.width;
    const cy = ((i * 43.3 + 55) % 100) / 100 * rc.height;
    const cr = 8 + (i * 7.3 % 26);
    bc.beginPath(); bc.arc(cx, cy, cr, 0, 6.28);
    bc.fillStyle = 'rgba(0,0,0,.14)'; bc.fill();
    bc.beginPath(); bc.arc(cx - cr * 0.15, cy - cr * 0.15, cr, 0, 6.28);
    bc.strokeStyle = 'rgba(255,255,255,.10)'; bc.lineWidth = 1.2; bc.stroke();
    bc.beginPath(); bc.arc(cx + cr * 0.12, cy + cr * 0.12, cr, 0, 6.28);
    bc.strokeStyle = 'rgba(0,0,0,.26)'; bc.lineWidth = 1.2; bc.stroke();
    bc.beginPath(); bc.arc(cx, cy, cr * 0.5, 0, 6.28);
    bc.fillStyle = 'rgba(0,0,0,.06)'; bc.fill();
  }

  // 月面裂纹（确定性走向，不抖动）
  bc.strokeStyle = 'rgba(0,0,0,.22)';
  bc.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const bx = ((i * 173 + 30) % 100) / 100 * rc.width;
    const by = ((i * 97 + 12) % 100) / 100 * rc.height;
    bc.beginPath();
    bc.moveTo(bx, by);
    let px = bx, py = by;
    const segs = 3 + i % 3;
    for (let s = 0; s < segs; s++) {
      const a = i * 1.3 + s * 0.8 + Math.sin(i * 3.7 + s) * 0.5;
      px += Math.cos(a) * 18; py += Math.sin(a) * 18;
      bc.lineTo(px, py);
    }
    bc.stroke();
  }
}

/* ---------- 渲染 ---------- */
/**
 * @param {import('./context.js').RenderContext} rc
 */
export function drawBackground(rc) {
  const ctx = /** @type {CanvasRenderingContext2D} */ (rc.ctxBg);
  initBackgroundCache(rc);
  ctx.drawImage(/** @type {HTMLCanvasElement} */ (_bgCache), 0, 0);

  // 微尘（静置小点，轻微呼吸）—— 轻量动画，每帧单独绘制
  ctx.save();
  for (let i = 0; i < 60; i++) {
    const dx = (i * 91.7 + 3) % rc.width;
    const dy = (i * 53.3 + 71) % rc.height;
    const tw = 0.5 + 0.5 * Math.sin(rc.time * 0.8 + i * 2.3);
    ctx.globalAlpha = 0.06 + tw * 0.08;
    ctx.fillStyle = i % 3 === 0 ? '#cfe4f4' : '#8a93b8';
    ctx.fillRect(dx, dy, 1.2, 1.2);
  }
  ctx.restore();
}