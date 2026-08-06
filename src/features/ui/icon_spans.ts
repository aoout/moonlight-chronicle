/* =========================================================
   蚀月远征 · 图标占位填充（DOM 侧）
   将静态图标资产注入页面中的 [data-ic] 占位元素。
   ========================================================= */

import { iconSVG } from '../../assets/icons.js';

/* 填充页面中所有 [data-ic] 占位元素 */
export function fillIconSpans(root?: Document | HTMLElement): void {
  (root || document).querySelectorAll('[data-ic]').forEach(el => {
    el.innerHTML = iconSVG((el as HTMLElement).dataset.ic || '');
  });
}
