/* =========================================================
   蚀之图鉴：所见蚀物、兵刃与秘宝的月光记录
   （敌人/Boss 遇过解锁，武器/道具购得解锁）
   ========================================================= */
import { $, el, html } from './hud_utils.js';
import { iconSVG } from './icons.js';
import { ENEMIES, BOSSES, WEAPONS, SHOP_ITEMS } from '../data/index.js';
import { AudioEngine } from '../audio/engine.js';
import { codexUnlocked } from '../persistence/codex.js';
import { isDevMode } from '../debug/dev_mode.js';
import { weaponRangeText } from './shop.js';
import { ENEMY_SHAPES, BOSS_SHAPES } from '../render/index.js';
import type { WeaponDef, ShopItemDef } from '../types/core.d.ts';

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

function openCodex(): void {
  renderCodex(_codexTab);
  $('codex').classList.remove('hidden');
}

function closeCodex(): void {
  $('codex').classList.add('hidden');
}

export function renderCodex(tab: string): void {
  _codexTab = tab;
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
        <div class="codex-desc">继续远征，让月光记住它的模样</div>
      `;
    } else if (meta === 'enemy' || meta === 'boss') {
      const edef = d as any;
      const tier = meta === 'boss' ? '领主' : (edef.r > 0.45 ? '重装' : edef.spd > 80 ? '迅捷' : '寻常');
      const tierCls = meta === 'boss' ? 'lord' : edef.r > 0.45 ? 'heavy' : edef.spd > 80 ? 'swift' : 'common';
      card.innerHTML = html`
        <div class="codex-ic"></div>
        <div class="codex-name">${edef.name}</div>
        <div class="codex-tag ${tierCls}">${tier}</div>
        <div class="codex-desc">${edef.desc}</div>
        <div class="codex-stat">
          <span>命 ${edef.hp}</span><span>速 ${edef.spd}</span><span>伤 ${edef.dmg}</span>
        </div>
      `;
      const ic = card.querySelector('.codex-ic');
      if (ic) ic.appendChild(_enemyCanvas(id, edef, meta === 'boss'));
    } else if (meta === 'weapon') {
      const wdef = d as WeaponDef;
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
      card.innerHTML = html`
        <div class="codex-ic">${wdef.icon}</div>
        <div class="codex-name">${wdef.name}</div>
        <div class="codex-tag epic">${wdef.tag || '兵刃'}</div>
        <div class="codex-desc">${wdef.desc}</div>
        <div class="codex-formula">${wdef.formula || ''}</div>
        <div class="codex-stat">
          ${stats.join('')}
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
        <div class="codex-desc">${idef.desc}</div>
        <div class="codex-stat"><span>${idef.price} ${iconSVG('coin')}</span></div>
      `;
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
}
