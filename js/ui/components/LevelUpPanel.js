// @ts-check
/* =========================================================
   蚀月远征 · 升级祝福选择面板
   ========================================================= */
import { Component } from '../component.js';
import { G, STATE, sm } from '../../state.js';
import { EventBus } from '../../core/event_bus.js';
import { computeDerived } from '../../player_fn.js';
import { CONFIG, pickBlessings } from '../../data/index.js';
import { AudioEngine } from '../../audio.js';
import { $, el, toast } from '../hud.js';

/* eslint-disable jsdoc/require-jsdoc */
/** @extends Component<import('../../types/core.d.ts').Player> */
export class LevelUpPanel extends Component {
  render() {
    return '<div id="levelup" class="overlay hidden"><div class="overlay-bg"></div><div class="panel levelup-panel"><div class="panel-title">月痕烙印</div><div id="levelup-cards" class="levelup-cards"></div></div></div>';
  }

  /**
   * @param {import('../../types/core.d.ts').Player} p
   */
  open(p) {
    if (!p) return;
    sm.transition(STATE.LEVELUP);
    AudioEngine.playSfx('levelup');
    const cards = $('levelup-cards');
    cards.innerHTML = '';
    const picks = pickBlessings(CONFIG.LEVEL_UP_CHOICES);
    picks.forEach((b, i) => {
      const c = el('div', 'card upgrade-card rarity-' + b.tier);
      c.style.animationDelay = (i * 0.08) + 's';
      c.innerHTML =
        '<div class="card-rarity">' + (b.tier === 'legend' ? '命运' : b.tier === 'epic' ? '非凡' : '寻常') + '</div>' +
        '<div class="card-ic">' + b.icon + '</div>' +
        '<div class="card-name">' + b.name + '</div>' +
        '<div class="card-desc">' + b.desc + '</div>';
      c.onclick = () => {
        b.apply(p);
        G.levelQueue--;
        this._close();
        if (G.levelQueue > 0) this.open(p);
        else sm.transition(STATE.PLAYING);
        computeDerived(p);
        toast(b.name + ' 已烙印');
      };
      cards.appendChild(c);
    });
    $('levelup').classList.remove('hidden');
    $('levelup').classList.add('incoming');
  }

  _close() {
    $('levelup').classList.add('hidden');
  }
}