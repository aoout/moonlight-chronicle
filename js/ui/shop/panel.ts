/* =========================================================
   蚀月远征 · 商店：守月人铭牌面板
   ========================================================= */
import { clamp } from '../../utils.js';
import { SHOP_ITEMS, WEAPONS, STATS } from '../../data/index.js';
import { $, el } from '../hud.js';
import { iconSVG, ICONS } from '../icons.js';
import { showWeaponDetail } from './weapon_detail.js';
import { showItemDetail } from './item_detail.js';

// 非 STATS 的隐藏机制属性展示定义
const MECH: Record<string, { name: string; icon: string; fmt: (v: any) => string }> = {
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

type StatItem = string | { key: string; show?: string; fmt?: (v: number) => string };

// 属性面板分组
const SHOP_PANEL_GROUPS: { title: string; icon: string; stats: StatItem[] }[] = [
  { title:'战意', icon:ICONS.sword, stats:[
    { key:'atk', show:'effAtk' },
    'atkSpd',
    { key:'critRate', show:'effCrit' },
    'critDmg','projCount','area','pierce','chainLightning','echo','lowHpDmg','fullHpCrit','boom','scaleLevel','scaleStage',
  ]},
  { title:'守护', icon:ICONS.shield, stats:['maxHp','armor','dodge','thorns','lifesteal','regen','onKillHp'] },
  { title:'疾驰', icon:ICONS.arrow, stats:[
    { key:'speed', show:'effSpeed' },
  ]},
  { title:'天命', icon:ICONS.gem, stats:[
    'luck',
    { key:'goldGain', show:'effGold', fmt: (v: number) =>'×'+v.toFixed(1) },
    'xpGain','magnet','autoPick','cdr','duration','timeStop',
  ]},
];

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
      const li = el('div', 'pw-item',
        '<span class="pw-ic">' + def.icon + '</span>' +
        '<span class="pw-name">' + def.name + '</span>' +
        '<span class="pw-lv">Lv.' + w.lv + '</span>');
      li.dataset.wid = w.id;
      li.onclick = () => showWeaponDetail(w.id);
      wl.appendChild(li);
    });
  }
  // 已拥有道具
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

/* 通用属性分组渲染 */
export function renderStatGroupsInto(container: HTMLElement, p: any, prev?: Record<string, any> | null): void {
  SHOP_PANEL_GROUPS.forEach(g => {
    const sec = el('div', 'stat-group');
    sec.appendChild(el('div', 'stat-group-title',
      '<span class="sgt-ic">' + g.icon + '</span>' + g.title));
    const grid = el('div', 'stat-grid');
    g.stats.forEach(item => {
      const key = typeof item === 'string' ? item : item.key;
      const def: any = STATS[key] || MECH[key];
      if (!def) return;
      const valKey = typeof item === 'object' && (item as any).show ? (item as any).show : key;
      const v = p[valKey] || 0;
      const itObj = item as any;
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
