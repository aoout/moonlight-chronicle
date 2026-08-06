/* =========================================================
   蚀之图鉴：所见蚀物、兵刃与秘宝的月光记录
   （敌人/Boss 遇过解锁，武器/道具购得解锁）
   已解锁卡片可点击查看详情——月背档案与 lore 碎片
   ========================================================= */
import { $, el, html } from './hud_utils.js';
import { iconSVG } from '../../assets/icons.js';
import { ENEMIES, BOSSES, WEAPONS, SHOP_ITEMS } from '../../config/index.js';
import { AudioEngine } from '../../platform/audio/engine.js';
import { codexUnlocked } from '../../infra/persistence/codex.js';
import { handsGet, HANDS_DEEP_THRESHOLD } from '../../infra/persistence/hands.js';
import { isDevMode } from '../../engine/env.js';
import { weaponRangeText } from './shop/index.js';
import { ENEMY_SHAPES, BOSS_SHAPES } from '../render/index.js';
import type { WeaponDef, ShopItemDef, LoreFragment } from '../../types/core.d.ts';

function _enemyCanvas(id: string, def: any, isBoss: boolean): HTMLCanvasElement {
  const SZ = 60;
  const c = document.createElement('canvas');
  c.width = SZ; c.height = SZ;
  c.style.cssText = 'display:block;margin:1px auto 0';
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const s = def.size || 20;
  const maxExt = isBoss ? s * 1.6 : s * 2.2;
  const scale = (SZ * 0.38) / Math.max(maxExt, 1);

  ctx.save();
  ctx.translate(SZ / 2, SZ / 2 + 2);
  ctx.scale(scale, scale);

  // 脚下阴影（俯视投影）
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.85, s * 1.1, s * 0.38, 0, 0, 6.28);
  ctx.fill();

  // 身体发光
  ctx.shadowColor = def.color || '#fff';
  ctx.shadowBlur = isBoss ? 14 : 8;

  if (isBoss) {
    const shapes = BOSS_SHAPES as any;
    const fn = shapes[id] || shapes.final;
    if (fn) fn(ctx, def, s, 0, 0, 0, 0);
  } else {
    const shapes = ENEMY_SHAPES as any;
    const fn = shapes[id] || shapes._default;
    if (fn) fn(ctx, def, s, 0, 0, 0, 0);
  }

  ctx.restore();
  return c;
}

const CODEX_TABS = [
  { key: 'enemies', label: '蚀物', icon: 'dotRing', desc: '游荡于月背的蚀之眷族' },
  { key: 'bosses', label: '领主', icon: 'crown', desc: '噬月之潮的执潮者' },
  { key: 'weapons', label: '兵刃', icon: 'sword', desc: '守月人曾握持的月光兵刃' },
  { key: 'items', label: '秘宝', icon: 'gem', desc: '自月幕集市购得的奇物' },
];

let _codexTab = 'enemies';
/** 详情面板当前条目（用于返回时还原） */
let _cdEntry: { id: string; meta: string } | null = null;

function openCodex(): void {
  closeCodexDetail();
  renderCodex(_codexTab);
  $('codex').classList.remove('hidden');
}

function closeCodex(): void {
  $('codex').classList.add('hidden');
}

/* ---------- 属性/公式片段（卡片与详情共用） ---------- */
function _weaponStatsHtml(wdef: WeaponDef): string {
  const stats: string[] = [];
  if (wdef.cd !== undefined) {
    const cdVal = typeof wdef.cd === 'function' ? wdef.cd() : wdef.cd;
    stats.push('<span>冷却 ' + cdVal + 's</span>');
  }
  const rng = weaponRangeText(wdef);
  if (rng) stats.push('<span>' + rng + '</span>');
  if (wdef.pierce !== undefined) {
    const p = wdef.pierce;
    if (p === -1) stats.push('<span>穿透 ∞</span>');
    else if (p > 0) stats.push('<span>穿透 ' + p + '</span>');
  }
  if (wdef.aoe !== undefined) stats.push('<span>范围 ' + wdef.aoe + '</span>');
  if (wdef.slow !== undefined) stats.push('<span>减速 ' + Math.round(wdef.slow * 100) + '%</span>');
  if (wdef.homing) stats.push('<span>追踪</span>');
  return stats.join('');
}

/* ---------- lore 碎片 ---------- */
/** 记手录类目映射：图鉴 meta → hands 存档 type（敌人/Boss 无此概念） */
const HANDS_TYPE: Record<string, string> = { weapon: 'weapons', item: 'items' };

/** 选取次数抬头（仅武器/道具） */
function _handsHtml(type: string, id: string, hands: number): string {
  const unlocked = hands >= HANDS_DEEP_THRESHOLD;
  return html`
    <div class="cd-hands">
      此物与你相伴 <b>${hands}</b> 次${unlocked ? ' · 深层字迹已显' : ''}
    </div>
  `;
}

function _loreHtml(lore: LoreFragment[] | undefined, hands: number): string {
  if (!lore || !lore.length) return '';
  const frags = lore.map(f => {
    // 深层档案：相伴十次之前，字迹尚不可辨
    if (f.deep && hands < HANDS_DEEP_THRESHOLD) {
      return html`
        <div class="cd-frag locked">
          <div class="cd-frag-src">月背档案 · 深层</div>
          <div class="cd-frag-text">
            器识其主。同一件器物被同一只手拿起十次，深一层的字才会从纸下渗出来。
            <div class="cd-frag-progress">与此物相伴 ${hands} / ${HANDS_DEEP_THRESHOLD} 次</div>
          </div>
        </div>
      `;
    }
    return html`
      <div class="cd-frag${f.deep ? ' deep' : ''}">
        <div class="cd-frag-src">${f.deep ? '✦ 深层 · ' : ''}${f.src}</div>
        <div class="cd-frag-text">${f.text}</div>
      </div>
    `;
  }).join('');
  return `<div class="cd-lore"><div class="cd-lore-title">✦ 月背档案</div>${frags}</div>`;
}

/* ---------- 详情面板 ---------- */
function showCodexDetail(id: string, meta: string): void {
  const box = $('codex-detail');
  if (!box) return;
  _cdEntry = { id, meta };
  const head = $('cd-head');
  const body = $('cd-body');
  if (!head || !body) return;

  let headHtml = '';
  let bodyHtml = '';

  // 记手录：武器/道具的相伴次数；深层档案需相伴十次才显现（dev 模式直显）
  const hType = HANDS_TYPE[meta] || '';
  const hands = isDevMode() ? HANDS_DEEP_THRESHOLD : (hType ? handsGet(hType, id) : 0);

  if (meta === 'weapon') {
    const d = WEAPONS[id] as WeaponDef;
    headHtml = html`
      <span class="cd-ic" style="color:${d.color};filter:drop-shadow(0 0 9px ${d.color}66)">${d.icon}</span>
      <div class="cd-title">
        <div class="cd-name">${d.name}</div>
        <div class="cd-tag epic">${d.tag || '兵刃'}</div>
      </div>
    `;
    bodyHtml = html`
      ${_handsHtml(hType, id, hands)}
      <div class="cd-stats">${_weaponStatsHtml(d)}</div>
      <div class="cd-formula">${d.formula || ''}</div>
      <div class="cd-desc">${d.desc}</div>
      ${_loreHtml(d.lore, hands)}
    `;
  } else if (meta === 'item') {
    const d = (SHOP_ITEMS.find(it => it.id === id)) as ShopItemDef;
    const rar = d.rarity === 'legend' ? '神恩' : d.rarity === 'epic' ? '非凡' : '寻常';
    const rarCls = d.rarity === 'legend' ? 'legend' : d.rarity === 'epic' ? 'epic' : 'common';
    headHtml = html`
      <span class="cd-ic">${d.icon}</span>
      <div class="cd-title">
        <div class="cd-name">${d.name}</div>
        <div class="cd-tag ${rarCls}">${rar}</div>
      </div>
    `;
    bodyHtml = html`
      ${_handsHtml(hType, id, hands)}
      <div class="cd-stats"><span>${d.price} ${iconSVG('coin')}</span></div>
      <div class="cd-desc">${d.desc}</div>
      ${_loreHtml(d.lore, hands)}
    `;
  } else if (meta === 'enemy' || meta === 'boss') {
    const d = (meta === 'boss' ? BOSSES : ENEMIES)[id] as any;
    const tier = meta === 'boss' ? '领主' : (d.r > 0.45 ? '重装' : d.spd > 80 ? '迅捷' : '寻常');
    const tierCls = meta === 'boss' ? 'lord' : d.r > 0.45 ? 'heavy' : d.spd > 80 ? 'swift' : 'common';
    const abilities = (d.abilities || []).map((a: string) => `<span class="codex-ability">${a}</span>`).join('');
    headHtml = html`
      <span class="cd-ic"></span>
      <div class="cd-title">
        <div class="cd-name">${d.name}</div>
        <div class="cd-tag ${tierCls}">${tier}</div>
      </div>
    `;
    bodyHtml = html`
      <div class="cd-stats">
        <span>命 ${d.hp}</span><span>速 ${d.spd}</span><span>伤 ${d.dmg}</span>
      </div>
      ${abilities ? `<div class="codex-abilities">${abilities}</div>` : ''}
      <div class="cd-desc">${d.desc}</div>
      <div class="cd-lore">
        <div class="cd-lore-title">✦ 月背档案</div>
        <div class="cd-frag">
          <div class="cd-frag-src">蚀之图鉴 · 佚页</div>
          <div class="cd-frag-text">关于它的记载，在月背的档案里再找不出第二页。月亮记得的事，不会都写下来。</div>
        </div>
      </div>
    `;
  }

  head.innerHTML = headHtml;
  body.innerHTML = bodyHtml;
  // 敌人/Boss 图标：canvas 需在 DOM 就绪后挂载（先 innerHTML 再查询节点）
  if (meta === 'enemy' || meta === 'boss') {
    const d = (meta === 'boss' ? BOSSES : ENEMIES)[id] as any;
    const ic = head.querySelector('.cd-ic');
    if (ic) ic.appendChild(_enemyCanvas(id, d, meta === 'boss'));
  }
  box.classList.remove('hidden');
}

function closeCodexDetail(): void {
  const box = $('codex-detail');
  if (!box) return;
  box.classList.add('hidden');
  _cdEntry = null;
}

export function renderCodex(tab: string): void {
  _codexTab = tab;
  closeCodexDetail();
  const grid = $('codex-grid');
  grid.innerHTML = '';
  // 激活 tab
  Array.from($('codex-tabs').children).forEach(b => {
    const target = b as HTMLElement;
    target.classList.toggle('active', target.dataset.tab === tab);
  });
  const sub = $('codex-sub');
  if (sub) sub.textContent = (CODEX_TABS.find(t => t.key === tab) || {}).desc || '';

  let entries: { id: string; d: any; meta: string }[] = [];
  if (tab === 'enemies') entries = Object.entries(ENEMIES).map(([id, d]) => ({ id, d, meta: 'enemy' }));
  else if (tab === 'bosses') entries = Object.entries(BOSSES).map(([id, d]) => ({ id, d, meta: 'boss' }));
  else if (tab === 'weapons') entries = Object.entries(WEAPONS).map(([id, d]) => ({ id, d, meta: 'weapon' }));
  else {
    const rank: Record<string, number> = { legend: 0, epic: 1, common: 2 };
    entries = SHOP_ITEMS
      .map(it => ({ id: it.id, d: it, meta: 'item' }))
      .sort((a, b) => (rank[a.d.rarity] ?? 2) - (rank[b.d.rarity] ?? 2) || (a.d.price - b.d.price));
  }

  // 开发者模式：当前 tab 全解锁（只读覆盖，不写存档）
  const unSet = isDevMode() ? new Set(entries.map(e => e.id)) : new Set(codexUnlocked(tab));

  const total = entries.length;
  const got = entries.filter(e => unSet.has(e.id)).length;
  $('codex-count').textContent = '已见 ' + got + ' / ' + total;

  entries.forEach(({ id, d, meta }) => {
    const isUn = unSet.has(id);
    const card = el('div', 'codex-card' + (isUn ? '' : ' locked'));
    if (!isUn) {
      card.innerHTML = html`
        <div class="codex-ic locked">${iconSVG('slotEmpty')}</div>
        <div class="codex-name">？？？</div>
        <div class="codex-tag">尚未见于月光之下</div>
        <div class="codex-desc"><span class="desc-inner">继续远征，让月光记住它的模样</span></div>
      `;
    } else if (meta === 'enemy' || meta === 'boss') {
      const edef = d as any;
      const tier = meta === 'boss' ? '领主' : (edef.r > 0.45 ? '重装' : edef.spd > 80 ? '迅捷' : '寻常');
      const tierCls = meta === 'boss' ? 'lord' : edef.r > 0.45 ? 'heavy' : edef.spd > 80 ? 'swift' : 'common';
      const abilities = (edef.abilities || []).map((a: string) => `<span class="codex-ability">${a}</span>`).join('');
      card.innerHTML = html`
        <div class="codex-ic"></div>
        <div class="codex-name">${edef.name}</div>
        <div class="codex-tag ${tierCls}">${tier}</div>
        <div class="codex-desc"><span class="desc-inner">${edef.desc}</span></div>
        <div class="codex-abilities">${abilities}</div>
        <div class="codex-stat">
          <span>命 ${edef.hp}</span><span>速 ${edef.spd}</span><span>伤 ${edef.dmg}</span>
        </div>
      `;
      const ic = card.querySelector('.codex-ic');
      if (ic) ic.appendChild(_enemyCanvas(id, edef, meta === 'boss'));
    } else if (meta === 'weapon') {
      const wdef = d as WeaponDef;
      card.innerHTML = html`
        <div class="codex-ic">${wdef.icon}</div>
        <div class="codex-name">${wdef.name}</div>
        <div class="codex-tag epic">${wdef.tag || '兵刃'}</div>
        <div class="codex-desc"><span class="desc-inner">${wdef.desc}</span></div>
        <div class="codex-formula">${wdef.formula || ''}</div>
        <div class="codex-stat">
          ${_weaponStatsHtml(wdef)}
        </div>
      `;
    } else {
      const idef = d as ShopItemDef;
      const rar = idef.rarity === 'legend' ? '神恩' : idef.rarity === 'epic' ? '非凡' : '寻常';
      const rarCls = idef.rarity === 'legend' ? 'legend' : idef.rarity === 'epic' ? 'epic' : 'common';
      card.innerHTML = html`
        <div class="codex-ic">${idef.icon}</div>
        <div class="codex-name">${idef.name}</div>
        <div class="codex-tag ${rarCls}">${rar}</div>
        <div class="codex-desc"><span class="desc-inner">${idef.desc}</span></div>
        <div class="codex-stat"><span>${idef.price} ${iconSVG('coin')}</span></div>
      `;
    }
    // 已解锁卡片：点击翻阅详情
    if (isUn) {
      card.style.cursor = 'pointer';
      card.onclick = () => { AudioEngine.playSfx('click'); showCodexDetail(id, meta); };
    }
    grid.appendChild(card);
  });
}

/* 绑定图鉴入口与页签（bindUI 调用） */
export function bindCodex(): void {
  $('btn-codex').onclick = () => { AudioEngine.playSfx('open'); openCodex(); };
  $('btn-codex-close').onclick = () => { AudioEngine.playSfx('close'); closeCodex(); };
  Array.from($('codex-tabs').children).forEach(b => {
    const target = b as HTMLElement;
    target.onclick = () => { AudioEngine.playSfx('click'); if (target.dataset.tab) renderCodex(target.dataset.tab); };
  });
  const cdClose = $('btn-codex-detail-close');
  if (cdClose) cdClose.onclick = () => { AudioEngine.playSfx('close'); closeCodexDetail(); };
}
