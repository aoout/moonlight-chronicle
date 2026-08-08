/* =========================================================
   蚀月远征 · 远征之门（蚀月深度选择）
   god 模式（isDevMode）额外提供「起始夜」选择：
   玩家可任选第 1~20 夜之一作为本局起点，选定深度后起程。
   ========================================================= */
import { Component } from '../component.js';
import { stageState } from '../../../state/stage.js';
import { LEVELS, CONFIG, STAGE_NAMES } from '../../../config/index.js';
import { iconSVG, moonPhaseSVG } from '../../../assets/icons.js';
import { isDevMode } from '../../../engine/env.js';
import { AudioEngine } from '../../../platform/audio/engine.js';
import { $, el, html } from '../hud_utils.js';

const gSt = () => stageState.state;

/* eslint-disable jsdoc/require-jsdoc */
export class GateScreen extends Component<{}> {
  /** god 模式选定的起始夜（1 ~ CONFIG.STAGES）；每次打开重置为第 1 夜 */
  private selStage = 1;

  render(): string {
    return '<div id="levelselect" class="overlay hidden"><div class="overlay-bg"></div><div class="panel gate-panel"><div class="panel-title">远征之门</div><div class="gate-sub" id="gate-sub"></div><div class="gate-grid" id="gate-grid"></div><button class="btn btn-sm" id="btn-gate-close">收起月图</button></div></div>';
  }

  open(): void {
    this.selStage = 1;
    const grid = $('gate-grid');
    grid.innerHTML = '';
    LEVELS.forEach((lv: any, i: number) => {
      const unlocked = i <= gSt().unlocked;
      const card = el('div', 'gate-card' + (unlocked ? '' : ' locked') + (i === gSt().depth ? ' current' : ''));
      card.innerHTML = html`
        <span class="gate-moon" style="color:${lv.color}">${moonPhaseSVG(i)}</span>
        <span class="gate-name">${lv.name}</span>
        <span class="gate-tag">${lv.tag}</span>
        ${unlocked ? '' : html`<span class="gate-lock">${iconSVG('slotEmpty')}</span>`}
      `;
      if (unlocked) {
        card.onclick = () => {
          stageState.set('depth', i);
          this.close();
          // 触发自定义事件通知 scheduler：携带所选深度与起始夜（god 模式）
          window.dispatchEvent(new CustomEvent('gate:selected', {
            detail: { depth: i, stage: isDevMode() ? this.selStage : 1 },
          }));
        };
      }
      grid.appendChild(card);
    });
    $('gate-sub').textContent = '已抵达深度 ' + gSt().unlocked + ' · ' + LEVELS[gSt().unlocked].name + '（' + LEVELS[gSt().unlocked].tag + '）';
    // god 模式：重建起始夜选择器（非 dev 模式移除，防止残留）
    document.getElementById('gate-night')?.remove();
    if (isDevMode()) this.renderNightPicker();
    $('levelselect').classList.remove('hidden');
  }

  close(): void {
    $('levelselect').classList.add('hidden');
  }

  /* ---------- god 模式：起始夜选择器（第 1~20 夜任选其一） ---------- */
  private renderNightPicker(): void {
    const host = $('levelselect');
    const foot = document.querySelector('.gate-foot') as HTMLElement | null;
    if (!host || !foot || document.getElementById('gate-night')) return;
    const box = el('div', 'gate-night');
    box.id = 'gate-night';
    const head = el('div', 'gate-night-head', html`
      <span class="gn-title">起始夜 · DEV</span>
      <span class="gn-sub">god 模式可任选一夜起程，整备后直达</span>
    `);
    const name = el('div', 'gate-night-name', '第 1 夜 · ' + STAGE_NAMES[0]);
    name.id = 'gate-night-name';
    const grid = el('div', 'gate-night-grid');
    for (let i = 1; i <= CONFIG.STAGES; i++) {
      const b = el('button', 'gn-btn' + (i === this.selStage ? ' sel' : ''));
      (b as HTMLButtonElement).type = 'button';
      b.textContent = String(i);
      b.title = '第 ' + i + ' 夜 · ' + STAGE_NAMES[i - 1];
      b.onclick = () => {
        this.selStage = i;
        grid.querySelectorAll('.gn-btn').forEach(n => n.classList.remove('sel'));
        b.classList.add('sel');
        name.textContent = '第 ' + i + ' 夜 · ' + STAGE_NAMES[i - 1];
        AudioEngine.playSfx('click');
      };
      grid.appendChild(b);
    }
    box.append(head, name, grid);
    host.insertBefore(box, foot);
  }
}
