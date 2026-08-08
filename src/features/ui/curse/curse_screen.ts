/* =========================================================
   蚀月远征 · 蚀潮索价（诅咒抉择）
   深度 ≥1 开局：蚀潮抽 3 契，守月人自选 1 契（深度 ≥5 双契）。
   未抽中且已精通（累计通关 ≥5）的诅咒，以「蚀之回响」偿还——
   反向减半恩惠，自动生效，在抉择面板下方明示。
   ========================================================= */
import { Component } from '../component.js';
import { stageState } from '../../../state/stage.js';
import { CURSES } from '../../../config/index.js';
import { drawCurseOptions, cursePickCount, curseGraces } from '../../../domain/curse_pick.js';
import { isCurseMastered, curseRecordCount, CURSE_MASTERY } from '../../../infra/persistence/curse_records.js';
import { confirmCurses } from '../../../commands/index.js';
import { $, el, html } from '../hud_utils.js';
import { AudioEngine } from '../../../platform/audio/engine.js';
import type { CurseDef } from '../../../types/core.d.ts';

const gSt = () => stageState.state;

/* 当前抽卡结果（抉择期间驻留，确认时交给 confirmCurses） */
let _options: CurseDef[] = [];
let _picked: CurseDef[] = [];

export class CurseScreen extends Component<{}> {
  render(): string {
    return '<div id="curse" class="overlay hidden"></div>';
  }

  open(): void {
    _options = drawCurseOptions();
    _picked = [];
    const depth = gSt().depth || 0;
    const need = cursePickCount(depth);
    $('curse-sub').textContent = need >= 2
      ? '浅潮未平，深潮又起——蚀潮索求两物'
      : '蚀潮索求一物，守月人自行立契';

    // 三张诅咒契
    const cards = $('curse-cards');
    cards.innerHTML = '';
    _options.forEach((c, i) => {
      const card = el('div', 'curse-card');
      const count = curseRecordCount(c.id);
      const mastered = count >= CURSE_MASTERY;
      card.innerHTML = html`
        <div class="curse-card-ic">${c.icon}</div>
        <div class="curse-card-name">${c.name}</div>
        <div class="curse-card-desc">${c.desc}</div>
        <div class="curse-card-mark">${mastered ? '已精通 · 蚀潮识你' : '相伴 ' + count + ' 夜'}</div>
      `;
      card.style.animationDelay = (i * 0.08) + 's';
      card.onclick = () => {
        if (_picked.includes(c)) {
          _picked = _picked.filter(x => x !== c);
          card.classList.remove('picked');
        } else if (_picked.length < need) {
          _picked.push(c);
          card.classList.add('picked');
          AudioEngine.playSfx('click');
        }
        const confirm = $('btn-curse-confirm') as HTMLButtonElement;
        if (confirm) {
          confirm.disabled = _picked.length < need;
          confirm.textContent = need >= 2 ? '立双契' : '立契';
        }
      };
      cards.appendChild(card);
    });

    // 蚀之回响：未抽中且已精通的诅咒 → 恩惠
    const graceBox = $('curse-grace');
    const masteredIds = new Set(CURSES.filter(c => isCurseMastered(c.id)).map(c => c.id));
    const graces = curseGraces(_options, masteredIds);
    graceBox.innerHTML = graces.length
      ? html`<div class="curse-grace-title">蚀之回响 · 旧账已偿</div>
          ${graces.map(c => html`
            <div class="curse-grace-row">
              <span class="cg-ic">${c.icon}</span>
              <span class="cg-name">${c.name}</span>
              <span class="cg-desc">${c.graceDesc || ''}</span>
            </div>`).join('')}`
      : '<div class="curse-grace-title">蚀之回响 · 尚无旧账可偿</div>';

    const confirm = $('btn-curse-confirm') as HTMLButtonElement;
    if (confirm) {
      confirm.disabled = true;
      confirm.onclick = () => {
        if (_picked.length < need) return;
        AudioEngine.playSfx('unlock');
        confirmCurses(_picked, _options);
      };
    }
    $('#curse').classList.remove('hidden');
  }

  close(): void {
    $('#curse').classList.add('hidden');
  }
}
