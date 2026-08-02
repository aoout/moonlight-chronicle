/* =========================================================
   蚀月远征 · 升级祝福选择面板
   ========================================================= */
import { Component } from '../component.js';
import { STATE, sm } from '../../state.js';
import { statsState } from '../../state/stats.js';
import { EventBus } from '../../core/event_bus.js';
import { PlayerSystem } from '../../systems/PlayerSystem.js';
import { CONFIG, pickBlessings } from '../../data/index.js';
import { AudioEngine } from '../../audio/engine.js';
import { $, el, toast } from '../hud.js';
import type { Player } from '../../types/core.d.ts';

const sSt = () => statsState.state;

/* eslint-disable jsdoc/require-jsdoc */
export class LevelUpPanel extends Component<Player> {
  render(): string {
    return '<div id="levelup" class="overlay hidden"><div class="overlay-bg"></div><div class="panel levelup-panel"><div class="panel-title">月痕烙印</div><div id="levelup-cards" class="levelup-cards"></div></div></div>';
  }

  open(p: Player): void {
    if (!p) return;
    sm.transition(STATE.LEVELUP);
    AudioEngine.playSfx('levelup');
    const cards = $('levelup-cards');
    cards.innerHTML = '';
    const picks = pickBlessings(CONFIG.LEVEL_UP_CHOICES);
    picks.forEach((b: any, i: number) => {
      const c = el('div', 'card upgrade-card rarity-' + b.tier);
      c.style.animationDelay = (i * 0.08) + 's';
      c.innerHTML =
        '<div class="card-rarity">' + (b.tier === 'legend' ? '命运' : b.tier === 'epic' ? '非凡' : '寻常') + '</div>' +
        '<div class="card-ic">' + b.icon + '</div>' +
        '<div class="card-name">' + b.name + '</div>' +
        '<div class="card-desc">' + b.desc + '</div>';
      c.onclick = () => {
        b.apply(p);
        sSt().levelQueue--;
        this._close();
        if (sSt().levelQueue > 0) this.open(p);
        else sm.transition(STATE.PLAYING);
        PlayerSystem.computeDerived(p);
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
