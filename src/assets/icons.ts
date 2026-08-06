/* =========================================================
   蚀月远征 · 统一 SVG 图标库
   风格规范：24×24 viewBox，线性轮廓，stroke=currentColor，
   stroke-width 1.8，圆头圆角端点；内部点缀用 fill 强调。
   尺寸跟随 font-size（width/height = 1em），颜色继承文字色。
   ========================================================= */

import { clamp } from '../engine/util/utils.js';

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
  /* 月蚀之仪 · 调校齿轮（齿冠 + 月眼） */
  gear: IC.wrap('<circle cx="12" cy="12" r="3.1"/><path d="M12 2.7v2.6M12 18.7v2.6M2.7 12h2.6M18.7 12h2.6M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9"/><circle cx="12" cy="12" r="7.4" stroke-dasharray="2.4 2"/>'),

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

  /* ---------- 武器 · 专属纹章（逐刃精绘） ---------- */
  /* 月辉回刃：回旋月镖 */
  wMoonRing: IC.wrap('<path d="M12 3.5c4.4 2.5 7.2 6.4 7.8 10.9.2 1.2.1 2.4-.2 3.5L12 16.2l-7.6 1.7c-.3-1.1-.4-2.3-.2-3.5.6-4.5 3.4-8.4 7.8-10.9Z"/><path d="M12 16.2V21"/><path d="M12 7.6c1.8 1.2 3.1 2.8 3.8 4.6M12 7.6c-1.8 1.2-3.1 2.8-3.8 4.6" stroke-width="1.2" stroke-opacity=".55"/><path d="M4.6 6c-1.6 1.4-2.6 3.2-2.8 5.2" stroke-width="1.2" stroke-dasharray="1.6 2"/><circle cx="12" cy="21.6" r="0.8" fill="currentColor" stroke="none"/>'),
  /* 蚀星连弩：速射弩 + 蚀星点缀 */
  wCrossbow: IC.wrap('<path d="M3 4.5l7 5v5l-7 5v-15Z"/><path d="M5 7.4l5 3.4M5 16.6l5-3.4" stroke-width="1.2" stroke-opacity=".5"/><path d="M10 9.5h4.5l5.5 5.5-3 2-5.5-5.5"/><path d="M14 5.5l3-2"/><path d="M15.1 4.8l1 1M15.1 4.8l1-1" stroke-width="1.2"/><path d="M17.3 11.8l-2.8 1.9" stroke-width="1.2" stroke-opacity=".55"/><circle cx="17.9" cy="2.9" r="1.1" fill="currentColor" stroke="none"/><circle cx="5.2" cy="7.6" r="0.8" fill="currentColor" stroke="none"/>'),
  /* 弧光引雷：主闪电 + 连锁电弧 */
  wArc: IC.wrap('<path d="M13 3 6.5 13h4L9 21l6.5-10h-4L13 3Z"/><path d="M11.3 7l1.7-2.5 1.9 2.9-2.3 3.5M9.3 14l1.5-2.2 1.8 2.6-1.9 2.9" stroke-width="1.1" stroke-opacity=".5"/><path d="M17.5 7.5c-1.4 2.4-1.4 5.4 0 8M19.5 9.5c-1 1.7-1 3.8 0 5.5" stroke-width="1.3" stroke-opacity=".75"/><circle cx="17.6" cy="11.6" r="0.9" fill="currentColor" stroke="none"/><path d="M9 21l1.4-1M9 21l-1.4-1" stroke-width="1.2"/>'),
  /* 焚天陨星：陨核 + 内焰 + 拖尾火星 */
  wMeteor: IC.wrap('<circle cx="14.5" cy="9.5" r="5"/><circle cx="14.5" cy="9.5" r="3" stroke-width="1.2" stroke-opacity=".55"/><circle cx="14.5" cy="9.5" r="1.2" fill="currentColor" stroke="none"/><path d="M12.4 7.6c1.6 1 2.5 2.5 2.5 4.4" stroke-width="1.2" stroke-opacity=".7"/><path d="M10.8 13.2 5 19M15.5 4.5 18 2M18.3 11.3l2.4 1.9" stroke-width="1.4"/><path d="M12.2 15.2c-1 1-2.1 1.9-3.3 2.7" stroke-width="1.1" stroke-dasharray="1.4 1.8"/><circle cx="4.2" cy="19.8" r="0.9" fill="currentColor" stroke="none"/><circle cx="18.8" cy="1.6" r="0.7" fill="currentColor" stroke="none"/><circle cx="21.3" cy="13.8" r="0.7" fill="currentColor" stroke="none"/>'),
  /* 霜华之环：冰环 + 晶十字 */
  wFrost: IC.wrap('<circle cx="12" cy="12" r="7.2"/><circle cx="12" cy="12" r="5.2" stroke-width="1.2" stroke-dasharray="2.4 2.6"/><path d="M12 6.8v10.4M6.8 12h10.4"/><path d="M12 6.8l-1.5-1.5M12 6.8l1.5-1.5M12 17.2l-1.5 1.5M12 17.2l1.5 1.5" stroke-width="1.2" stroke-opacity=".7"/><path d="M8.4 8.4l1.4 1.4M15.6 15.6l1.4 1.4M15.6 8.4l-1.4 1.4M8.4 15.6l1.4-1.4" stroke-width="1.1" stroke-opacity=".45"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>'),
  /* 圣裁光柱：圣柱 + 光冠 + 底座 */
  wBeam: IC.wrap('<path d="M10.5 4h3v13h-3z"/><path d="M10.9 5.5v10M13.1 5.5v10M12 5.5v10" stroke-width="1" stroke-opacity=".45"/><path d="M12 2.5V4M7.5 4.5l1.8 1M16.5 4.5l-1.8 1"/><path d="M5.8 6.4l1.5.7M18.2 6.4l-1.5.7" stroke-width="1.2" stroke-opacity=".6"/><path d="M8.5 17h7"/><path d="M6.5 21l1.8-2.6M17.5 21l-1.8-2.6"/><path d="M4.8 20.2l1.2-1.8M19.2 20.2l-1.2-1.8" stroke-width="1.2" stroke-opacity=".6"/><circle cx="12" cy="2.2" r="0.8" fill="currentColor" stroke="none"/>'),
  /* 环舞之刃：环 + 月刃 + 环绕弧 */
  wOrbit: IC.wrap('<circle cx="12" cy="12" r="8.6" stroke-width="1.3" stroke-dasharray="2.4 2.8"/><path d="M6.3 12c.9-2.1 2.5-3.5 4.5-4.1l.7 4.1-.7 4.1c-2-.6-3.6-2-4.5-4.1Z"/><path d="M17.7 12c-.9-2.1-2.5-3.5-4.5-4.1l-.7 4.1.7 4.1c2-.6 3.6-2 4.5-4.1Z"/><path d="M18.5 14.5c.5-2 .1-4.2-1.3-6M5.5 9.5c-.5 2-.1 4.2 1.3 6" stroke-width="1.3" stroke-opacity=".6"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>'),
  /* 潮涌之枪：贯枪 + 枪缨 */
  wLance: IC.wrap('<path d="M4.5 19.5 15.5 8.5"/><path d="M15 4.5l4 4-4 4-4-4 4-4Z"/><path d="M15 6.8v3.4" stroke-width="1.2"/><path d="M8.2 16l1.5-1.5M11.8 12.4l1.5-1.5" stroke-width="1.1" stroke-opacity=".5"/><path d="M9.5 14.5c-1.2 1.2-2.2 2.6-2.8 4M10.8 13.2c-.8 1.4-1.4 2.9-1.7 4.4" stroke-width="1.1" stroke-opacity=".5"/><path d="M4.5 21.5c2-1.3 4-1.3 6 0s4 1.3 6 0" stroke-width="1.3" stroke-opacity=".7"/><circle cx="4.8" cy="19.2" r="0.8" fill="currentColor" stroke="none"/>'),
  /* 影袭之刃：飞刀 + 影尾 */
  wShadow: IC.wrap('<path d="M12 3.5l2.6 2.6v7.8L12 16.5l-2.6-2.6V6.1L12 3.5Z"/><path d="M12 6.4v7.2" stroke-width="1.1" stroke-opacity=".55"/><path d="M12 3.5l1.7 1.7M12 16.5l-1.7-1.7" stroke-width="1.1" stroke-opacity=".45"/><path d="M12 16.5v3.5M10.1 18.2h3.8"/><circle cx="12" cy="21" r="0.9" fill="currentColor" stroke="none"/><path d="M6.2 20.3c1.7-1.9 3-3.4 4.2-4.7" stroke-width="1.2" stroke-dasharray="1.6 1.8"/><path d="M8.6 21.4c1-1.2 1.8-2.2 2.6-3.1" stroke-width="1.1" stroke-dasharray="1.4 2" stroke-opacity=".5"/><path d="M17.8 5.8c1.7.9 2.8 2.4 3.2 4.2" stroke-width="1.1" stroke-opacity=".45"/>'),
  /* 风暴之眼：双旋涡核 + 弹幕星点 */
  wStorm: IC.wrap('<circle cx="12" cy="12" r="2.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><path d="M12 12c0-3.4 2.8-6.2 6.2-6.2s6.2 2.8 6.2 6.2M12 12c0-2.6 2.1-4.7 4.7-4.7s4.7 2.1 4.7 4.7" stroke-width="1.3" stroke-opacity=".6"/><path d="M12 12c0 3.4-2.8 6.2-6.2 6.2S5.6 15.4 5.6 12M12 12c0 2.6-2.1 4.7-4.7 4.7s-4.7 2.1-4.7 4.7" stroke-width="1.3" stroke-opacity=".6"/><circle cx="12" cy="12" r="8.8" stroke-width="1.2" stroke-dasharray="2.6 2.6" stroke-opacity=".7"/><circle cx="17" cy="5.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="20" cy="8.8" r="0.8" fill="currentColor" stroke="none"/><path d="M18.6 12c-.2 1.5-.9 2.9-2 4" stroke-width="1.1" stroke-opacity=".5"/>'),
  /* 破晓之辉：旭日升腾 + 放射芒 */
  wNova: IC.wrap('<path d="M3.5 15h17"/><path d="M4 14.5c0-5 4-9 8-9s8 4 8 9"/><path d="M7 14.5c0-3 2.2-5.5 5-5.5s5 2.5 5 5.5" stroke-width="1.3" stroke-opacity=".55"/><path d="M9 14.5v-1.8M15 14.5v-1.8M12 14.5v-2.4" stroke-width="1.1" stroke-opacity=".5"/><path d="M12 3.5v2M6 5.4l1.3 1.6M18 5.4l-1.3 1.6M3.5 10.5h2.2"/><path d="M8.8 3.8l.6 1M15.2 3.8l-.6 1" stroke-width="1.1" stroke-opacity=".55"/><path d="M6 17.5c2-1.2 4-1.2 6 0s4 1.2 6 0" stroke-width="1.2" stroke-opacity=".5"/><circle cx="19.5" cy="4.5" r="0.8" fill="currentColor" stroke="none"/>'),
  /* 月影残像：月牙 + 虚影重像 */
  wPhantom: IC.wrap('<path d="M20 13.2A8.5 8.5 0 1 1 10.8 4 7 7 0 0 0 20 13.2Z"/><path d="M15.8 6.8c-1.5 1-2.7 2.5-3.5 4.3" stroke-width="1.2" stroke-opacity=".55"/><path d="M17.8 7.6c-1.6 2.2-2.5 4.7-2.6 7.3" stroke-width="1.2" stroke-dasharray="1.8 2.2"/><path d="M20.4 9.2c-.7 1.6-1.1 3.3-1.3 5" stroke-width="1.1" stroke-dasharray="1.6 2" stroke-opacity=".55"/><path d="M5.6 17.5c2 .8 4 1 6 .6M5.2 19.8c2.4.6 4.6.6 6.8 0" stroke-width="1.1" stroke-opacity=".4"/><circle cx="19.8" cy="5.2" r="0.9" fill="currentColor" stroke="none"/><circle cx="21.6" cy="8.6" r="0.6" fill="currentColor" stroke="none"/>'),
  /* 蚀潮之锚：深度·重击 · 蚀锚 + 深度刻度 + 潮浪 + 坠弧 */
  wTideAnchor: IC.wrap('<path d="M5 8.2h14"/><path d="M12 8.2v9.2"/><path d="M12 17.4c-3.4 0-5.8-1.6-6.4-4.5l2.3-.7c.3 1.6 2 2.6 4.1 2.6s3.8-1 4.1-2.6l2.3.7c-.6 2.9-3 4.5-6.4 4.5Z"/><circle cx="12" cy="4.6" r="2.1"/><circle cx="12" cy="4.6" r="0.8" fill="currentColor" stroke="none"/><path d="M14.6 11.4h2M14.6 13.6h2.4M14.6 15.8h2" stroke-width="1.1" stroke-opacity=".6"/><path d="M7 10.4v-1.6M9 10.4v-1.6M15 10.4v-1.6M17 10.4v-1.6" stroke-width="1.1" stroke-opacity=".5"/><path d="M4 21.5c2.5-1.4 5-1.4 7.5 0s5 1.4 7.5 0" stroke-width="1.3" stroke-opacity=".7"/><path d="M18 3.2c1.5.9 2.6 2.1 3.2 3.8" stroke-width="1.1" stroke-dasharray="1.5 1.9" stroke-opacity=".6"/>'),

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

  /* ---------- 秘宝 · 月幕集市奇物（专属纹章，逐一精绘） ---------- */
  /* 月脉结晶：生命 · 双菱晶核 */
  moonCrystal: IC.wrap('<path d="M12 2.5 20 12l-8 9.5L4 12l8-9.5Z"/><path d="M12 7.5l4.5 4.5-4.5 4.5-4.5-4.5 4.5-4.5Z"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>'),
  /* 陨铁甲片：护甲 · 六角甲片 + 铆钉 */
  ironPlate: IC.wrap('<path d="M5 9.5 12 4.5l7 5v5l-7 5-7-5v-5Z"/><path d="M12 8.5v7"/><circle cx="9.2" cy="12" r="0.9" fill="currentColor" stroke="none"/><circle cx="14.8" cy="12" r="0.9" fill="currentColor" stroke="none"/>'),
  /* 月华利刃：攻击 · 剑身 + 月牙护手 */
  moonBlade: IC.wrap('<path d="M12 2.5l2.2 2.2v7.3L12 14.5l-2.2-2.5V4.7L12 2.5Z"/><path d="M12 14.5V19M8.6 16.5h6.8"/><path d="M12 13.8c-2.5.5-4.4 1.7-5 3.2h10c-.6-1.5-2.5-2.7-5-3.2Z"/>'),
  /* 逐风之靴：移速 · 双风弧 + 奔行箭 */
  windBoot: IC.wrap('<path d="M6 16.5c3.6-.8 8.4-.8 12 0M6 20c3.6-.8 8.4-.8 12 0M12 13v-3M9.5 13 12 10.5 14.5 13"/>'),
  /* 猎鹰之瞳：暴击 · 窄长鹰眼 + 偏置瞳孔 */
  hawkEye: IC.wrap('<path d="M3.8 12c2.3-4.3 5-6.4 8.2-6.4s5.9 2.1 8.2 6.4c-2.3 4.3-5 6.4-8.2 6.4s-5.9-2.1-8.2-6.4Z"/><ellipse cx="12" cy="12" rx="2.9" ry="2.3"/><circle cx="11.2" cy="11.2" r="0.9" fill="currentColor" stroke="none"/>'),
  /* 时之沙：冷却 · 沙漏 + 底沙堆 */
  sandHourglass: IC.wrap('<path d="M6 3h12M6 21h12M7 3c3 3 4.6 5.5 5 9 .4-3.5 2-6 5-9M7 21c3-3 4.6-5.5 5-9 .4 3.5 2 6 5 9"/><path d="M10.4 13.8h3.2M10.8 15.4h2.4"/>'),
  /* 散华透镜：范围 · 双环透镜 + 扩散射线 */
  scatterLens: IC.wrap('<circle cx="12" cy="12" r="5.6"/><circle cx="12" cy="12" r="2.2"/><path d="M12 3v2.6M12 18.4V21M3 12h2.6M18.4 12H21M5.6 5.6l1.9 1.9M16.5 16.5l1.9 1.9M18.4 5.6l-1.9 1.9M7.5 16.5l-1.9 1.9"/>'),
  /* 月华露：恢复 · 露珠 + 月痕 */
  moonDew: IC.wrap('<path d="M12 3.2c2.7 3.3 4.9 5.9 4.9 8.6a4.9 4.9 0 0 1-9.8 0c0-2.7 2.2-5.3 4.9-8.6Z"/><path d="M9.6 13.4a2.4 2.4 0 0 0 2.4 2.4"/>'),
  /* 星辉卷轴：经验 · 卷轴 + 内星 */
  starScroll: IC.wrap('<path d="M5.5 4.5h11.5a1.5 1.5 0 0 1 1.5 1.5v14H7a1.5 1.5 0 0 1-1.5-1.5v-14Z"/><path d="M5.5 4.5A1.5 1.5 0 0 0 7 6h11.5"/><path d="M11.5 10.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4Z"/>'),
  /* 升辉心契：经验+升级回血 · 心形徽章 + 升起之星 */
  lvHeart: IC.wrap('<path d="M12 20.8C7.2 16.6 3.8 13.7 3.8 10.3 3.8 7.8 5.8 5.9 8.2 5.9c1.5 0 2.9.7 3.8 1.9.9-1.2 2.3-1.9 3.8-1.9 2.4 0 4.4 1.9 4.4 4.4 0 3.4-3.4 6.3-8.2 10.5Z"/><path d="M8.5 10.5c.6 0 1.1.3 1.4.8.3-.5.9-.8 1.6-.8.6 0 1.1.3 1.5.8.4-.5 1-.8 1.7-.8" stroke-width="1.4" stroke-opacity=".6"/><path d="M12 3.8l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8.8-1.8Z"/><path d="M12 5.6v1.2" stroke-width="1.4" stroke-opacity=".5"/>'),
  /* 聚宝之匣：金币 · 宝箱 + 锁扣 */
  goldChest: IC.wrap('<path d="M4.5 9.5h15v10h-15v-10Z"/><path d="M4.5 9.5 7 5.5h10l2.5 4"/><path d="M12 13v3M10.4 11.4 12 13l1.6-1.6"/>'),
  /* 裂空印记：移速→暴击 · 转模双箭头 + 中点 */
  galeMark: IC.wrap('<path d="M4 8h12M12.5 4.5l3.5 3.5-3.5 3.5"/><path d="M20 16H8M11.5 12.5 8 16l3.5 3.5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
  /* 山岳之心：护甲→攻击 · 山脊 + 内嵌心 */
  mountainHeart: IC.wrap('<path d="M4 18.5 10 6.5l3.5 7 2-3.5L20 18.5H4Z"/><path d="M12.6 12c.9-1 2-.5 2 .3 0 .8-1.3 1.7-2 2.2-.7-.5-2-1.4-2-2.2 0-.8 1.1-1.3 2-.3Z"/>'),
  /* 血月契约：生命→攻击 · 血月 + 血滴 */
  bloodMoon: IC.wrap('<path d="M20 13.2A8.5 8.5 0 1 1 10.8 4 7 7 0 0 0 20 13.2Z"/><path d="M12 20.5c-1.1-1.5-2-2.7-2-3.6a2 2 0 0 1 4 0c0 .9-.9 2.1-2 3.6Z"/>'),
  /* 战意奔涌：攻击→移速 · 斜剑 + 疾风弧 */
  warSurge: IC.wrap('<path d="M8 21 18 11M14.5 7.5h4.5v4.5M19 7.5 13.5 13"/><path d="M4.5 13.5c2.6-1.4 5.4-1.4 8 0M4.5 17.5c2.6-1.4 5.4-1.4 8 0"/>'),
  /* 锋锐洞察：暴击→攻击 · 剑锋下嵌锐眼 */
  keenEye: IC.wrap('<path d="M12 2.5l2 2v8.5l-2 2-2-2V4.5l2-2Z"/><circle cx="12" cy="16.8" r="3.4"/><circle cx="12" cy="16.8" r="1.2" fill="currentColor" stroke="none"/>'),
  /* 汲魂之镰：击杀回复 · 弧镰 + 魂珠 */
  soulScythe: IC.wrap('<path d="M4 5.5c5-1.5 9 .5 10 4.5l-4 1M10 10l-3 3M4 5.5 2.5 3.5"/><circle cx="16" cy="12.5" r="2.6"/>'),
  /* 爆裂之核：击杀爆炸 · 爆核 + 八向射线 */
  boomCore: IC.wrap('<circle cx="12" cy="12" r="3.4"/><path d="M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5M5.3 5.3l2.6 2.6M16.1 16.1l2.6 2.6M18.7 5.3l-2.6 2.6M7.9 16.1l-2.6 2.6"/>'),
  /* 雷纹刻印：连锁闪电 · 闪电 + 链环 */
  stormChain: IC.wrap('<path d="M13.5 2.5 6 13h4.5L9 21.5 17.5 11H13l.5-8.5Z"/><circle cx="19.5" cy="17.5" r="2.8"/><path d="M19.5 15v2.5M19.5 17.5l1.6 1.6"/>'),
  /* 穿透符文：穿透 · 箭矢贯环 */
  pierceRune: IC.wrap('<path d="M3 20.5 16 8.5M13 3.5h7.5v7.5M20.5 3.5 12 12"/><circle cx="9" cy="15" r="2.4"/>'),
  /* 绝境意志：低血增伤 · 烈焰 + 立地之线 */
  lastStand: IC.wrap('<path d="M12 3c1.6 2.2 4.6 4 4.6 7.6a4.6 4.6 0 0 1-9.2 0C7.4 7.6 10.4 6 12 3Z"/><path d="M12 8.5c.9 1.3 2.6 2.4 2.6 3.9a2.6 2.6 0 0 1-5.2 0c0-1.4 1.2-2.3 2.6-3.9Z"/><path d="M8.5 19h7"/>'),
  /* 无伤之誓：满血暴击 · 完好之环 + 印证 */
  flawlessVow: IC.wrap('<circle cx="12" cy="12" r="8.2"/><path d="M8.2 12.6l2.6 2.6 5-5.4"/>'),
  /* 引力之核：自动拾取 · 核 + 磁场弧 */
  gravCore: IC.wrap('<circle cx="12" cy="12" r="2.6"/><path d="M6.5 5.5a9 9 0 0 0 0 13M17.5 5.5a9 9 0 0 1 0 13"/><path d="M3.2 9a13 13 0 0 0 0 6M20.8 9a13 13 0 0 1 0 6"/>'),
  /* 贪婪之匣：幸运→金币 · 宝箱 + 贪眼 */
  greedBox: IC.wrap('<path d="M4.5 9.5h15v10h-15v-10Z"/><path d="M4.5 9.5 7 5.5h10l2.5 4"/><circle cx="12" cy="14" r="2.3"/><circle cx="12" cy="14" r="0.9" fill="currentColor" stroke="none"/>'),
  /* 远征手记：等级成长 · 书卷 + 手记行 */
  expeditionBook: IC.wrap('<path d="M5 3.5h11a2 2 0 0 1 2 2V21H7a2 2 0 0 1-2-2V3.5Z"/><path d="M5 3.5A2 2 0 0 0 7 5.5h11"/><path d="M9 10.5h5.5M9 14h5.5"/>'),
  /* 潮汐之誓：关卡成长 · 弯月 + 双潮浪 */
  tideOath: IC.wrap('<path d="M19 11.5A7.5 7.5 0 1 1 11.5 4 6.2 6.2 0 0 0 19 11.5Z"/><path d="M4.5 19.5c2-1.6 4-1.6 6 0s4 1.6 6 0M7 16.5c2-1.6 4-1.6 6 0"/>'),
  /* 回响之核：连击回响 · 声波核 */
  echoCore: IC.wrap('<circle cx="12" cy="12" r="2.4"/><path d="M6.5 8c-1.3 2-1.3 6 0 8M17.5 8c1.3 2 1.3 6 0 8"/>'),
  /* 幻雾披风：闪避 · 披风 + 雾痕 */
  mistCloak: IC.wrap('<path d="M12 3c4.2 2.4 6.3 6.6 6.3 11.4V21H5.7v-6.6c0-4.8 2.1-9 6.3-11.4Z"/><path d="M5.7 18.5h12.6"/>'),
  /* 荆棘王冠：反伤 · 棘冠 + 倒刺 */
  thornCrown: IC.wrap('<path d="M4.5 7.5 9 12l3-7.5 3 7.5 4.5-4.5-1.4 11H5.9L4.5 7.5Z"/><path d="M8.5 12.5l-1.5 2M15.5 12.5l1.5 2"/>'),
  /* 连珠之环：投射物+1 · 环缀四珠 */
  beadRing: IC.wrap('<circle cx="12" cy="12" r="7.2"/><circle cx="12" cy="4.8" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="19.2" r="1.5" fill="currentColor" stroke="none"/><circle cx="4.8" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19.2" cy="12" r="1.5" fill="currentColor" stroke="none"/>'),
  /* 断月之契：暴伤 · 残月 + 裂痕 */
  brokenMoon: IC.wrap('<path d="M20 13.2A8.5 8.5 0 1 1 10.8 4 7 7 0 0 0 20 13.2Z"/><path d="M8.5 7.5c1.6 1.3 2.5 3 2.8 5M12 10c1 1.6 1.4 3.2 1.2 5"/>'),
  /* 静止之漏：时停 · 沙漏 + 凝霜 */
  frozenHourglass: IC.wrap('<path d="M6 3h12M6 21h12M7 3c3 3 4.6 5.5 5 9 .4-3.5 2-6 5-9M7 21c3-3 4.6-5.5 5-9 .4 3.5 2 6 5 9"/><path d="M12 9.5l-1.8 1.8M12 9.5l1.8 1.8M12 14.5l-1.8-1.8M12 14.5l1.8-1.8"/>'),
  /* 血吻之戒：吸血 · 戒环 + 血滴 */
  bloodRing: IC.wrap('<circle cx="12" cy="12" r="8.2"/><path d="M12 10.2c-1.3 0-2.2 1-2.2 2.2 0 1.5 2.2 3.4 2.2 3.4s2.2-1.9 2.2-3.4c0-1.2-.9-2.2-2.2-2.2Z"/>'),
  /* 疾风齿轮：攻速 · 齿轮 + 风翼 */
  galeGear: IC.wrap('<circle cx="12" cy="12" r="3.1"/><path d="M12 2.7v2.6M12 18.7v2.6M2.7 12h2.6M18.7 12h2.6M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M18.7 5.3l-1.9 1.9M7.2 16.8l-1.9 1.9"/><path d="M14.5 3.5c2.4 1.4 3.9 3.6 4.3 6.2"/>'),
  /* 月之赐福：幸运 · 月芒宝石 + 内星 */
  moonGem: IC.wrap('<path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/><path d="M12 8l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z"/>'),
  /* 月影步：移速闪避 · 三重残影 */
  afterimage: IC.wrap('<path d="M6.5 4v9.5M5 7.5 6.5 4 8 7.5"/><path d="M12 8.5V18M10.5 12l1.5-3.5 1.5 3.5"/><path d="M17.5 12.5V19.5M16 15.5l1.5-3.5 1.5 3.5"/>'),
  /* 蚀星护盾：吸收盾 · 坚盾 + 星辉 */
  starShield: IC.wrap('<path d="M12 3l7.5 2.6v5.1c0 4.7-3.1 8.6-7.5 10.3-4.4-1.7-7.5-5.6-7.5-10.3V5.6L12 3Z"/><path d="M12 8l1.2 3.3 3.3 1.2-3.3 1.2L12 17l-1.2-3.3-3.3-1.2 3.3-1.2L12 8Z"/>'),
  /* 濒死月魄：濒死无敌 · 残月 + 裂闪 */
  dyingMoon: IC.wrap('<path d="M20 13.2A8.5 8.5 0 1 1 10.8 4 7 7 0 0 0 20 13.2Z"/><path d="M9.5 7l-1.8 3h3.2l-2.6 4.5"/>'),
  /* 猎月之环：击杀攻速 · 猎杀准星 */
  huntRing: IC.wrap('<circle cx="12" cy="12" r="7.6"/><path d="M12 6.4v2.8M12 14.8v2.8M6.4 12h2.8M14.8 12h2.8"/>'),
  /* 连星之弩：双发弹幕 · 弩 + 双子星 */
  twinCrossbow: IC.wrap('<path d="M3 5.5l6.5 4.5v4.5L3 19V5.5Z"/><path d="M9.5 9.5h3.5l6 6-2.5 1.5-6.5-6.5"/><circle cx="17.2" cy="5.8" r="1.2" fill="currentColor" stroke="none"/><circle cx="20" cy="8.6" r="0.9" fill="currentColor" stroke="none"/>'),
  /* 寒月结界：范围减速 · 寒月 + 冰晶 */
  frostMoon: IC.wrap('<path d="M19 11.5A7.5 7.5 0 1 1 11.5 4 6.2 6.2 0 0 0 19 11.5Z"/><path d="M12 8.5v4.5M9.7 10.8h4.6M12 8.5l-1.5-1M12 8.5l1.5-1"/>'),
  /* 金币流星：双倍金币 · 流星 + 币纹 */
  goldComet: IC.wrap('<path d="M12 3c3.4 3.9 5.4 7 5.4 9.6a5.4 5.4 0 0 1-10.8 0C6.6 10 8.6 6.9 12 3Z"/><path d="M12 11.6l2.5 2.5-2.5 2.5-2.5-2.5 2.5-2.5Z"/>'),
  /* 破晓溅射：范围溅射 · 旭日 + 溅滴 */
  dawnSplash: IC.wrap('<circle cx="12" cy="12" r="3.2"/><path d="M12 1.8v2.4M12 19.8v2.4M1.8 12h2.4M19.8 12h2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M19.4 4.6l-1.7 1.7M6.3 17.7l-1.7 1.7"/><circle cx="17" cy="7" r="1.1" fill="currentColor" stroke="none"/>'),
  /* 暴月之眼：暴击爆炸 · 锐眼 + 爆星 */
  moonEyeBoom: IC.wrap('<path d="M4 12c2.2-4 4.9-6 8-6s5.8 2 8 6c-2.2 4-4.9 6-8 6s-5.8-2-8-6Z"/><circle cx="12" cy="12" r="2.4"/><path d="M17.5 4l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z"/>'),
  /* 吞噬之月：击杀经验 · 蚀月 + 齿痕 */
  devourMoon: IC.wrap('<path d="M20 13.2A8.5 8.5 0 1 1 10.8 4 7 7 0 0 0 20 13.2Z"/><path d="M13 7.8c1.6 1.2 2.6 2.9 2.9 4.8M15.9 12.6c1.3 1 2.1 2.4 2.4 4M10.8 9.4c1.4 1 2.3 2.3 2.7 3.9"/>'),
  /* 永夜斗篷：闪避无敌 · 长披 + 中缝 */
  darkCloak: IC.wrap('<path d="M12 2.5c4.6 2.7 7 7.2 7 12v7H5v-7c0-4.8 2.4-9.3 7-12Z"/><path d="M12 2.5V21.5"/>'),
  /* 群星陨落：自动陨星 · 双子星陨 */
  starfall: IC.wrap('<path d="M8 4.5c1.5 2.2 2.3 4 2.3 5.6a2.6 2.6 0 0 1-5.2 0c0-1.6.8-3.4 2.9-5.6Z"/><path d="M8 10.1l-2.4 2.4M8 10.1l2.4 2.4"/><path d="M17 7c1.5 2.2 2.3 4 2.3 5.6a2.6 2.6 0 0 1-5.2 0c0-1.6.8-3.4 2.9-5.6Z"/><path d="M17 12.6l-2.4 2.4M17 12.6l2.4 2.4"/><circle cx="20.5" cy="4" r="0.9" fill="currentColor" stroke="none"/>'),
  /* 辉光审判：成就增伤 · 裁决圣瞳 + 辉光射线 */
  gloryJudge: IC.wrap('<circle cx="12" cy="12" r="7.2"/><path d="M12 2.5v3.6M12 17.9v3.6M2.5 12h3.6M17.9 12h3.6M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2"/><path d="M12 7.5l3 4.5-3 4.5-3-4.5 3-4.5Z"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>'),
  /* 月汐护体：受击恢复 · 弯月 + 回潮 */
  tideMoon: IC.wrap('<path d="M19 11.5A7.5 7.5 0 1 1 11.5 4 6.2 6.2 0 0 0 19 11.5Z"/><path d="M6.5 17.5c2-1.6 4-1.6 6 0s4 1.6 6 0"/>'),
  /* 守月之约：致命保命 · 誓盾 + 契印 */
  oathShield: IC.wrap('<path d="M12 3l7.5 2.6v5.1c0 4.7-3.1 8.6-7.5 10.3-4.4-1.7-7.5-5.6-7.5-10.3V5.6L12 3Z"/><path d="M9.5 10.5h5V14h-5v-3.5Z"/><path d="M12 14v3"/>'),
  /* 蚀潮之主：数量增伤 · 潮浪 + 尖峰 */
  hordeTide: IC.wrap('<path d="M3 18.5c3-3.4 6-3.4 9 0s6 3.4 9 0"/><path d="M12 5.5V14M12 5.5 9.6 8M12 5.5l2.4 2.5"/>'),
  /* 时之残响：全场减速 · 沙漏 + 涟漪 */
  echoSlow: IC.wrap('<path d="M6 3h12M6 21h12M7 3c3 3 4.6 5.5 5 9 .4-3.5 2-6 5-9M7 21c3-3 4.6-5.5 5-9 .4 3.5 2 6 5 9"/><path d="M3.5 15.5c-1-2-1-6.5 0-8.5M20.5 15.5c1-2 1-6.5 0-8.5"/>'),
  /* 星屑护符：拾币回血 · 护符环 + 星 */
  starCharm: IC.wrap('<circle cx="12" cy="12" r="7.4"/><path d="M12 8.2l1.2 3.1 3.1 1.2-3.1 1.2L12 16.8l-1.2-3.1-3.1-1.2 3.1-1.2 1.2-3.1Z"/><path d="M12 3.6v1.8M12 18.6v1.8"/>'),
  /* 你的月亮：现实月相 · 弦月之镜 + 星缀 */
  yourMoon: IC.wrap('<circle cx="12" cy="12" r="7.6"/><path d="M12 4.4a7.6 7.6 0 0 1 0 15.2v-15.2Z" fill="currentColor" stroke="none"/><path d="M4 16.4l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9.9-2.1Z"/>'),
};

/* 取图标 SVG；带类名重载 */
export function iconSVG(name: string, cls?: string): string {
  const s = ICONS[name] || ICONS.diamond;
  if (!cls) return s;
  return s.replace('<svg ', '<svg class="' + cls + '" ');
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
