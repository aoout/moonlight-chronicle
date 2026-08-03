/* =========================================================
   蚀月远征 · 升级祝福选择面板
   ========================================================= */
import { Component } from '../component.js';
import { applyBlessing } from '../../commands/index.js';
import { CONFIG, pickBlessings } from '../../data/index.js';
import { AudioEngine } from '../../audio/engine.js';
import { $, el, html, toast } from '../hud_utils.js';
import type { Player } from '../../types/core.d.ts';

/* eslint-disable jsdoc/require-jsdoc */
export class LevelUpPanel extends Component<Player> {
  render(): string {
    return html`<div id="levelup" class="overlay hidden"><div class="overlay-bg"></div><div class="panel levelup-panel"><div class="panel-title">月痕烙印</div><div id="levelup-cards" class="levelup-cards"></div></div></div>`;
  }

  open(p: Player): void {
    if (!p) return;
    AudioEngine.playSfx('levelup');
    const cards = $('levelup-cards');
    cards.innerHTML = '';
    const picks = pickBlessings(CONFIG.LEVEL_UP_CHOICES);
    picks.forEach((b: any, i: number) => {
      const c = el('div', 'card upgrade-card rarity-' + b.tier);
      c.style.animationDelay = (i * 0.08) + 's';
      c.innerHTML = html`
        <div class="card-rarity">${b.tier === 'legend' ? '命运' : b.tier === 'epic' ? '非凡' : '寻常'}</div>
        <div class="card-ic">${b.icon}</div>
        <div class="card-name">${b.name}</div>
        <div class="card-desc">${b.desc}</div>
      `;
      c.onclick = () => {
        const r = applyBlessing(b);
        if (!r.ok) return;
        this._close();
        if (r.hasMore) this.open(p);
        toast(b.name + ' 已烙印');
      };
      cards.appendChild(c);
    });
    $('levelup').classList.remove('hidden');
    $('levelup').classList.add('incoming');
  }

  _close(): void {
    $('levelup').classList.add('hidden');
  }
}
