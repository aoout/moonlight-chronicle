// @ts-check
/* =========================================================
   蚀月远征 · 渲染层：Boss 血条
   ========================================================= */
import { G } from '../state.js';
import { iconSVG } from '../icons.js';

export function drawBossBar() {
  const el = /** @type {HTMLElement} */ (document.getElementById('bossbar'));
  if (!el) return;
  if (!G.boss) { el.style.display = 'none'; return; }
  const e = G.boss;
  el.style.display = 'block';
  const fill = /** @type {HTMLElement} */ (el.querySelector('.bb-fill'));
  const name = /** @type {HTMLElement} */ (el.querySelector('.bb-name'));
  if (fill) fill.style.width = (e.hp / e.maxHp * 100) + '%';
  if (name) name.innerHTML = iconSVG('moonFull') + ' ' + e.name;
}