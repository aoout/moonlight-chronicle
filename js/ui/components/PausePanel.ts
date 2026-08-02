/* =========================================================
   蚀月远征 · 暂停面板
   ========================================================= */
import { Component } from '../component.js';
import { G, STATE, sm } from '../../state.js';
import { clamp } from '../../utils.js';
import { AudioEngine } from '../../audio.js';
import { $ } from '../hud.js';
import { renderStatGroupsInto } from '../shop.js';

/* eslint-disable jsdoc/require-jsdoc */
export class PausePanel extends Component<{}> {
  render(): string {
    return '<div id="pause" class="overlay hidden"><div class="overlay-bg"></div><div class="panel pause-panel"><div class="pause-stage" id="pause-stage-name"></div><div class="progress-bar"><div class="progress-fill" id="pause-stage-fill"></div></div><div class="pause-time" id="pause-time"></div><div class="pause-hp"><div class="progress-bar"><div class="progress-fill" id="pause-hp-fill"></div></div><div class="pause-hp-text" id="pause-hp-text"></div></div><div class="pause-stats" id="pause-stats"></div></div></div>';
  }

  open(): void {
    if (G.state !== STATE.PLAYING) return;
    G.paused = !G.paused;
    if (G.paused) {
      this._renderContent();
      $('pause').classList.remove('hidden');
      AudioEngine.playSfx('open');
    } else {
      $('pause').classList.add('hidden');
      AudioEngine.playSfx('close');
    }
  }

  _renderContent(): void {
    const p = G.player;
    if (!p) return;
    $('pause-stage-name').textContent = '第 ' + G.stage + ' 夜 · ' + G.stageName + (G.boss ? ' · 领主当前' : '');
    const prog = clamp(G.stageTime / G.stageMax, 0, 1);
    $('pause-stage-fill').style.width = (prog * 100) + '%';
    $('pause-time').textContent = G.boss ? '领主战 · 击杀即渡' : '余 ' + Math.ceil(G.stageMax - G.stageTime) + ' 息';
    $('pause-hp-fill').style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
    $('pause-hp-text').textContent = Math.round(p.hp) + ' / ' + Math.round(p.maxHp);
    const st = $('pause-stats');
    if (!st) return;
    st.innerHTML = '';
    renderStatGroupsInto(st, p, null);
  }

  close(): void {
    $('pause').classList.add('hidden');
    G.paused = false;
  }
}
