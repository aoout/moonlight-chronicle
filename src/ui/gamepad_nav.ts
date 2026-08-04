/* =========================================================
   蚀月远征 · 手柄焦点导航
   依据当前可见覆盖层推断焦点上下文，提供空间方向导航、
   确认 / 取消 / 翻页等高层动作。所有动作通过既有 DOM
   按钮的 click() 触发，或派发合成 Escape 复用键鼠逻辑，
   避免与 scheduler 产生循环依赖。
   ========================================================= */

import { inputState } from '../state/input.js';

type Dir = 'up' | 'down' | 'left' | 'right';

interface FocusContext {
  key: string;
  items: HTMLElement[];
}

let _focusIndex = -1;
let _lastContextKey = '';
let _wasConnected = false;

/* ---------- 上下文探测 ---------- */

/** 仅通过 hidden/active 类判断当前上下文（轻量，无 querySelectorAll） */
export function getActiveContextKey(): string {
  const settings = document.getElementById('settings');
  if (settings && !settings.classList.contains('hidden')) return 'settings';
  const howto = document.getElementById('howto');
  if (howto && !howto.classList.contains('hidden')) return 'howto';
  const codex = document.getElementById('codex');
  if (codex && !codex.classList.contains('hidden')) return 'codex';
  const ach = document.getElementById('achievements');
  if (ach && !ach.classList.contains('hidden')) return 'achievements';
  const gate = document.getElementById('levelselect');
  if (gate && !gate.classList.contains('hidden')) return 'gate';
  const lu = document.getElementById('levelup');
  if (lu && !lu.classList.contains('hidden')) return 'levelup';
  const shop = document.getElementById('shop');
  if (shop && !shop.classList.contains('hidden')) return 'shop';
  const pause = document.getElementById('pause');
  if (pause && !pause.classList.contains('hidden')) return 'pause';
  const result = document.getElementById('result');
  if (result && !result.classList.contains('hidden')) return 'result';
  const menu = document.getElementById('menu');
  if (menu && menu.classList.contains('active')) return 'menu';
  return 'playing';
}

function _collect(selector: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
    el => !el.classList.contains('hidden'),
  );
}

function getActiveContext(): FocusContext {
  const key = getActiveContextKey();
  switch (key) {
    case 'settings': {
      const opts = _collect('#settings .set-preset-btn, #settings .set-opts button');
      const close = document.getElementById('btn-settings-close');
      return { key, items: [...opts, ...(close ? [close] : [])] };
    }
    case 'howto': {
      const close = document.getElementById('btn-close-how');
      return { key, items: close ? [close] : [] };
    }
    case 'codex': {
      const tabs = _collect('#codex-tabs button');
      const cards = _collect('#codex-grid .codex-card');
      const close = document.getElementById('btn-codex-close');
      return { key, items: [...tabs, ...cards, ...(close ? [close] : [])] };
    }
    case 'achievements': {
      const cards = _collect('#achievement-grid .ach-card');
      const close = document.getElementById('btn-achievements-close');
      return { key, items: [...cards, ...(close ? [close] : [])] };
    }
    case 'gate': {
      const cards = _collect('#gate-grid .gate-card:not(.locked)');
      const close = document.getElementById('btn-gate-close');
      return { key, items: [...cards, ...(close ? [close] : [])] };
    }
    case 'levelup':
      return { key, items: _collect('#levelup-cards .card') };
    case 'shop': {
      const cards = _collect('#shop-cards .card');
      const weapons = _collect('#shop-weapons .pw-item');
      const items = _collect('#shop-items .si-item');
      const mechToggle = _collect('.mech-toggle');
      // 详情面板打开时，纳入关闭/出售按钮
      const pwDetail = document.getElementById('pw-detail');
      const pwClose = pwDetail && !pwDetail.classList.contains('hidden')
        ? document.getElementById('pwd-close') : null;
      const pwSell = pwDetail && !pwDetail.classList.contains('hidden')
        ? document.getElementById('pwd-sell') : null;
      const siDetail = document.getElementById('si-detail');
      const siClose = siDetail && !siDetail.classList.contains('hidden')
        ? document.getElementById('sid-close') : null;
      const next = document.getElementById('btn-shop-next');
      return {
        key,
        items: [
          ...cards,
          ...weapons,
          ...items,
          ...mechToggle,
          ...(pwClose ? [pwClose] : []),
          ...(pwSell ? [pwSell] : []),
          ...(siClose ? [siClose] : []),
          ...(next ? [next] : []),
        ].filter((x): x is HTMLElement => !!x),
      };
    }
    case 'pause': {
      const resume = document.getElementById('btn-resume');
      const quit = document.getElementById('btn-pause-quit');
      return { key, items: [resume, quit].filter((x): x is HTMLElement => !!x) };
    }
    case 'result': {
      const retry = document.getElementById('btn-retry');
      return { key, items: retry ? [retry] : [] };
    }
    case 'menu':
      return { key, items: _collect('#menu .menu-btn:not(.hidden):not(.gate-locked)') };
    default:
      return { key: 'playing', items: [] };
  }
}

/* ---------- 焦点渲染 ---------- */

function renderFocus(ctx: FocusContext): void {
  document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
  if (!inputState.get('gamepad').connected) return;
  const el = ctx.items[_focusIndex];
  if (!el) return;
  el.classList.add('gamepad-focus');
  // 在可滚动容器内聚焦时，滚到可见区（而非整页滚动）
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    const st = getComputedStyle(parent);
    if (st.overflowY === 'auto' || st.overflowY === 'scroll') {
      const er = el.getBoundingClientRect();
      const pr = parent.getBoundingClientRect();
      if (er.top < pr.top || er.bottom > pr.bottom) {
        parent.scrollTo({
          top: el.offsetTop - parent.clientHeight / 2 + el.clientHeight / 2,
          behavior: 'smooth',
        });
      }
      break;
    }
    parent = parent.parentElement;
  }
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** 每帧调用：上下文切换时重置焦点，并修复失效索引 */
export function navTick(): void {
  const connected = inputState.get('gamepad').connected;
  // 手柄刚断开：清除所有焦点高亮并重置索引
  if (_wasConnected && !connected) {
    document.querySelectorAll('.gamepad-focus').forEach(el => el.classList.remove('gamepad-focus'));
    _focusIndex = -1;
    _wasConnected = false;
    return;
  }
  _wasConnected = connected;
  if (!connected) return;

  const ctx = getActiveContext();
  if (ctx.key !== _lastContextKey) {
    _lastContextKey = ctx.key;
    _focusIndex = ctx.items.length ? 0 : -1;
    renderFocus(ctx);
    return;
  }
  // 同上下文：若条目数量变化导致索引越界，则钳制并重绘
  const clamped = ctx.items.length ? Math.min(_focusIndex, ctx.items.length - 1) : -1;
  if (clamped !== _focusIndex) {
    _focusIndex = clamped;
    renderFocus(ctx);
  } else if (_focusIndex >= 0 && !document.body.contains(ctx.items[_focusIndex])) {
    _focusIndex = 0;
    renderFocus(ctx);
  }
}

/* ---------- 空间方向导航 ---------- */

function findNearest(cur: HTMLElement, list: HTMLElement[], dir: Dir): HTMLElement | null {
  const cr = cur.getBoundingClientRect();
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of list) {
    if (el === cur) continue;
    const er = el.getBoundingClientRect();
    const dx = (er.left + er.width / 2) - (cr.left + cr.width / 2);
    const dy = (er.top + er.height / 2) - (cr.top + cr.height / 2);
    let inDir = false;
    if (dir === 'right' && dx > 4) inDir = true;
    else if (dir === 'left' && dx < -4) inDir = true;
    else if (dir === 'down' && dy > 4) inDir = true;
    else if (dir === 'up' && dy < -4) inDir = true;
    if (!inDir) continue;
    const along = (dir === 'left' || dir === 'right') ? Math.abs(dx) : Math.abs(dy);
    const perp = (dir === 'left' || dir === 'right') ? Math.abs(dy) : Math.abs(dx);
    const score = along + perp * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  return best;
}

export function handleNav(dir: Dir): void {
  if (!inputState.get('gamepad').connected) return;
  const ctx = getActiveContext();
  if (!ctx.items.length) return;
  if (_focusIndex < 0) _focusIndex = 0;
  const cur = ctx.items[_focusIndex] || ctx.items[0];
  const next = findNearest(cur, ctx.items, dir);
  if (!next) return;
  const ni = ctx.items.indexOf(next);
  if (ni >= 0 && ni !== _focusIndex) {
    _focusIndex = ni;
    renderFocus(ctx);
  }
}

/* ---------- 高层动作 ---------- */

function clickById(id: string): void {
  const el = document.getElementById(id);
  if (el) (el as HTMLElement).click();
}

/** 派发合成 Escape，复用 scheduler 中既有的键鼠逻辑（暂停/商店下一夜等） */
function dispatchEscape(): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

export function handleConfirm(): void {
  const ctx = getActiveContext();
  switch (ctx.key) {
    case 'playing': return;
    case 'pause': clickById('btn-resume'); return;       // A = 继续远征（最常用，一键触发）
    case 'result': clickById('btn-retry'); return;
    case 'howto': clickById('btn-close-how'); return;
    default:
      if (ctx.items[_focusIndex]) (ctx.items[_focusIndex] as HTMLElement).click();
  }
}

export function handleCancel(): void {
  const key = getActiveContextKey();
  switch (key) {
    case 'settings': clickById('btn-settings-close'); break;
    case 'howto': clickById('btn-close-how'); break;
    case 'codex': clickById('btn-codex-close'); break;
    case 'achievements': clickById('btn-achievements-close'); break;
    case 'gate': clickById('btn-gate-close'); break;
    case 'shop': dispatchEscape(); break;       // B = 踏入下一夜（同 Escape）
    case 'pause': clickById('btn-pause-quit'); break;  // B = 返回主菜单（符合 B=返回的直觉）
    case 'result': clickById('btn-retry'); break;
    // levelup / menu / playing：B 无操作
  }
}

function switchCodexTab(delta: number): void {
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('#codex-tabs button'));
  if (!tabs.length) return;
  const active = tabs.findIndex(t => t.classList.contains('active'));
  const next = tabs[(active + delta + tabs.length) % tabs.length];
  if (next) next.click();
}

/* ---------- 商店区块切换 ---------- */

type ShopSection = 'cards' | 'weapons' | 'items' | 'stats' | 'detail' | 'next';

function getShopSection(el: HTMLElement): ShopSection {
  if (el.closest('#shop-cards')) return 'cards';
  if (el.closest('#shop-weapons') || el.id === 'pwd-close' || el.id === 'pwd-sell') return 'weapons';
  if (el.closest('#shop-items') || el.id === 'sid-close') return 'items';
  if (el.closest('.mech-group') || el.classList.contains('mech-toggle')) return 'stats';
  if (el.id === 'btn-shop-next') return 'next';
  return 'cards';
}

const SHOP_SECTION_ORDER: ShopSection[] = ['cards', 'weapons', 'items', 'stats', 'next'];

function cycleShopSection(delta: number): void {
  const ctx = getActiveContext();
  if (ctx.key !== 'shop' || !ctx.items.length) return;
  const cur = ctx.items[_focusIndex] || ctx.items[0];
  const curSection = getShopSection(cur);
  // 从当前区块开始，跳过空区块，找到下一个有元素的区块
  const sections = SHOP_SECTION_ORDER;
  let idx = sections.indexOf(curSection);
  for (let i = 0; i < sections.length; i++) {
    idx = (idx + delta + sections.length) % sections.length;
    const target = sections[idx];
    // 找到该区块中的第一个元素
    const firstInSection = ctx.items.find(el => getShopSection(el) === target);
    if (firstInSection) {
      const ni = ctx.items.indexOf(firstInSection);
      if (ni >= 0 && ni !== _focusIndex) {
        _focusIndex = ni;
        renderFocus(ctx);
      }
      return;
    }
  }
}

export function handlePrev(): void {
  const key = getActiveContextKey();
  if (key === 'codex') switchCodexTab(-1);
  else if (key === 'shop') cycleShopSection(-1);
  else handleNav('left');
}

export function handleNext(): void {
  const key = getActiveContextKey();
  if (key === 'codex') switchCodexTab(1);
  else if (key === 'shop') cycleShopSection(1);
  else handleNav('right');
}

/** Start/View/Y：游戏中切换暂停，菜单中确认焦点 */
export function handleStart(): void {
  const key = getActiveContextKey();
  if (key === 'playing' || key === 'pause') dispatchEscape();
  else if (key === 'menu') handleConfirm();
}
