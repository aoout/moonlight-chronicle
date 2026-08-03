/* =========================================================
   蚀月远征 · 商店：打开集市与卡牌渲染
   ========================================================= */
import { playerState } from '../../state/player.js';
import { stageState } from '../../state/stage.js';
import { statsState } from '../../state/stats.js';
import { EventBus } from '../../core/event_bus.js';
import { purchaseWeapon, upgradeWeaponCmd, purchaseItem } from '../../commands/index.js';
import { CONFIG, WEAPONS, SHOP_ITEMS, inflationRate, WEAPON_UPGRADE_COST } from '../../data/index.js';
import { $, el, html, toast } from '../hud_utils.js';
import { AudioEngine } from '../../audio/engine.js';
import { iconSVG } from '../icons.js';
import { weaponFormulaText, weaponRangeText, weaponFormulaBreakdown } from './formulas.js';
import { renderShopPanel } from './panel.js';

const pSt = () => playerState.state;
const gSt = () => stageState.state;
const sSt = () => statsState.state;

type Offer =
  | { kind: 'newWeapon' | 'upWeapon'; id: string }
  | { kind: 'item'; data: any };

export function openShop(): void {
  const p = pSt().player;
  if (!p) return;
  AudioEngine.playSfx('open');
  const cards = $('shop-cards');
  cards.innerHTML = '';
  $('shop-sub').textContent = gSt().stage >= CONFIG.FINAL_STAGE ? '终焉已至，整备完毕即赴决战' : '第 ' + gSt().stage + ' 夜已渡，购置武装以御下一夜';

  // 1) 武器购买 / 升级卡：池 = 未拥有 + 未满级(Lv.5)的已拥有武器，
  //    抽到已拥有的即升级，价格随等级递增
  const pool = Object.keys(WEAPONS).filter(id => {
    const w = p.weapons.find((x: any) => x.id === id);
    return !w || w.lv < 10;
  });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const offers: Offer[] = [];
  for (let i = 0; i < CONFIG.SHOP_WEAPON_OFFERS; i++) {
    if (!shuffled.length) break;
    const id = shuffled.shift()!;
    offers.push(p.weapons.find((x: any) => x.id === id)
      ? { kind: 'upWeapon', id }
      : { kind: 'newWeapon', id });
  }

  // 2) 道具卡
  p.effects.boughtItems = p.effects.boughtItems || {};
  const boughtItems = p.effects.boughtItems;
  const itemPool = SHOP_ITEMS.filter(it => it.repeat || !boughtItems[it.id]);
  const nItems = 4;
  const itemOffers: any[] = [];
  while (itemOffers.length < nItems && itemPool.length) {
    itemOffers.push(itemPool.splice(Math.floor(Math.random() * itemPool.length), 1)[0]);
  }

  const all: Offer[] = [...offers, ...itemOffers.map(o => ({ kind: 'item' as const, data: o }))];
  all.sort(() => Math.random() - 0.5).forEach((o: any, i: number) => {
    const c = el('div', 'card');
    c.style.animationDelay = (i * 0.06) + 's';
    let title: string, icon: string, desc: string, price: number, rarity = 'common', tag = '';
    let def: any = null, it: any = null;
    if (o.kind === 'newWeapon') {
      def = WEAPONS[o.id];
      rarity = 'legend'; title = def.name; icon = def.icon; tag = def.tag;
      desc = '<span class="stat-conv">新武器</span> · ' + def.desc +
        '<div class="upgrade-tier">倍率构成：' + weaponFormulaText(def) + '</div>' +
        '<div class="upgrade-tier range">⟡ ' + (weaponRangeText(def) || '—') + (def.pierce !== undefined ? ' · 穿透 ' + (def.pierce === Infinity ? '∞' : def.pierce) : '') + '</div>';
      const inflate = inflationRate(gSt().stage);
      price = Math.round(16 * (p.effects.priceMul || 1) * inflate);
    } else if (o.kind === 'upWeapon') {
      const w = p.weapons.find((x: any) => x.id === o.id);
      if (!w) return;
      def = WEAPONS[o.id];
      rarity = 'epic'; title = def.name + ' 强化'; icon = def.icon; tag = '强化';
      desc = '升至 <span class="stat-up">Lv.' + (w.lv + 1) + '</span>，伤害与形态进一步提升。' +
        '<div class="upgrade-tier range">⟡ ' + (weaponRangeText(def) || '—') + (def.pierce !== undefined ? ' · 穿透 ' + (def.pierce === Infinity ? '∞' : def.pierce) : '') + '</div>';
      const inflate = inflationRate(gSt().stage);
      price = Math.round(WEAPON_UPGRADE_COST[w.lv + 1] * (p.effects.priceMul || 1) * inflate);
    } else {
      it = o.data;
      rarity = it.rarity; title = it.name; icon = it.icon; tag = it.tag || (it.rarity === 'legend' ? '神恩' : it.rarity === 'epic' ? '非凡' : '寻常');
      desc = it.desc;
      const inflate = inflationRate(gSt().stage);
      price = Math.round(it.price * (p.effects.priceMul || 1) * inflate);
    }
    c.classList.add('rarity-' + rarity, 'weapon-card');
    c.innerHTML = html`
      <div class="card-rarity">${tag}</div>
      <div class="card-ic">${icon}</div>
      <div class="card-name">${title}</div>
      <div class="card-desc">${desc}</div>
      <div class="card-price">${iconSVG('coin')} ${price}</div>
    `;
    if (sSt().gold < price) c.classList.add('cant-afford');
    c.onclick = () => {
      let r: { ok: boolean; reason?: string };
      if (o.kind === 'newWeapon') r = purchaseWeapon(o.id, price);
      else if (o.kind === 'upWeapon') r = upgradeWeaponCmd(o.id, price);
      else r = purchaseItem(it, price);
      if (!r.ok) { if (r.reason) toast(r.reason); return; }
      AudioEngine.playSfx('buy');
      if (o.kind === 'newWeapon') { if (def) toast(def.name + ' 已佩戴'); }
      else if (o.kind === 'upWeapon') { toast(title + ' 完成'); }
      else {
        const cnt = p.effects.boughtItems?.[it.id];
        toast(title + ' 已生效' + (it.repeat && typeof cnt === 'number' && cnt > 1 ? ' x' + cnt : ''));
      }
      openShop();
    };
    cards.appendChild(c);
  });
  $('shop-gold').textContent = String(Math.floor(sSt().gold));
  renderShopPanel(p);
  $('shop').classList.remove('hidden');
  EventBus.emit('shop:open', { stage: gSt().stage, gold: sSt().gold });
}
