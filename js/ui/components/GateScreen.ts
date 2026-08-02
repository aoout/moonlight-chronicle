/* =========================================================
   蚀月远征 · 远征之门（蚀月深度选择）
   ========================================================= */
import { Component } from '../component.js';
import { stageState } from '../../state/stage.js';
import { LEVELS } from '../../data/index.js';
import { iconSVG, moonPhaseSVG } from '../icons.js';
import { AudioEngine } from '../../audio/engine.js';
import { $, el } from '../hud.js';

const gSt = () => stageState.state;

/* eslint-disable jsdoc/require-jsdoc */
export class GateScreen extends Component<{}> {
  render(): string {
    return '<div id="levelselect" class="overlay hidden"><div class="overlay-bg"></div><div class="panel gate-panel"><div class="panel-title">远征之门</div><div class="gate-sub" id="gate-sub"></div><div class="gate-grid" id="gate-grid"></div><button class="btn btn-sm" id="btn-gate-close">收起月图</button></div></div>';
  }

  open(): void {
    const grid = $('gate-grid');
    grid.innerHTML = '';
    LEVELS.forEach((lv: any, i: number) => {
      const unlocked = i <= gSt().unlocked;
      const card = el('div', 'gate-card' + (unlocked ? '' : ' locked') + (i === gSt().depth ? ' current' : ''));
      card.innerHTML =
        '<span class="gate-moon" style="color:' + lv.color + '">' + moonPhaseSVG(i) + '</span>' +
        '<span class="gate-name">' + lv.name + '</span>' +
        '<span class="gate-tag">' + lv.tag + '</span>' +
        (unlocked ? '' : '<span class="gate-lock">' + iconSVG('slotEmpty') + '</span>');
      if (unlocked) {
        card.onclick = () => {
          gSt().depth = i;
          this.close();
          // 触发自定义事件通知 ui.js 刷新
          window.dispatchEvent(new CustomEvent('gate:selected', { detail: { depth: i } }));
        };
      }
      grid.appendChild(card);
    });
    $('gate-sub').textContent = '已抵达深度 ' + gSt().unlocked + ' · ' + LEVELS[gSt().unlocked].name + '（' + LEVELS[gSt().unlocked].tag + '）';
    $('levelselect').classList.remove('hidden');
  }

  close(): void {
    $('levelselect').classList.add('hidden');
  }
}
