// @ts-check
/* =========================================================
   蚀月远征 · 渲染层：Boss 血条
   ========================================================= */
import { iconSVG } from '../icons.js';

/**
 * @param {import('./context.js').RenderContext} rc
 */
export function drawBossBar(rc) {
  const el = /** @type {HTMLElement} */ (document.getElementById('bossbar'));
  if (!el) return;
  if (!rc.boss) { el.style.display = 'none'; return; }
  const e = rc.boss;
  el.style.display = 'block';
  const fill = /** @type {HTMLElement} */ (el.querySelector('.bb-fill'));
  const name = /** @type {HTMLElement} */ (el.querySelector('.bb-name'));
  if (fill) fill.style.width = (e.hp / e.maxHp * 100) + '%';
  if (name) name.innerHTML = iconSVG('moonFull') + ' ' + e.name;
}