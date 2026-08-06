/* =========================================================
   蚀月远征 · 渲染层：背景（离屏缓存 + 微尘缓存）
   ========================================================= */
import { TAU } from '../../engine/util/utils.js';
import type { RenderContext } from './context.js';
import { shapeCache } from './shape_cache.js';
import { settingsState } from '../../state/settings.js';

/* ---------- 离屏背景缓存 ---------- */
let _bgCache: HTMLCanvasElement | null = null;
let _bgCacheW = 0, _bgCacheH = 0;

/** 失效背景缓存（切「月镜析度」或「月面蚀刻」后强制重建） */
export function invalidateBackgroundCache(): void {
  _bgCache = null;
  _bgCacheW = 0;
  _bgCacheH = 0;
}

function initBackgroundCache(rc: RenderContext): void {
  if (_bgCache && _bgCacheW === rc.width && _bgCacheH === rc.height) return;
  const dpr = rc.dpr || 1;
  _bgCache = document.createElement('canvas');
  _bgCache.width = Math.floor(rc.width * dpr);
  _bgCache.height = Math.floor(rc.height * dpr);
  _bgCacheW = rc.width;
  _bgCacheH = rc.height;
  const bc = _bgCache.getContext('2d') as CanvasRenderingContext2D;
  bc.scale(dpr, dpr);

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
    bc.beginPath(); bc.arc(hx, hy, hr, 0, TAU); bc.fill();
  }

  // 环形山（立体凹陷：左上亮边 + 右下暗边 + 内凹）
  const detail = settingsState.get('bgDetail');
  const craters = detail ? 14 : 6;
  for (let i = 0; i < craters; i++) {
    const cx = ((i * 61.7 + 9) % 100) / 100 * rc.width;
    const cy = ((i * 43.3 + 55) % 100) / 100 * rc.height;
    const cr = 8 + (i * 7.3 % 26);
    bc.beginPath(); bc.arc(cx, cy, cr, 0, TAU);
    bc.fillStyle = 'rgba(0,0,0,.14)'; bc.fill();
    bc.beginPath(); bc.arc(cx - cr * 0.15, cy - cr * 0.15, cr, 0, TAU);
    bc.strokeStyle = 'rgba(255,255,255,.10)'; bc.lineWidth = 1.2; bc.stroke();
    bc.beginPath(); bc.arc(cx + cr * 0.12, cy + cr * 0.12, cr, 0, TAU);
    bc.strokeStyle = 'rgba(0,0,0,.26)'; bc.lineWidth = 1.2; bc.stroke();
    bc.beginPath(); bc.arc(cx, cy, cr * 0.5, 0, TAU);
    bc.fillStyle = 'rgba(0,0,0,.06)'; bc.fill();
  }

  // 月面裂纹（确定性走向，不抖动）
  bc.strokeStyle = 'rgba(0,0,0,.22)';
  bc.lineWidth = 1;
  const cracks = detail ? 6 : 0;
  for (let i = 0; i < cracks; i++) {
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

/* ---------- 微尘缓存（离屏预渲染，每 5 秒刷新一次） ---------- */
let _dustLastRefresh = 0;
const DUST_REFRESH_INTERVAL = 5; // 秒

function drawDustCache(w: number, h: number, ctx: CanvasRenderingContext2D): void {
  // 微尘静置位置固定，透明度随时间变化，但缓存采用静态最大透明度
  // 每帧额外叠加一层动态呼吸（见 drawBackground 中的 drawImage 后处理）
  for (let i = 0; i < 60; i++) {
    const dx = (i * 91.7 + 3) % w;
    const dy = (i * 53.3 + 71) % h;
    ctx.fillStyle = i % 3 === 0 ? '#cfe4f4' : '#8a93b8';
    ctx.fillRect(dx, dy, 1.2, 1.2);
  }
}

/* ---------- 渲染 ---------- */
export function drawBackground(rc: RenderContext): void {
  const ctx = rc.ctxBg as CanvasRenderingContext2D;
  initBackgroundCache(rc);
  ctx.drawImage(_bgCache as HTMLCanvasElement, 0, 0);

  // 微尘：使用离屏缓存，每 5 秒刷新一次（受「月面蚀刻」节制）
  if (!settingsState.get('bgDetail')) return;
  const dustKey = 'dust_' + rc.width + 'x' + rc.height;
  const shouldRefresh = rc.time - _dustLastRefresh >= DUST_REFRESH_INTERVAL;
  if (shouldRefresh) _dustLastRefresh = rc.time;
  const dustCanvas = shouldRefresh
    ? shapeCache.refresh(dustKey, rc.width, rc.height, (bctx) => {
        drawDustCache(rc.width, rc.height, bctx);
      })
    : shapeCache.get(dustKey, rc.width, rc.height, (bctx) => {
        drawDustCache(rc.width, rc.height, bctx);
      });
  // 使用全局透明度做呼吸效果（每帧只改一次 globalAlpha，而非 60 次）
  ctx.save();
  const breath = 0.06 + (0.5 + 0.5 * Math.sin(rc.time * 0.8)) * 0.08;
  ctx.globalAlpha = Math.min(1, breath);
  ctx.drawImage(dustCanvas, 0, 0);
  ctx.restore();
}
