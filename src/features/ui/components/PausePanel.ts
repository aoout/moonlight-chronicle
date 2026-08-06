/* =========================================================
   蚀月远征 · 暂停面板
   ========================================================= */
import { EVENTS } from '../../../engine/core/events.js';
import { Component } from '../component.js';
import { STATE, sm } from '../../../engine/core/states.js';
import { playerState } from '../../../state/player.js';
import { stageState } from '../../../state/stage.js';
import { EventBus } from '../../../engine/core/event_bus.js';
import { clamp } from '../../../engine/util/utils.js';
import { AudioEngine } from '../../../platform/audio/engine.js';
import { $, html } from '../hud_utils.js';
import { renderStatGroupsInto } from '../shop/index.js';

const pSt = () => playerState.state;
const gSt = () => stageState.state;

/* eslint-disable jsdoc/require-jsdoc */
export class PausePanel extends Component<{}> {
  render(): string {
    return html`<div id="pause" class="overlay hidden"><div class="overlay-bg"></div><div class="panel pause-panel"><div class="pause-stage" id="pause-stage-name"></div><div class="progress-bar"><div class="progress-fill" id="pause-stage-fill"></div></div><div class="pause-time" id="pause-time"></div><div class="pause-hp"><div class="progress-bar"><div class="progress-fill" id="pause-hp-fill"></div></div><div class="pause-hp-text" id="pause-hp-text"></div></div><div class="pause-stats" id="pause-stats"></div></div></div>`;
  }

  open(): void {
    if (sm.current !== STATE.PLAYING) return;
    const newPaused = !gSt().paused;
    stageState.set('paused', newPaused);
    if (newPaused) {
      this._renderContent();
      $('pause').classList.remove('hidden');
      AudioEngine.playSfx('open');
      EventBus.emit(EVENTS.PAUSE_OPEN, {});
    } else {
      $('pause').classList.add('hidden');
      AudioEngine.playSfx('close');
      EventBus.emit(EVENTS.PAUSE_CLOSE, {});
    }
  }

  _renderContent(): void {
    const p = pSt().player;
    if (!p) return;
    $('pause-stage-name').textContent = '第 ' + gSt().stage + ' 夜 · ' + gSt().stageName + (gSt().boss ? ' · 领主当前' : '');
    const prog = clamp(gSt().stageTime / gSt().stageMax, 0, 1);
    $('pause-stage-fill').style.width = (prog * 100) + '%';
    $('pause-time').textContent = gSt().boss ? '领主战 · 击杀即渡' : '余 ' + Math.ceil(gSt().stageMax - gSt().stageTime) + ' 息';
    $('pause-hp-fill').style.width = clamp(p.hp / p.maxHp * 100, 0, 100) + '%';
    $('pause-hp-text').textContent = Math.round(p.hp) + ' / ' + Math.round(p.maxHp);
    const st = $('pause-stats');
    if (!st) return;
    st.innerHTML = '';
    renderStatGroupsInto(st, p, null);
  }

  close(): void {
    $('pause').classList.add('hidden');
    stageState.set('paused', false);
  }
}
