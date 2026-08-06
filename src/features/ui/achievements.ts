/* =========================================================
   蚀月远征 · 蚀月功勋：成就面板
   守月人的荣耀刻痕，按稀有度陈列于月光之下
   ========================================================= */
import { EVENTS } from '../../engine/core/events.js';
import { ACHIEVEMENTS, ACH_RARITY_ORDER, type AchievementDef } from '../../config/achievements.js';
import { achProgressOf, achIsEarned, achEarnedTotal, achTotal } from '../../systems/AchievementSystem.js';
import { iconSVG } from '../../assets/icons.js';
import { $, el, toast } from './hud_utils.js';
import { AudioEngine } from '../../platform/audio/engine.js';
import { EventBus } from '../../engine/core/event_bus.js';

const RARITY_META: Record<string, { label: string; cls: string }> = {
  common: { label: '寻常', cls: 'common' },
  rare: { label: '非凡', cls: 'rare' },
  epic: { label: '史诗', cls: 'epic' },
  legend: { label: '传奇', cls: 'legend' },
};

function sorted(): AchievementDef[] {
  // 未解锁在前（按稀有度降序），已解锁在后
  const list = [...ACHIEVEMENTS];
  list.sort((a, b) => {
    const ea = achIsEarned(a.id) ? 1 : 0, eb = achIsEarned(b.id) ? 1 : 0;
    if (ea !== eb) return ea - eb;
    return (ACH_RARITY_ORDER[b.rarity] - ACH_RARITY_ORDER[a.rarity]);
  });
  return list;
}

export function renderAchievements(): void {
  const grid = $('achievement-grid');
  grid.innerHTML = '';
  $('achievement-count').textContent = achEarnedTotal() + ' / ' + achTotal();
  for (const a of sorted()) {
    const earned = achIsEarned(a.id);
    const prog = achProgressOf(a);
    const meta = RARITY_META[a.rarity];
    const card = el('div', 'ach-card eclipse-glass-frost eclipse-glass--frosted' + (earned ? ' earned' : '') + ' r-' + a.rarity);
    const isAll = a.id === 'a_all';
    const denom = isAll ? achTotal() - 1 : a.target;
    const pct = Math.min(100, Math.round(prog / denom * 100));
    card.innerHTML =
      '<div class="ach-ic">' + (earned ? iconSVG(a.icon) : iconSVG('slotEmpty')) + '</div>' +
      '<div class="ach-body">' +
        '<div class="ach-name">' + (earned ? a.name : '？？？') + '</div>' +
        '<div class="ach-tag ' + meta.cls + '">' + meta.label + '</div>' +
        '<div class="ach-desc">' + a.desc + '</div>' +
        '<div class="ach-bar"><i style="width:' + pct + '%"></i></div>' +
        '<div class="ach-prog">' + (earned
          ? '已达成'
          : isAll
            ? '已解锁 ' + Math.min(prog, denom) + ' / ' + denom
            : a.cumulative
              ? '进度 ' + Math.min(prog, a.target) + ' / ' + a.target
              : '历史最佳 ' + Math.min(prog, a.target) + ' / ' + a.target) + '</div>' +
      '</div>' +
      (earned ? '<div class="ach-check">✓</div>' : '');
    grid.appendChild(card);
  }
}

export function openAchievements(): void {
  renderAchievements();
  $('achievements').classList.remove('hidden');
}

export function bindAchievements(): void {
  $('btn-achievements').onclick = () => { AudioEngine.playSfx('open'); openAchievements(); };
  $('btn-achievements-close').onclick = () => { AudioEngine.playSfx('close'); $('achievements').classList.add('hidden'); };
  // 功勋达成提示
  EventBus.on(EVENTS.ACHIEVEMENT_UNLOCKED, (d: any) => {
    toast('功勋达成 · ' + d.name);
    AudioEngine.playSfx('unlock');
  });
}
