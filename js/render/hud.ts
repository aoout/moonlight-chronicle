/* =========================================================
   蚀月远征 · 渲染层：Boss 血条
   ========================================================= */
import { iconSVG } from '../icons.js';
import type { RenderContext } from './context.js';

export function drawBossBar(rc: RenderContext): void {
  const el = document.getElementById('bossbar');
  if (!el) return;
  if (!rc.boss) { el.style.display = 'none'; return; }
  const e = rc.boss;
  el.style.display = 'block';
  const fill = el.querySelector('.bb-fill') as HTMLElement | null;
  const name = el.querySelector('.bb-name') as HTMLElement | null;
  if (fill) fill.style.width = (e.hp / e.maxHp * 100) + '%';
  if (name) name.innerHTML = iconSVG('moonFull') + ' ' + e.name;
}
