/* =========================================================
   蚀月远征 · 商店：打开集市与卡牌渲染（槽位驱动）
   货架由 ShopState.slots 承载：购买置空（sold）；
   涨潮补货 = 全量刷新全部槽位（含未售），槽类型不变。
   每夜进入商店时 resetShopNight() 重建货架。
   ========================================================= */
import { EVENTS } from '../../../engine/core/events.js';
import { playerState } from '../../../state/player.js';
import { stageState } from '../../../state/stage.js';
import { shopState, resetShopNight } from '../../../state/shop.js';
import { statsState } from '../../../state/stats.js';
import { EventBus } from '../../../engine/core/event_bus.js';
import { purchaseWeapon, upgradeWeaponCmd, purchaseItem, refillShop } from '../../../commands/index.js';
import { CONFIG, WEAPONS, SHOP_ITEMS, inflationRate, WEAPON_UPGRADE_COST, refillPrice } from '../../../config/index.js';
import { generateShopSlots } from '../../../domain/shop_offers.js';
import { $, el, html, toast } from '../hud_utils.js';
import { AudioEngine } from '../../../platform/audio/engine.js';
import { iconSVG } from '../../../assets/icons.js';
import { weaponFormulaText, weaponRangeText } from './formulas.js';
import { renderShopPanel } from './panel.js';
import { isDevMode } from '../../../engine/env.js';
import { currentMoonPhaseDesc } from '../../../config/moon_phase.js';

const pSt = () => playerState.state;
const gSt = () => stageState.state;
const sSt = () => statsState.state;

/** 测量卡片内容，超出时按比例缩放 card-inner */
function fitCardContent(card: HTMLElement): void {
  const inner = card.querySelector('.card-inner') as HTMLElement | null;
  if (!inner) return;
  inner.style.transform = 'scale(1)';
  const style = getComputedStyle(card);
  const avail = card.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const need = inner.scrollHeight;
  if (need > avail) {
    const s = avail / need;
    inner.style.transform = `scale(${s})`;
  }
}

/** 侵蚀武器的倍率构成行（+ 月蚀深度×(x+y×L)） */
function formulaRow(def: any, eroded: boolean): string {
  const er = eroded && def.erosion
    ? ' <span class="eroded-tier">+ 月蚀深度×(' + (Math.round(def.erosion.x * 100) / 100) + '+' + (Math.round(def.erosion.y * 100) / 100) + '×L)</span>'
    : '';
  return '<div class="upgrade-tier">倍率构成：' + weaponFormulaText(def) + er + '</div>';
}

/** 刷新按钮状态与价格（每次渲染刷新）：始终可用，只受金币约束 */
function updateRefillBtn(): void {
  const btn = $('btn-shop-refill') as HTMLButtonElement | null;
  if (!btn) return;
  btn.disabled = false;
  btn.textContent = '涨潮补货 · ' + refillPrice(shopState.state.refills + 1) + ' 金';
}

/** 渲染货架卡片（不清状态；购买后置 sold 再调用本函数即可） */
function renderShop(): void {
  const p = pSt().player;
  if (!p) return;
  const st = shopState.state;
  if (!st.slots.length) shopState.set('slots', generateShopSlots(p));
  const slots = shopState.state.slots;

  const cards = $('shop-cards');
  cards.innerHTML = '';
  $('shop-sub').textContent = gSt().stage >= CONFIG.FINAL_STAGE ? '终焉已至，整备完毕即赴决战'
    : gSt().stage <= 0 && isDevMode() ? '月蚀神启 · 踏入第一夜前的整备'
    : '第 ' + gSt().stage + ' 夜已渡，购置武装以御下一夜';

  slots.forEach((slot, i) => {
    const c = el('div', 'card');
    c.style.animationDelay = (i * 0.06) + 's';

    // 已售罄：空位卡
    if (slot.sold) {
      c.classList.add('sold');
      c.innerHTML = '<div class="sold-tag">已售罄</div>';
      cards.appendChild(c);
      return;
    }

    let title: string, icon: string, desc: string, price: number, rarity = 'common', tag = '';
    let def: any = null;
    if (slot.kind === 'weapon') {
      def = WEAPONS[slot.id];
      const w = p.weapons.find((x: any) => x.id === slot.id);
      const isUp = !!w;
      rarity = isUp ? 'epic' : 'legend';
      title = def.name + (slot.eroded ? '·侵蚀' : '') + (isUp ? ' 强化' : '');
      icon = def.icon;
      tag = isUp ? '强化' : def.tag;
      desc = (isUp
        ? '升至 <span class="stat-up">Lv.' + (w!.lv + 1) + '</span>，伤害与形态进一步提升。'
        : '<span class="stat-conv">新武器</span> · ' + def.desc) +
        formulaRow(def, !!slot.eroded) +
        '<div class="upgrade-tier range">⟡ ' + (weaponRangeText(def) || '—') + (def.pierce !== undefined ? ' · 穿透 ' + (def.pierce === Infinity ? '∞' : def.pierce) : '') + '</div>';
      const inflate = inflationRate(gSt().stage);
      price = isUp
        ? Math.round(WEAPON_UPGRADE_COST[w!.lv + 1] * (p.effects.priceMul || 1) * inflate)
        : Math.round(16 * (p.effects.priceMul || 1) * inflate);
    } else {
      const it = SHOP_ITEMS.find(x => x.id === slot.id)!;
      rarity = it.rarity;
      title = it.name;
      icon = it.icon;
      tag = it.tag || (it.rarity === 'legend' ? '神恩' : it.rarity === 'epic' ? '非凡' : '寻常');
      desc = it.id === 'yourMoon' ? currentMoonPhaseDesc() : it.desc;
      const inflate = inflationRate(gSt().stage);
      price = Math.round(it.price * (p.effects.priceMul || 1) * inflate);
    }

    c.classList.add('rarity-' + rarity, 'weapon-card');
    if (slot.eroded) c.classList.add('eroded');
    const iconColor = def ? ` style="color:${def.color};filter:drop-shadow(0 0 10px ${def.color}88)"` : '';
    c.innerHTML = html`
      <div class="card-inner">
        <div class="card-rarity">${tag}</div>
        <div class="card-ic"${iconColor}>${icon}</div>
        <div class="card-name">${title}</div>
        <div class="card-desc">${desc}</div>
        <div class="card-price">${iconSVG('coin')} ${price}</div>
      </div>
    `;
    if (!isDevMode() && sSt().gold < price) c.classList.add('cant-afford');
    c.onclick = () => {
      let r: { ok: boolean; reason?: string };
      if (slot.kind === 'weapon') {
        const w = p.weapons.find((x: any) => x.id === slot.id);
        r = w ? upgradeWeaponCmd(slot.id, price) : purchaseWeapon(slot.id, price, slot.eroded);
      } else {
        const it = SHOP_ITEMS.find(x => x.id === slot.id)!;
        r = purchaseItem(it, price);
      }
      if (!r.ok) { if (r.reason) toast(r.reason); return; }
      AudioEngine.playSfx('buy');
      if (slot.kind === 'weapon') toast(def.name + (p.weapons.some((x: any) => x.id === slot.id && x.lv > 1) ? ' 强化完成' : ' 已佩戴'));
      else toast(title + ' 已生效');
      // 原地置为已售罄，不重建整面货架（避免"购买=刷新"的视觉误感）
      const next = shopState.state.slots.map(x => ({ ...x }));
      next[i].sold = true;
      shopState.set('slots', next);
      c.classList.add('sold');
      c.innerHTML = '<div class="sold-tag">已售罄</div>';
      c.onclick = null;
      $('shop-gold').textContent = String(Math.floor(sSt().gold));
      renderShopPanel(p);
    };
    cards.appendChild(c);
  });

  requestAnimationFrame(() => {
    Array.from(cards.children).forEach(child => fitCardContent(child as HTMLElement));
  });
  updateRefillBtn();
  $('shop-gold').textContent = String(Math.floor(sSt().gold));
  renderShopPanel(p);
  $('shop').classList.remove('hidden');
  EventBus.emit(EVENTS.SHOP_OPEN, { stage: gSt().stage, gold: sSt().gold });
}

/** 绑定涨潮补货按钮（按钮是静态 DOM，绑定一次即可） */
function bindRefill(): void {
  const btn = $('btn-shop-refill') as HTMLButtonElement | null;
  if (!btn) return;
  btn.onclick = () => {
    const r = refillShop();
    if (!r.ok) { if (r.reason) toast(r.reason); return; }
    AudioEngine.playSfx('buy');
    toast('涨潮补货 · ' + r.price + ' 金');
    renderShop();
  };
}

/** 每夜进入商店：重置货架与刷新计数后渲染 */
export function openShop(): void {
  const p = pSt().player;
  if (!p) return;
  AudioEngine.playSfx('open');
  resetShopNight();
  bindRefill();
  renderShop();
}
