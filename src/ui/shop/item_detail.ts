/* =========================================================
   蚀月远征 · 商店：道具详情
   ========================================================= */
import { playerState } from '../../state/player.js';
import { SHOP_ITEMS } from '../../data/index.js';
import { $, html } from '../hud_utils.js';
import type { ShopItemDef, Player } from '../../types/core.d.ts';

const pSt = () => playerState.state;

let _siSelected: string | null = null;

/* 可统计伤害的道具 */
const DMG_STAT_ITEMS = new Set(['boom', 'thorns', 'starfall', 'splash', 'critBoom']);
/* 可统计金币的道具 */
const GOLD_STAT_ITEMS = new Set(['goldMeteor']);

/** 构建道具战绩统计 HTML */
function getItemStatsHtml(it: ShopItemDef, p: Player): string | null {
  const stats = p.effects.itemStats?.[it.id];
  if (!stats) return null;
  const rows: string[] = [];
  if (DMG_STAT_ITEMS.has(it.id)) {
    rows.push(`<div class="sid-stat-row"><span class="sid-stat-label">上一夜伤害</span><span class="sid-stat-val">${Math.round(stats.lastStageDmg)}</span></div>`);
    rows.push(`<div class="sid-stat-row"><span class="sid-stat-label">总伤害</span><span class="sid-stat-val">${Math.round(stats.dmg)}</span></div>`);
  }
  if (GOLD_STAT_ITEMS.has(it.id)) {
    rows.push(`<div class="sid-stat-row"><span class="sid-stat-label">上一夜额外金币</span><span class="sid-stat-val">${Math.round(stats.lastStageExtraGold)}</span></div>`);
    rows.push(`<div class="sid-stat-row"><span class="sid-stat-label">总额外金币</span><span class="sid-stat-val">${Math.round(stats.extraGold)}</span></div>`);
  }
  if (rows.length === 0) return null;
  return `<div class="sid-stats"><div class="sid-stat-title">战绩记录</div>${rows.join('')}</div>`;
}

/* 道具生效效果列表：对转模等道具展示当前实时数值 */
function getItemEffectRows(it: ShopItemDef, p: Player): (string | number)[][] | null {
  const map: Record<string, (string | number)[][]> = {
    speedCrit: [
      ['移速', Math.round(p.speed), '12%', (p.speed * 0.12).toFixed(1) + ' 暴击率'],
    ],
    armorAtk: [
      ['护甲', p.armor.toFixed(1), '60%', (p.armor * 0.6).toFixed(1) + ' 攻击力'],
    ],
    hpAtk: [
      ['生命上限', Math.round(p.maxHp), '6%', (p.maxHp * 0.06).toFixed(1) + ' 攻击力'],
    ],
    atkSpd: [
      ['攻击力', Math.round(p.effAtk), '40%', (p.effAtk * 0.4).toFixed(1) + ' 移速'],
    ],
    critAtk: [
      ['暴击率', (p.critRate * 100).toFixed(0) + '%', '150%', (p.critRate * 1.5 * p.effAtk).toFixed(1) + ' 攻击力'],
    ],
    luckGold: [
      ['幸运', (p.luck * 100).toFixed(0) + '%', '每点 +8%', '金币获取'],
    ],
  };
  return map[it.id] || null;
}

export function showItemDetail(id: string): void {
  const p = pSt().player;
  if (!p) return;
  const it = SHOP_ITEMS.find(x => x.id === id);
  if (!it) return;
  const box = $('si-detail');
  if (!box) return;
  // 点击已展开的同道具：关闭
  if (_siSelected === id && !box.classList.contains('hidden')) {
    box.classList.add('hidden');
    _siSelected = null;
    Array.from($('shop-items').children).forEach(li => { const target = li as HTMLElement; target.classList.remove('active'); });
    return;
  }
  _siSelected = id;
  Array.from($('shop-items').children).forEach(li => { const target = li as HTMLElement; target.classList.toggle('active', target.dataset.sid === id); });
  const tag = it.tag || (it.rarity === 'legend' ? '神恩' : it.rarity === 'epic' ? '非凡' : '寻常');
  const effects = getItemEffectRows(it, p);
  const statsHtml = getItemStatsHtml(it, p);
  const content = html`
    <div class="sid-head">
      <span class="sid-ic">${it.icon}</span>
      <div class="sid-title">
        <div class="sid-name">${it.name}</div>
        <div class="sid-tag">${tag}</div>
      </div>
      <button class="sid-close" id="sid-close">×</button>
    </div>
    <div class="sid-desc">${it.desc}</div>
    ${effects ? html`<div class="sid-effects"><div class="sid-effect-title">当前生效</div>
      ${effects.map(r => html`<div class="sid-effect-row"><span class="sid-el">${r[0]}</span><span class="sid-arrow">→</span><span class="sid-el">${r[1]}</span><span class="sid-er">${r[2]}</span><span class="sid-er">${r[3]}</span></div>`).join('')}
    </div>` : ''}
    ${statsHtml || ''}
  `;
  box.className = 'si-detail rarity-' + it.rarity;
  box.innerHTML = content;
  box.classList.remove('hidden');
  $('sid-close').onclick = () => {
    box.classList.add('hidden');
    _siSelected = null;
    Array.from($('shop-items').children).forEach(li => { const target = li as HTMLElement; target.classList.remove('active'); });
  };
}
