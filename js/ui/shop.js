// @ts-check
/* =========================================================
   蚀月远征 · 商店层：集市 / 守月人铭牌 / 武器详情与出售
   ========================================================= */
import { G, STATE, sm } from '../state.js';
import { EventBus } from '../core/event_bus.js';
import { clamp } from '../utils.js';
import { computeDerived, addWeapon, upgradeWeapon, removeWeapon } from '../player_fn.js';
import { codexAdd } from '../codex.js';
import { CONFIG, WEAPONS, SHOP_ITEMS, inflationRate, STATS, WEAPON_UPGRADE_COST } from '../data/index.js';
import { $, el, toast } from './hud.js';
import { AudioEngine } from '../audio.js';
import { ICONS, iconSVG } from '../icons.js';

export function openShop() {
  const p = G.player;
  if (!p) return;
  sm.transition(STATE.SHOP);
  AudioEngine.playSfx('open');
  const cards = $('shop-cards');
  cards.innerHTML = '';
  $('shop-sub').textContent = G.stage >= CONFIG.FINAL_STAGE ? '终焉已至，整备完毕即赴决战' : '第 ' + G.stage + ' 夜已渡，购置武装以御下一夜';

  // 1) 武器购买 / 升级卡：池 = 未拥有 + 未满级(Lv.5)的已拥有武器，
  //    抽到已拥有的即升级，价格随等级递增
  const pool = Object.keys(WEAPONS).filter(id => {
    const w = p.weapons.find(x => x.id === id);
    return !w || w.lv < 10;
  });
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const offers = [];
  for (let i = 0; i < CONFIG.SHOP_WEAPON_OFFERS; i++) {
    if (!shuffled.length) break;
    const id = shuffled.shift();
    offers.push(p.weapons.find(x => x.id === id)
      ? { kind: 'upWeapon', id }
      : { kind: 'newWeapon', id });
  }

  // 2) 道具卡
  p._boughtItems = p._boughtItems || {};
  const itemPool = SHOP_ITEMS.filter(it => it.repeat || !p._boughtItems[it.id]);
  const nItems = 4;
  const itemOffers = [];
  while (itemOffers.length < nItems && itemPool.length) {
    itemOffers.push(itemPool.splice(Math.floor(Math.random() * itemPool.length), 1)[0]);
  }

  const all = [...offers, ...itemOffers.map(o => ({ kind: 'item', data: o }))];
  all.sort(() => Math.random() - 0.5).forEach((/** @type {any} */ o, i) => {
    const c = el('div', 'card');
    c.style.animationDelay = (i * 0.06) + 's';
    let title, icon, desc, price, rarity = 'common', tag = '';
    let def = null, it = null;
    if (o.kind === 'newWeapon') {
      def = WEAPONS[o.id];
      rarity = 'legend'; title = def.name; icon = def.icon; tag = def.tag;
      desc = '<span class="stat-conv">新武器</span> · ' + def.desc +
        '<div class="upgrade-tier">倍率构成：' + weaponFormulaText(def) + '</div>' +
        '<div class="upgrade-tier range">⟡ ' + (weaponRangeText(def) || '—') + (def.pierce !== undefined ? ' · 穿透 ' + (def.pierce === Infinity ? '∞' : def.pierce) : '') + '</div>';
      const inflate = inflationRate(G.stage);
      price = Math.round(16 * (p._priceMul || 1) * inflate);
    } else if (o.kind === 'upWeapon') {
      const w = p.weapons.find(x => x.id === o.id);
      if (!w) return;
      def = WEAPONS[o.id];
      rarity = 'epic'; title = def.name + ' 强化'; icon = def.icon; tag = '强化';
      desc = '升至 <span class="stat-up">Lv.' + (w.lv + 1) + '</span>，伤害与形态进一步提升。' +
        '<div class="upgrade-tier range">⟡ ' + (weaponRangeText(def) || '—') + (def.pierce !== undefined ? ' · 穿透 ' + (def.pierce === Infinity ? '∞' : def.pierce) : '') + '</div>';
      const inflate = inflationRate(G.stage);
      price = Math.round(WEAPON_UPGRADE_COST[w.lv + 1] * (p._priceMul || 1) * inflate);
    } else {
      it = o.data;
      rarity = it.rarity; title = it.name; icon = it.icon; tag = it.tag || (it.rarity === 'legend' ? '神恩' : it.rarity === 'epic' ? '非凡' : '寻常');
      desc = it.desc;
      const inflate = inflationRate(G.stage);
      price = Math.round(it.price * (p._priceMul || 1) * inflate);
    }
    c.classList.add('rarity-' + rarity, 'weapon-card');
    c.innerHTML =
      '<div class="card-rarity">' + tag + '</div>' +
      '<div class="card-ic">' + icon + '</div>' +
      '<div class="card-name">' + title + '</div>' +
      '<div class="card-desc">' + desc + '</div>' +
      '<div class="card-price">' + iconSVG('coin') + ' ' + price + '</div>';
    if (G.gold < price) c.classList.add('cant-afford');
    c.onclick = () => {
      if (G.gold < price) { toast('金币不足'); return; }
      if (o.kind === 'newWeapon' && !addWeapon(o.id)) { toast('武器栏已满（最多 5 件）'); return; }
      G.gold -= price;
      AudioEngine.playSfx('buy');
      if (o.kind === 'newWeapon') { if (def) toast(def.name + ' 已佩戴'); }
      else if (o.kind === 'upWeapon') { upgradeWeapon(o.id); toast(title + ' 完成'); }
      else {
        it.apply(p);
        codexAdd('items', it.id);   // 蚀之图鉴：秘宝入册
        const cnt = it.repeat ? (p._boughtItems[it.id] || 0) + 1 : 1;
        p._boughtItems[it.id] = it.repeat ? cnt : true;
        toast(title + ' 已生效' + (it.repeat && cnt > 1 ? ' x' + cnt : ''));
      }
      const pl = G.player;
      if (pl) computeDerived(pl);
      openShop();
    };
    cards.appendChild(c);
  });
  $('shop-gold').textContent = String(Math.floor(G.gold));
  renderShopPanel(p);
  $('shop').classList.remove('hidden');
  EventBus.emit('shop:open', { stage: G.stage, gold: G.gold });
}

/* ---------- 商店 · 守月人铭牌 ---------- */
// 非 STATS 的隐藏机制属性展示定义
/** @type {Record<string, {name:string,icon:string,fmt:(v:any)=>string}>} */
const MECH = {
  pierce:        { name:'穿透',     icon:ICONS.pierce,   fmt:v=>'+'+v },
  chainLightning:{ name:'连锁闪电', icon:ICONS.chain,    fmt:v=>(v*100).toFixed(0)+'%' },
  echo:          { name:'回响连击', icon:ICONS.hourglass,fmt:v=>(v*100).toFixed(0)+'%' },
  timeStop:      { name:'静止时停', icon:ICONS.hourglass,fmt:()=>'每 12s / 1s' },
  lowHpDmg:      { name:'绝境增伤', icon:ICONS.flame,    fmt:v=>'+'+(v*100).toFixed(0)+'%' },
  fullHpCrit:    { name:'满血暴击', icon:ICONS.spark,    fmt:v=>'+'+(v*100).toFixed(0)+'%' },
  autoPick:      { name:'自动拾取', icon:ICONS.magnet,   fmt:()=>'开启' },
  boom:          { name:'击杀爆炸', icon:ICONS.meteor,   fmt:v=>(v*100).toFixed(0)+'%' },
  onKillHp:      { name:'击杀回血', icon:ICONS.plus,     fmt:v=>'+'+v },
  scaleLevel:    { name:'每级攻击', icon:ICONS.book,     fmt:v=>'+'+v },
  scaleStage:    { name:'每关攻击', icon:ICONS.moon,     fmt:v=>'+'+v },
  };

// 属性面板分组：字符串 = 直接显示 p[key]；对象可指定 show（派生键，转模加成已并入）与 fmt
const SHOP_PANEL_GROUPS = [
  { title:'战意', icon:ICONS.sword, stats:[
    { key:'atk', show:'effAtk' },          // 攻击力（含护甲/生命/暴击转模）
    'atkSpd',
    { key:'critRate', show:'effCrit' },   // 暴击率（含移速转模）
    'critDmg','projCount','area','pierce','chainLightning','echo','lowHpDmg','fullHpCrit','boom','scaleLevel','scaleStage',
  ]},
  { title:'守护', icon:ICONS.shield, stats:['maxHp','armor','dodge','thorns','lifesteal','regen','onKillHp'] },
  { title:'疾驰', icon:ICONS.arrow, stats:[
    { key:'speed', show:'effSpeed' },     // 移速（含攻击转模）
  ]},
  { title:'天命', icon:ICONS.gem, stats:[
    'luck',
    { key:'goldGain', show:'effGold', fmt: /** @param {number} v */ v=>'×'+v.toFixed(1) },  // 金币获取（含幸运转模）
    'xpGain','magnet','autoPick','cdr','duration','timeStop',
  ]},
];

let _shopPanelPrev = {};

/** @param {any} p */
function renderShopPanel(p) {
  if (!p) return;
  // 每次打开商店时重置道具详情
  _siSelected = null;
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
  _pwSelected = null;
  if (!p.weapons.length) {
    wl.appendChild(el('div', 'pw-empty', '尚无武器'));
  } else {
    p.weapons.forEach(/** @param {any} w */ w => {
      const def = WEAPONS[w.id];
      const li = el('div', 'pw-item',
        '<span class="pw-ic">' + def.icon + '</span>' +
        '<span class="pw-name">' + def.name + '</span>' +
        '<span class="pw-lv">Lv.' + w.lv + '</span>');
      li.dataset.wid = w.id;
      li.onclick = () => showWeaponDetail(w.id);
      wl.appendChild(li);
    });
  }
  // 已拥有道具（已获物）
  const itemsBox = $('shop-items');
  if (itemsBox) {
    itemsBox.innerHTML = '';
    const owned = Object.keys(p._boughtItems || {})
      .map(id => ({ it: SHOP_ITEMS.find(x => x.id === id), n: p._boughtItems[id] }))
      .filter(o => o.it);
    if (!owned.length) {
      itemsBox.appendChild(el('div', 'si-empty', '尚未购置道具'));
    } else {
      owned.forEach(o => {
        const it = o.it;
        const n = o.n;
        if (!it) return;
        const li = el('div', 'si-item rarity-' + it.rarity,
          '<span class="si-ic">' + it.icon + '</span><span class="si-name">' + it.name + (n>1?(' x'+n):'') + '</span>');
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

/* 通用属性分组渲染（商店铭牌 / 暂停面板复用；prev 可选，用于购买后高亮） */
/**
 * @param {HTMLElement} container
 * @param {any} p
 * @param {Record<string,any>|undefined|null} [prev]
 */
export function renderStatGroupsInto(container, p, prev) {
  SHOP_PANEL_GROUPS.forEach(g => {
    const sec = el('div', 'stat-group');
    sec.appendChild(el('div', 'stat-group-title',
      '<span class="sgt-ic">' + g.icon + '</span>' + g.title));
    const grid = el('div', 'stat-grid');
    g.stats.forEach(item => {
      const key = typeof item === 'string' ? item : item.key;
      const def = STATS[key] || MECH[key];
      if (!def) return;
      const valKey = typeof item === 'object' && item.show ? item.show : key;
      const v = p[valKey] || 0;
      const itObj = /** @type {any} */ (item);
      const fmt = typeof item === 'object' && itObj.fmt ? itObj.fmt : def.fmt;
      const changed = prev && prev[key] !== undefined && prev[key] !== v;
      const row = el('div', 'stat-row' + (v === 0 ? ' zero' : '') + (changed ? ' flash' : ''));
      row.innerHTML =
        '<span class="sr-ic">' + def.icon + '</span>' +
        '<span class="sr-name">' + def.name + '</span>' +
        '<span class="sr-val">' + (v === 0 ? '—' : fmt(v)) + '</span>';
      grid.appendChild(row);
      if (prev) prev[key] = v;
    });
    sec.appendChild(grid);
    container.appendChild(sec);
  });
}

/* ---------- 商店 · 武器详情 / 出售 ---------- */
let _pwSelected = null;
/** @type {string|number} */
let _pwSellConfirm = 0;
/** @type {string|null} */ let _siSelected = null;   // 当前展开的道具 id

/**
 * @param {number} lv
 */
function weaponSellPrice(lv) { return Math.floor(8 + (lv - 1) * 4); }

/**
 * @param {string} id
 */
function showWeaponDetail(id) {
  const p = G.player;
  if (!p) return;
  const w = p.weapons.find(x => x.id === id);
  if (!w) return;
  const def = WEAPONS[id];
  const box = $('pw-detail');
  if (!box) return;
  _pwSelected = id;
  Array.from($('shop-weapons').children).forEach(li => { const el = /** @type {HTMLElement} */ (li); el.classList.toggle('active', el.dataset.wid === id); });
  // 本夜伤害占比
  const wDmg = G.runStats.wDmg || {};
  const wTotal = Object.keys(wDmg).reduce((s, k) => s + wDmg[k], 0);
  const pct = wTotal > 0 ? Math.round((wDmg[id] || 0) / wTotal * 100) : 0;
  // 属性明细
  /** @type {any[]} */
  const rows = [
    ['冷却', (def.cd ? def.cd() : (def.tick || 0) * 2).toFixed(2) + 's'],
  ];
  if (def.range) rows.push(['射程', def.range]);
  if (def.radius) rows.push(['环绕半径', def.radius]);
  if (def.pierce !== undefined) rows.push(['穿透', def.pierce === Infinity ? '∞' : def.pierce]);
  // 投射物数量（含余影/连珠加成）
  const projInfo = weaponProjInfo(def, p);
  if (projInfo.multi) {
    const diff = projInfo.total - projInfo.base;
    rows.push(['投射物', diff > 0 ? projInfo.base + '+' + diff + '→' + projInfo.total : String(projInfo.total)]);
  }
  if (def.aoe) rows.push(['范围', def.aoe]);
  if (def.fire && /** @type {any} */ (def.fire).chain) rows.push(['连锁', /** @type {any} */ (def.fire).chain + ' 次']);
  if (def.slow) rows.push(['减速', (def.slow * 100).toFixed(0) + '%']);
  if (def.homing) rows.push(['追踪', '是']);
  const price = weaponSellPrice(w.lv);
  box.innerHTML =
    '<div class="pwd-head">' +
      '<span class="pwd-ic">' + def.icon + '</span>' +
      '<div class="pwd-title">' +
        '<div class="pwd-name">' + def.name + '</div>' +
        '<div class="pwd-lv">Lv.' + w.lv + ' · 本夜占比 ' + pct + '%</div>' +
      '</div>' +
      '<button class="pwd-close" id="pwd-close">×</button>' +
    '</div>' +
    '<div class="pwd-formula">' + weaponFormulaText(def) + '</div>' +
    '<div class="pwd-calc">' +
      weaponFormulaBreakdown(def, p, w.lv).map(s =>
        '<div class="pwd-calc-row"><span>' + s.label + '</span><i>' + s.expr + '</i><b>' + (Math.round(s.value * 10) / 10) + '</b></div>').join('') +
      '<div class="pwd-calc-total">最终伤害 <b>' + Math.round(def.dmg(p, w.lv)) + '</b></div>' +
    '</div>' +
    '<div class="pwd-stats">' +
      rows.map(r => '<div class="pwd-stat"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>').join('') +
    '</div>' +
    '<div class="pwd-sell">' +
      '<button class="sell-btn" id="pwd-sell">出售 · ' + price + ' ' + iconSVG('coin') + '</button>' +
    '</div>';
  box.classList.remove('hidden');
  _pwSellConfirm = 0;
  $('pwd-close').onclick = () => {
    box.classList.add('hidden');
    _pwSelected = null;
    Array.from($('shop-weapons').children).forEach(li => { const el = /** @type {HTMLElement} */ (li); el.classList.remove('active'); });
  };
  $('pwd-sell').onclick = () => sellWeapon(id);
}

/**
 * @param {string} id
 */
function sellWeapon(id) {
  const p = G.player;
  if (!p) return;
  if (p.weapons.length <= 1) { toast('至少保留一件武器'); return; }
  const w = p.weapons.find(x => x.id === id);
  const def = WEAPONS[id];
  if (!w || !def) return;
  const price = weaponSellPrice(w.lv);
  const btn = $('pwd-sell');
  if (_pwSellConfirm !== id) {   // 二次确认
    _pwSellConfirm = id;
    btn.classList.add('confirm');
    btn.innerHTML = '确认出售 ' + price + ' ' + iconSVG('coin') + '？';
    setTimeout(() => {
      if (_pwSellConfirm === id) {
        _pwSellConfirm = 0;
        const b2 = $('pwd-sell');
        if (b2) { b2.classList.remove('confirm'); b2.innerHTML = '出售 · ' + price + ' ' + iconSVG('coin'); }
      }
    }, 2600);
    return;
  }
  G.gold += price;
  removeWeapon(id);
  AudioEngine.playSfx('sell');
  _pwSellConfirm = 0;
  toast(def.name + ' 已出售 +' + price);
  openShop();
}

/* ---------- 商店 · 道具详情 ---------- */

/* 道具生效效果列表：对转模等道具展示当前实时数值 */
/**
 * @param {import('../types/core.d.ts').ShopItemDef} it
 * @param {import('../types/core.d.ts').Player} p
 */
function getItemEffectRows(it, p) {
  /** @type {Record<string, (string|number)[][]>} */
  const map = {
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

/**
 * @param {string} id
 */
function showItemDetail(id) {
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
    Array.from($('shop-items').children).forEach(li => { const el = /** @type {HTMLElement} */ (li); el.classList.remove('active'); });
    return;
  }
  _siSelected = id;
  Array.from($('shop-items').children).forEach(li => { const el = /** @type {HTMLElement} */ (li); el.classList.toggle('active', el.dataset.sid === id); });
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
    Array.from($('shop-items').children).forEach(li => { const el = /** @type {HTMLElement} */ (li); el.classList.remove('active'); });
  };
}

/**
 * @param {import('../types/core.d.ts').WeaponDef} def
 */
export function weaponFormulaText(def) {
  return def.formula || '攻击 ×' + (0.6 + (typeof def.dmg === 'function' ? 0 : def.dmg)) ;
}

/* 武器范围描述（射程 / 范围 / 环绕半径） */
/**
 * @param {import('../types/core.d.ts').WeaponDef} def
 */
export function weaponRangeText(def) {
  if (def.radius) return '环绕半径 ' + def.radius;
  if (def.range) return '射程 ' + def.range;
  if (def.aoe) return '范围 ' + def.aoe;
  return null;
}

/* 倍率公式实时预览：拆解为代入当前数值的过程步骤 */
/* 倍率公式实时预览：数据表驱动（每把武器一组计算步骤） */
/** @type {Record<string, ([label:string, kind:string, get:(p:import('../types/core.d.ts').Player, lv:number)=>any, tpl?:(string|((p:import('../types/core.d.ts').Player, lv:number)=>any))])[]>} */
const WEAPON_FORMULAS = {
  moonRing:   [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.55+0.12*lv,'(0.55+0.12×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.55+0.12*lv)], ['移速','param',p=>p.speed||0], ['移速·0.12','part',(p,lv)=>(p.speed||0)*0.12]],
  crossbow:   [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.8+0.15*lv,'(0.8+0.15×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.8+0.15*lv)], ['攻速','param',p=>p.atkSpd||1], ['攻速·攻·0.4','part',(p,lv)=>(p.atkSpd||1)*(p.effAtk||0)*0.4]],
  arc:        [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.9+0.16*lv,'(0.9+0.16×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.9+0.16*lv)]],
  meteor:     [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>2.8+0.5*lv,'(2.8+0.5×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(2.8+0.5*lv)], ['生命上限','param',p=>p.maxHp||0], ['生命·8%','part',(p,lv)=>(p.maxHp||0)*0.08]],
  frost:      [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.7+0.12*lv,'(0.7+0.12×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.7+0.12*lv)], ['生命上限','param',p=>p.maxHp||0], ['生命·比例','part',(p,lv)=>(p.maxHp||0)*0.05*(1+lv*0.2)]],
  beam:       [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>1.05+0.18*lv,'(1.05+0.18×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(1.05+0.18*lv)], ['暴击率','param',p=>p.critRate||0], ['暴击·攻·1.5','part',(p,lv)=>(p.critRate||0)*(p.effAtk||0)*1.5]],
  orbit:      [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>(0.38+0.08*lv)*2,'(0.38+0.08×L)×2'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.38+0.08*lv)*2]],
  lance:      [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>1.2+0.2*lv,'(1.2+0.2×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(1.2+0.2*lv)], ['移速','param',p=>p.speed||0], ['移速倍率','param',(p,lv)=>0.08+0.02*lv,'(0.08+0.02×L)'], ['移速·倍率','part',(p,lv)=>(p.speed||0)*(0.08+0.02*lv)]],
  shadow:     [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.7+0.13*lv,'(0.7+0.13×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.7+0.13*lv)], ['溢暴伤','param',p=>Math.max(0,(p.critDmg||1.5)-1.5)], ['溢暴伤·攻·0.9','part',(p,lv)=>Math.max(0,(p.critDmg||1.5)-1.5)*(p.effAtk||0)*0.9]],
  storm:      [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.5+0.09*lv,'(0.5+0.09×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.5+0.09*lv)]],
  nova:       [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>1.5+0.25*lv,'(1.5+0.25×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(1.5+0.25*lv)], ['移速','param',p=>p.speed||0], ['移速·0.1','part',(p,lv)=>(p.speed||0)*0.1]],
  phantom:    [['攻击力','param',p=>p.effAtk||0], ['分身数','param',(p,lv)=>2+Math.floor(lv/2)], ['单分身·攻击×(0.45+0.08L)','param',(p,lv)=>(p.effAtk||0)*(0.45+0.08*lv)], ['总输出(单×分身数)','part',(p,lv)=>(p.effAtk||0)*(0.45+0.08*lv)*(2+Math.floor(lv/2))]],
};

/* 投射物数量计算：各武器对 projCount 的转化公式 */
/**
 * @param {import('../types/core.d.ts').WeaponDef} def
 * @param {import('../types/core.d.ts').Player} p
 */
function weaponProjInfo(def, p) {
  const id = def.id;
  const bonus = p.projCount || 0;
  const map = {
    moonRing:()=>{const b=1,e=Math.floor(bonus*0.6);return{base:b,total:Math.max(1,b+e),multi:true};},
    crossbow:()=>{return{base:1,total:1+bonus,multi:true};},
    lance:   ()=>{const e=Math.floor(bonus*0.5);return{base:1,total:1+e,multi:true};},
    shadow:  ()=>{return{base:1,total:1+bonus,multi:true};},
    storm:   ()=>{const b=def.proj||2;return{base:b,total:b+bonus,multi:true};},
    nova:    ()=>{const b=def.proj||10;return{base:b,total:b+bonus,multi:true};},
  };
  const fn = /** @type {any} */ (map)[id];
  if (fn) return fn();
  return { base:1, total:1, multi:false };
}

/**
 * @param {import('../types/core.d.ts').WeaponDef} def
 * @param {import('../types/core.d.ts').Player} p
 * @param {number} lv
 */
function weaponFormulaBreakdown(def, p, lv) {
  const F = WEAPON_FORMULAS[def.id];
  if (!F) return [{ label: '攻击力', expr: Math.round(p.effAtk || 0), value: p.effAtk || 0, kind: 'part' }];
  return F.map(s => {
    const [label, kind, get, tpl] = s;
    const value = get(p, lv);
    let expr;
    if (typeof tpl === 'function') expr = tpl(p, lv);
    else if (typeof tpl === 'string') expr = tpl.replace(/L/g, String(lv));
    else expr = (typeof value === 'number' ? Math.round(value * 100) / 100 : value);
    return { label, expr, value, kind };
  });
}


