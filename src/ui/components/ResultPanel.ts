/* =========================================================
   蚀月远征 · 结算面板
   ========================================================= */
import { Component } from '../component.js';
import { playerState } from '../../state/player.js';
import { statsState } from '../../state/stats.js';
import { stageState } from '../../state/stage.js';
import { clearRun } from '../../persistence/save.js';
import { iconSVG } from '../icons.js';
import { $, el, html } from '../hud_utils.js';

const pSt = () => playerState.state;
const sSt = () => statsState.state;
const gSt = () => stageState.state;

/* eslint-disable jsdoc/require-jsdoc */
export class ResultPanel extends Component<{ win: boolean }> {
  render(): string {
    return html`<div id="result" class="overlay hidden"><div class="overlay-bg"></div><div class="panel result-panel"><div class="result-icon" id="result-icon"></div><div class="result-title" id="result-title"></div><div class="result-sub" id="result-sub"></div><div class="result-stats" id="result-stats"></div></div></div>`;
  }

  open(win: boolean): void {
    const p = pSt().player;
    if (!p) return;
    if (win) clearRun();
    $('result-icon').innerHTML = iconSVG(win ? 'moon' : 'skull');
    $('result-title').textContent = win ? '黎明已至' : '月陨';
    $('result-sub').textContent = win
      ? '蚀月终焉坠于月背，潮噬之潮退去。守月人的名字，被刻进月光里。'
      : '你在第 ' + gSt().stage + ' 夜倒下了。月光记住了你的名字。';
    const stats = $('result-stats');
    stats.innerHTML = '';
    const rows: [string, any, string][] = [
      [iconSVG('skull'), sSt().kills, '击杀总数'],
      [iconSVG('coin'), Math.floor(sSt().gold), '拾取金币'],
      [iconSVG('star'), Math.floor(sSt().runStats.totalDmg), '总伤害'],
      [iconSVG('crown'), sSt().runStats.bossKills, '斩落领主'],
      [iconSVG('moon'), sSt().level, '最终等级'],
      [iconSVG('hourglass'), gSt().stage + ' / ' + 19, '抵达之夜'],
    ];
    rows.forEach((r) => {
      stats.appendChild(el('div', 'result-stat', html`
        <div class="v">${r[1]}</div><div class="k">${r[0]} ${r[2]}</div>
      `));
    });
    $('result').classList.remove('hidden');
  }
}
