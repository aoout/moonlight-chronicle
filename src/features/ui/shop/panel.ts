/* =========================================================
   蚀月远征 · 商店：守月人铭牌面板
   ========================================================= */
import { EVENTS } from '../../../engine/core/events.js';
import { clamp } from '../../../engine/util/utils.js';
import { SHOP_ITEMS, WEAPONS, STATS, WEAPON_UPGRADE_COST, inflationRate } from '../../../config/index.js';
import { $, el, html } from '../hud_utils.js';
import { iconSVG, ICONS } from '../../../assets/icons.js';
import { showWeaponDetail } from './weapon_detail.js';
import { showItemDetail } from './item_detail.js';
import { EventBus } from '../../../engine/core/event_bus.js';
import { shopState } from '../../../state/shop.js';
import { stageState } from '../../../state/stage.js';
import { statsState } from '../../../state/stats.js';
import { playerState } from '../../../state/player.js';
import { refillCost } from '../../../domain/shop_offers.js';
import { isDevMode } from '../../../engine/env.js';

const sSt = () => statsState.state;
const gSt = () => stageState.state;
const pSt = () => playerState.state.player;

/* 局部刷新入口：由详情页等同级模块通过事件触发，避免反向 import 形成环。
   出售武器/购买道具等改变余额的操作 emit 本事件 → 重渲染铭牌 + 整架重评估买得起标记 */
EventBus.on(EVENTS.SHOP_PANEL_REFRESH, (d: any) => {
  if (d?.player) {
    renderShopPanel(d.player);
    refreshShopAfford();
  }
});

/** 整面货架重新评估「金币不足」标记 + 金币徽章不足提示。
    价格读 .card-price[data-price]（渲染时写入）；已售罄卡跳过。
    任何改变余额的操作（购买 / 出售 / 补货）后调用。 */
export function refreshShopAfford(): void {
  const p = pSt();
  const gold = sSt().gold;
  /* 1) 每张未售卡：买不起 → cant-afford 标记 */
  document.querySelectorAll('#shop-cards .card:not(.sold)').forEach(card => {
    const priceEl = card.querySelector<HTMLElement>('.card-price');
    if (!priceEl) return;
    const price = parseFloat(priceEl.dataset.price || 'Infinity');
    card.classList.toggle('cant-afford', !isDevMode() && gold < price);
  });
  /* 2) 金币徽章：买不起任何未售品且补不起货 → poor 转红 */
  let coin: HTMLElement | null = null;
  const g = document.getElementById('shop-gold');
  if (g) coin = g.parentElement;
  if (!p || !coin) return;
  const refill = refillCost(p, shopState.state.refills + 1);
  let min = Infinity;
  for (const s of shopState.state.slots) {
    if (s.sold) continue;
    const inflate = inflationRate(gSt().stage);
    if (s.kind === 'weapon') {
      const def = WEAPONS[s.id];
      const w = p.weapons.find((x: any) => x.id === s.id);
      min = Math.min(min, w
        ? Math.round(WEAPON_UPGRADE_COST[w.lv + 1] * (p.effects.priceMul || 1) * inflate)
        : Math.round(16 * (p.effects.priceMul || 1) * inflate));
    } else {
      const it = SHOP_ITEMS.find(x => x.id === s.id);
      if (it) min = Math.min(min, Math.round(it.price * (p.effects.priceMul || 1) * inflate));
    }
  }
  const poor = !isDevMode() && Math.floor(gold) < min && Math.floor(gold) < refill;
  coin.classList.toggle('poor', poor);
}

// 非 STATS 的隐藏机制属性展示定义
const MECH: Record<string, { name: string; icon: string; fmt: (v: any) => string }> = {
  pierce:        { name:'穿透',     icon:ICONS.pierce,   fmt:v=>'+'+v },
  chainLightning:{ name:'连锁闪电', icon:ICONS.chain,    fmt:v=>(v*100).toFixed(0)+'%' },
  echo:          { name:'回响连击', icon:ICONS.hourglass,fmt:v=>(v*100).toFixed(0)+'%' },
  timeStop:      { name:'静止时停', icon:ICONS.hourglass,fmt:()=>'每 10s / 1s' },
  lowHpDmg:      { name:'绝境增伤', icon:ICONS.flame,    fmt:v=>'+'+(v*100).toFixed(0)+'%' },
  fullHpCrit:    { name:'满血暴击', icon:ICONS.spark,    fmt:v=>'+'+(v*100).toFixed(0)+'%' },
  autoPick:      { name:'自动拾取', icon:ICONS.magnet,   fmt:()=>'开启' },
  boom:          { name:'击杀爆炸', icon:ICONS.meteor,   fmt:v=>(v*100).toFixed(0)+'%' },
  onKillHp:      { name:'击杀回血', icon:ICONS.plus,     fmt:v=>'+'+v },
  scaleLevel:    { name:'每级攻击', icon:ICONS.book,     fmt:v=>'+'+v },
  scaleStage:    { name:'每关攻击', icon:ICONS.moon,     fmt:v=>'+'+v },
};

type StatItem = string | { key: string; show?: string; fmt?: (v: number) => string };

// 属性面板分组：仅守月人本体属性（秘宝机制效果归入下方折叠区）
const SHOP_PANEL_GROUPS: { title: string; icon: string; stats: StatItem[] }[] = [
  { title:'战意', icon:ICONS.sword, stats:[
    { key:'atk', show:'effAtk' },
    'atkSpd',
    { key:'critRate', show:'effCrit' },
    'critDmg','projCount','area',
  ]},
  { title:'守护', icon:ICONS.shield, stats:['maxHp','armor','dodge','thorns','lifesteal','regen'] },
  { title:'疾驰', icon:ICONS.arrow, stats:[
    { key:'speed', show:'effSpeed' },
  ]},
  { title:'天命', icon:ICONS.gem, stats:[
    'luck',
    { key:'goldGain', show:'effGold', fmt: (v: number) =>'×'+v.toFixed(1) },
    'xpGain','magnet','cdr','duration',
  ]},
];

// 秘宝之效：由秘宝/武器带来的机制效果，非守月人本体属性，折叠展示
const MECH_GROUP: { title: string; icon: string; stats: StatItem[] } = {
  title:'秘宝之效', icon:ICONS.diamond, stats:[
    'pierce','chainLightning','echo','timeStop','lowHpDmg','fullHpCrit',
    'autoPick','boom','onKillHp','scaleLevel','scaleStage',
  ],
};

/* 秘宝折叠区展开状态（商店/暂停面板共用，保留用户选择） */
let _mechOpen = false;

let _shopPanelPrev: Record<string, any> = {};

export function renderShopPanel(p: any): void {
  if (!p) return;
  // 重置道具详情
  const siDetail = $('si-detail');
  if (siDetail) siDetail.classList.add('hidden');
  // 头像 / 生命
  $('shop-avatar').innerHTML = iconSVG('moonFull');
  const hpPct = clamp(p.hp / p.maxHp * 100, 0, 100);
  $('shop-hp-fill').style.width = hpPct + '%';
  $('shop-hp-text').textContent = Math.round(p.hp) + ' / ' + Math.round(p.maxHp);
  // 精华四值（派生）
  $('ess-atk-ic').innerHTML = iconSVG('sword');
  $('ess-crit-ic').innerHTML = iconSVG('diamond');
  $('ess-spd-ic').innerHTML = iconSVG('arrow');
  $('ess-gold-ic').innerHTML = iconSVG('coin');
  $('ess-atk').textContent = String(Math.round(p.effAtk));
  $('ess-crit').textContent = (p.effCrit * 100).toFixed(0) + '%';
  $('ess-spd').textContent = String(Math.round(p.effSpeed));
  $('ess-gold').textContent = '×' + p.effGold.toFixed(1);
  // 已佩戴武器
  const wl = $('shop-weapons');
  wl.innerHTML = '';
  const detail = $('pw-detail');
  if (detail) detail.classList.add('hidden');
  if (!p.weapons.length) {
    wl.appendChild(el('div', 'pw-empty', '尚无武器'));
  } else {
    p.weapons.forEach((w: any) => {
      const def = WEAPONS[w.id];
      const li = el('div', 'pw-item' + (w.eroded ? ' eroded' : ''), html`
        <span class="pw-ic" style="color:${def.color}">${def.icon}</span>
        <span class="pw-name">${def.name}${w.eroded ? '·侵蚀' : ''}</span>
        <span class="pw-lv">Lv.${w.lv}</span>
      `);
      li.dataset.wid = w.id;
      li.onclick = () => showWeaponDetail(w.id);
      wl.appendChild(li);
    });
  }
  // 已拥有道具
  const itemsBox = $('shop-items');
  if (itemsBox) {
    itemsBox.innerHTML = '';
    const owned = Object.keys(p.effects.boughtItems || {})
      .map(id => ({ it: SHOP_ITEMS.find(x => x.id === id), n: p.effects.boughtItems[id] }))
      .filter(o => o.it);
    if (!owned.length) {
      itemsBox.appendChild(el('div', 'si-empty', '尚未购置道具'));
    } else {
      owned.forEach(o => {
        const it = o.it;
        const n = o.n;
        if (!it) return;
        const li = el('div', 'si-item rarity-' + it.rarity, html`
          <span class="si-ic">${it.icon}</span>
          <span class="si-name">${it.name}${n > 1 ? ' x' + n : ''}</span>
        `);
        li.dataset.sid = it.id;
        li.onclick = () => showItemDetail(it.id);
        itemsBox.appendChild(li);
      });
    }
  }
  // 分组属性
  const st = $('shop-stats');
  st.innerHTML = '';
  renderStatGroupsInto(st, p, _shopPanelPrev || (_shopPanelPrev = {}));
}

/* 渲染单行属性 */
function statRow(item: StatItem, p: any, prev?: Record<string, any> | null): HTMLElement | null {
  const key = typeof item === 'string' ? item : item.key;
  const def: any = STATS[key] || MECH[key];
  if (!def) return null;
  const valKey = typeof item === 'object' && (item as any).show ? (item as any).show : key;
  const v = p[valKey] || 0;
  const itObj = item as any;
  const fmt = typeof item === 'object' && itObj.fmt ? itObj.fmt : def.fmt;
  const changed = prev && prev[key] !== undefined && prev[key] !== v;
  /* 0 是正常数值（护甲 0 即没有护甲），照常显示，不做弱化 */
  const row = el('div', 'stat-row' + (changed ? ' flash' : ''));
  row.innerHTML = html`
    <span class="sr-ic">${def.icon}</span>
    <span class="sr-name">${def.name}</span>
    <span class="sr-val">${fmt(v)}</span>
  `;
  if (prev) prev[key] = v;
  return row;
}

/* 秘宝之效折叠区：仅当存在已生效的机制效果时渲染；只列非零项 */
function renderMechGroup(container: HTMLElement, p: any, prev?: Record<string, any> | null): void {
  const active = MECH_GROUP.stats
    .filter(item => {
      const key = typeof item === 'string' ? item : item.key;
      const valKey = typeof item === 'object' && (item as any).show ? (item as any).show : key;
      return (p[valKey] || 0) !== 0;
    })
    .map(item => statRow(item, p, prev))
    .filter((r): r is HTMLElement => !!r);
  if (!active.length) return;
  const sec = el('div', 'stat-group mech-group' + (_mechOpen ? ' open' : ''));
  const btn = el('button', 'stat-group-title mech-toggle', html`
    <span class="sgt-ic">${MECH_GROUP.icon}</span>${MECH_GROUP.title}
    <span class="mech-caret">${_mechOpen ? '▾' : '▸'}</span>
  `);
  btn.onclick = () => {
    _mechOpen = !_mechOpen;
    sec.classList.toggle('open', _mechOpen);
    const caret = sec.querySelector('.mech-caret');
    if (caret) caret.textContent = _mechOpen ? '▾' : '▸';
  };
  sec.appendChild(btn);
  const grid = el('div', 'stat-grid mech-grid');
  active.forEach(row => grid.appendChild(row));
  sec.appendChild(grid);
  container.appendChild(sec);
}

/* 通用属性分组渲染 */
export function renderStatGroupsInto(container: HTMLElement, p: any, prev?: Record<string, any> | null): void {
  SHOP_PANEL_GROUPS.forEach(g => {
    const sec = el('div', 'stat-group');
    sec.appendChild(el('div', 'stat-group-title', html`
        <span class="sgt-ic">${g.icon}</span>${g.title}
      `));
    const grid = el('div', 'stat-grid');
    g.stats.forEach(item => {
      const row = statRow(item, p, prev);
      if (row) grid.appendChild(row);
    });
    sec.appendChild(grid);
    container.appendChild(sec);
  });
  renderMechGroup(container, p, prev);
}
