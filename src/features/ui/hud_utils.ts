/* =========================================================
   蚀月远征 · HUD 工具函数
   通用的 DOM 辅助与 HUD 动画函数
   ========================================================= */
import { stageState } from '../../state/stage.js';
import { CONFIG } from '../../config/index.js';
import { settingsState } from '../../state/settings.js';

/** HTML 标签模板：简洁、安全的 HTML 构建 */
export function html(strings: TemplateStringsArray, ...values: any[]): string {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      const v = values[i];
      if (v === null || v === undefined) {
        /* skip */
      } else if (Array.isArray(v)) {
        result += v.map(x => x ?? '').join('');
      } else {
        result += String(v);
      }
    }
  }
  return result;
}

export const $ = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

export const el = (tag: string, cls?: string, html?: string): HTMLElement => {
  const d = document.createElement(tag);
  if (cls) d.className = cls;
  if (html !== undefined) d.innerHTML = html;
  return d;
};

export function showScreen(id: string): void {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = $(id);
  if (target) target.classList.add('active');
}

/* ---------- 伤害数字 ---------- */
export function addDmgNumber(x: number, y: number, n: number | string, crit: boolean): void {
  if (!settingsState.get('dmgNumbers')) return;
  const layer = $('fx-layer');
  if (!layer) return;
  const d = el('div', 'dmg-num' + (crit ? ' crit' : ''), String(n));
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  layer.appendChild(d);
  setTimeout(() => { if (document.contains(d)) d.remove(); }, 950);
}

export function spawnText(x: number, y: number, str: string, color?: string): void {
  if (!settingsState.get('dmgNumbers')) return;
  const layer = $('fx-layer');
  if (!layer) return;
  const d = el('div', 'dmg-num', str);
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  if (color) d.style.color = color;
  layer.appendChild(d);
  setTimeout(() => { if (document.contains(d)) d.remove(); }, 950);
}

/* ---------- 关卡横幅 ---------- */
export function showStageBanner(stageName: string, isBoss: boolean, bossName?: string | null): void {
  const wrap = document.getElementById('game');
  if (!wrap) return;
  const b = el('div', 'stage-banner' + (isBoss ? ' boss' : ''));
  b.innerHTML = html`
    <div class="sb-kicker">${isBoss ? 'WARNING · 蚀潮涌动' : 'NIGHT ' + stageState.state.stage + ' / ' + CONFIG.STAGES}</div>
    <div class="sb-title">${isBoss ? bossName : stageName}</div>
    ${isBoss
      ? '<div class="sb-sub">斩落它，守月人</div>'
      : '<div class="sb-sub">噬光之潮将至</div>'}
  `;
  wrap.appendChild(b);
  setTimeout(() => { if (document.contains(b)) b.remove(); }, 2300);
}

/* ---------- Toast ---------- */
export function toast(msg: string): void {
  const wrap = $('toast');
  const t = el('div', 'toast', msg);
  wrap.appendChild(t);
  setTimeout(() => { if (document.contains(t)) t.classList.add('out'); }, 2200);
  setTimeout(() => { if (document.contains(t)) t.remove(); }, 2800);
}