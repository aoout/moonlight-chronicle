/* =========================================================
   蚀月远征 · 商店：道具详情
   ========================================================= */
import { G } from '../../state.js';
import { SHOP_ITEMS } from '../../data/index.js';
import { $ } from '../hud.js';
import type { ShopItemDef, Player } from '../../types/core.d.ts';

let _siSelected: string | null = null;

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
  const p = G.player;
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
  const html =
    '<div class="sid-head">' +
      '<span class="sid-ic">' + it.icon + '</span>' +
      '<div class="sid-title">' +
        '<div class="sid-name">' + it.name + '</div>' +
        '<div class="sid-tag">' + tag + '</div>' +
      '</div>' +
      '<button class="sid-close" id="sid-close">×</button>' +
    '</div>' +
    '<div class="sid-desc">' + it.desc + '</div>' +
    (effects ? '<div class="sid-effects"><div class="sid-effect-title">当前生效</div>' +
      effects.map(r => '<div class="sid-effect-row"><span class="sid-el">' + r[0] + '</span><span class="sid-arrow">→</span><span class="sid-el">' + r[1] + '</span><span class="sid-er">' + r[2] + '</span><span class="sid-er">' + r[3] + '</span></div>').join('') +
      '</div>' : '');
  box.className = 'si-detail rarity-' + it.rarity;
  box.innerHTML = html;
  box.classList.remove('hidden');
  $('sid-close').onclick = () => {
    box.classList.add('hidden');
    _siSelected = null;
    Array.from($('shop-items').children).forEach(li => { const target = li as HTMLElement; target.classList.remove('active'); });
  };
}
