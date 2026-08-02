/* =========================================================
   蚀月远征 · 统一 SVG 图标库
   风格规范：24×24 viewBox，线性轮廓，stroke=currentColor，
   stroke-width 1.8，圆头圆角端点；内部点缀用 fill 强调。
   尺寸跟随 font-size（width/height = 1em），颜色继承文字色。
   ========================================================= */

import { clamp } from './utils.js';

const IC = {
  // 基础 SVG 包裹（所有图标共用此结构）
  wrap: (body: string, opts?: string): string =>
    '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" ' +
    'stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" style="vertical-align:-0.15em;display:inline-block" ' +
    (opts || '') + '>' + body + '</svg>',
};

export const ICONS: Record<string, string> = {
  /* ---------- 数值 / 通用 ---------- */
  heart: IC.wrap('<path d="M12 20.6C7.2 16.4 3.8 13.5 3.8 10.1 3.8 7.6 5.8 5.7 8.2 5.7c1.5 0 2.9.7 3.8 1.9.9-1.2 2.3-1.9 3.8-1.9 2.4 0 4.4 1.9 4.4 4.4 0 3.4-3.4 6.3-8.2 10.5Z"/>'),
  shield: IC.wrap('<path d="M12 3l7.5 2.6v5.1c0 4.7-3.1 8.6-7.5 10.3-4.4-1.7-7.5-5.6-7.5-10.3V5.6L12 3Z"/>'),
  arrow: IC.wrap('<path d="M4.5 12h14M13.5 6.5 19 12l-5.5 5.5"/>'),
  sword: IC.wrap('<path d="M14.5 3.5l6 6L12 18l-3-3 5.5-5.5Z"/><path d="M11 7l6 6"/><path d="M10 18.5 5.5 23M6.5 14.5l-2 2"/>'),
  bolt: IC.wrap('<path d="M13 2.5 4.5 13.5h6L11 21.5 19.5 10.5h-6L13 2.5Z"/>'),
  diamond: IC.wrap('<path d="M12 3l9 9-9 9-9-9 9-9Z"/><path d="M12 7.8l4.2 4.2-4.2 4.2-4.2-4.2 4.2-4.2Z"/>'),
  star: IC.wrap('<path d="M12 3l2.1 6.9H21l-5.6 4 2.1 7L12 17.9 6.5 21l2.1-7L3 9.9h6.9L12 3Z"/>'),
  plus: IC.wrap('<path d="M12 5v14M5 12h14"/>'),
  dots: IC.wrap('<circle cx="12" cy="5" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.7" fill="currentColor" stroke="none"/>'),
  magnet: IC.wrap('<path d="M6 15V4M18 15V4M6 4h4v7a2 2 0 0 0 4 0V4h4v11a6 6 0 0 1-12 0Z"/>'),
  hourglass: IC.wrap('<path d="M6 3h12M6 21h12M7 3c3 3 4.6 5.5 5 9 .4-3.5 2-6 5-9M7 21c3-3 4.6-5.5 5-9 .4 3.5 2 6 5 9"/>'),
  gem: IC.wrap('<path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/>'),
  spark: IC.wrap('<path d="M12 4l1.8 6.2L20 12l-6.2 1.8L12 20l-1.8-6.2L4 12l6.2-1.8L12 4Z"/><circle cx="19" cy="5" r="1.4" fill="currentColor" stroke="none"/>'),
  cloud: IC.wrap('<path d="M7.5 18.5h9a4 4 0 0 0 .8-7.9 6 6 0 0 0-11.5.9 4.2 4.2 0 0 0 1.7 7Z"/>'),
  flame: IC.wrap('<path d="M12 3c1.6 2.2 4.6 4 4.6 7.6a4.6 4.6 0 0 1-9.2 0C7.4 7.6 10.4 6 12 3Z"/><path d="M12 8.5c.9 1.3 2.6 2.4 2.6 3.9a2.6 2.6 0 0 1-5.2 0c0-1.4 1.2-2.3 2.6-3.9Z"/>'),
  exchange: IC.wrap('<path d="M4 8h13M13 4l4 4-4 4M20 16H7M11 12l-4 4 4 4"/>'),
  pierce: IC.wrap('<path d="M5 19 19 5M14 4h6v6M20 4l-7 7"/>'),
  book: IC.wrap('<path d="M5 3.5h11a2 2 0 0 1 2 2V21H7a2 2 0 0 1-2-2V3.5Z"/><path d="M5 3.5a2 2 0 0 0 2 2h11"/>'),
  moon: IC.wrap('<path d="M20 13.2A8.5 8.5 0 1 1 10.8 4 7 7 0 0 0 20 13.2Z"/>'),
  moonFull: IC.wrap('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c4.7 0 8.5 3.8 8.5 8.5s-3.8 8.5-8.5 8.5"/>'),

  /* ---------- 武器 ---------- */
  crossbow: IC.wrap('<path d="M3 4.5l7 5v5l-7 5v-15Z"/><path d="M10 9.5h4.5l5.5 5.5-3 2-5.5-5.5"/><path d="M14 5.5l3-2"/>'),
  chain: IC.wrap('<path d="M9.5 14.5 6 18a2.5 2.5 0 0 1-3.5-3.5L6 11M14.5 9.5 18 6a2.5 2.5 0 0 0-3.5-3.5L11 6M9 15l6-6"/>'),
  meteor: IC.wrap('<circle cx="14.5" cy="9.5" r="5.5"/><path d="M10 14l-6.5 6.5M15.5 4.5 19 2l-1 3.5M11 11l-3 3"/>'),
  snow: IC.wrap('<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/><path d="M12 3l-1.8 1.8M12 3l1.8 1.8M12 21l-1.8-1.8M12 21l1.8-1.8M4.5 7.5l2.4.6M4.5 7.5l.6-2.4M19.5 7.5l-2.4.6M19.5 7.5l-.6-2.4M19.5 16.5l-2.4-.6M19.5 16.5l-.6 2.4M4.5 16.5l2.4-.6M4.5 16.5l.6 2.4"/>'),
  shine: IC.wrap('<path d="M12 4v16M4 12h16M7.5 7.5 5 5M16.5 7.5 19 5M7.5 16.5 5 19M16.5 16.5 19 19"/>'),
  target: IC.wrap('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.8" fill="currentColor" stroke="none"/>'),
  lance: IC.wrap('<path d="M5.5 18.5 17 7M13 4h6v6M13 10l-2.5 2.5M5.5 18.5l-2 2"/>'),
  storm: IC.wrap('<circle cx="12" cy="12" r="7"/><path d="M12 12c0-2.2 1.8-4 4-4s4 1.8 4 4M12 12c0 2.2-1.8 4-4 4"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>'),
  sun: IC.wrap('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8"/>'),

  /* ---------- UI / 结算 ---------- */
  coin: IC.wrap('<circle cx="12" cy="12" r="9"/><path d="M12 6.8 17.2 12 12 17.2 6.8 12 12 6.8Z"/>'),
  skull: IC.wrap('<path d="M12 3c-4.4 0-8 3.4-8 7.6 0 3 1.8 5.6 4.4 6.7V21h7.2v-3.7c2.6-1.1 4.4-3.7 4.4-6.7C20 6.4 16.4 3 12 3Z"/><circle cx="9" cy="11" r="1.6" fill="currentColor" stroke="none"/><circle cx="15" cy="11" r="1.6" fill="currentColor" stroke="none"/><path d="M12 13.5v2.5M10.5 18.5v2M13.5 18.5v2"/>'),
  crown: IC.wrap('<path d="M3.5 8l4.5 4L12 4.5l4 7.5 4.5-4-1.6 10.5H5.1L3.5 8Z"/><path d="M5.5 21h13"/>'),
  slotEmpty: IC.wrap('<circle cx="12" cy="12" r="8" stroke-dasharray="3.5 3"/>'),

  /* ---------- 敌人 / Boss（几何） ---------- */
  dotRing: IC.wrap('<circle cx="12" cy="12" r="4"/>'),
  dot: IC.wrap('<circle cx="12" cy="12" r="2.3" fill="currentColor" stroke="none"/>'),
  square: IC.wrap('<rect x="4" y="4" width="16" height="16" rx="1.5"/>'),
  tri: IC.wrap('<path d="M12 4.5 21 19.5H3L12 4.5Z"/>'),
  play: IC.wrap('<path d="M6.5 4.5 19.5 12 6.5 19.5v-15Z"/>'),
  ringDot: IC.wrap('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>'),
  half: IC.wrap('<path d="M12 3.5a8.5 8.5 0 0 1 0 17v-17Z"/>'),
  triUp: IC.wrap('<path d="M12 3.5 22 21H2L12 3.5Z"/>'),
};

/* 取图标 SVG；带类名重载 */
export function iconSVG(name: string, cls?: string): string {
  const s = ICONS[name] || ICONS.diamond;
  if (!cls) return s;
  return s.replace('<svg ', '<svg class="' + cls + '" ');
}

/* 填充页面中所有 [data-ic] 占位元素 */
export function fillIconSpans(root?: Document | HTMLElement): void {
  (root || document).querySelectorAll('[data-ic]').forEach(el => {
    el.innerHTML = iconSVG((el as HTMLElement).dataset.ic || '');
  });
}

/* 月相图标：蚀月深度（0=满盈 → 9=终蚀），暗蚀影从右上角顺时针扩大 */
export function moonPhaseSVG(phase: number): string {
  const k = clamp(phase / 9, 0, 1);
  const start = 0.6 * 6.28;
  const sweep = Math.max(0.12, k * 5.0);
  const cx = 12, cy = 12, r = 9;
  const px = (a: number) => cx + Math.cos(a) * r, py = (a: number) => cy + Math.sin(a) * r;
  const a0 = start, a1 = start + sweep;
  const large = sweep > 3.14 ? 1 : 0;
  const d = 'M' + px(a0).toFixed(2) + ' ' + py(a0).toFixed(2) +
    ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + px(a1).toFixed(2) + ' ' + py(a1).toFixed(2) +
    ' L' + cx + ' ' + cy + ' Z';
  return IC.wrap('<circle cx="12" cy="12" r="9"/>' + '<path d="' + d + '" fill="rgba(0,0,0,.62)"/>');
}
