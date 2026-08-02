// @ts-check
/* =========================================================
   蚀月远征 · HUD 层：血条 / 夜之铭牌 / 武器栏液面与冷却
   ========================================================= */
import { G } from '../state.js';
import { PALETTE } from '../palette.js';
import { clamp } from '../utils.js';
import { CONFIG } from '../data/index.js';
import { WEAPONS } from '../data/index.js';
import { iconSVG } from '../icons.js';

/** @param {string} id @returns {HTMLElement} */
export const $ = id => /** @type {HTMLElement} */ (document.getElementById(id));
/** @param {string} tag @param {string} [cls] @param {string} [html] @returns {HTMLElement} */
export const el = (tag, cls, html) => { const d = document.createElement(tag); if (cls) d.className = cls; if (html !== undefined) d.innerHTML = html; return d; };

/** @param {string} id */
export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = $(id);
  if (el) el.classList.add('active');
}

/* ---------- 伤害数字 ---------- */
/**
 * @param {number} x
 * @param {number} y
 * @param {string} n
 * @param {boolean} crit
 */
export function addDmgNumber(x, y, n, crit) {
  const layer = $('fx-layer');
  if (!layer) return;
  const d = el('div', 'dmg-num' + (crit ? ' crit' : ''), n);
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  layer.appendChild(d);
  setTimeout(() => d.remove(), 950);
}
/**
 * @param {number} x
 * @param {number} y
 * @param {string} str
 * @param {string} [color]
 */
export function spawnText(x, y, str, color) {
  const layer = $('fx-layer');
  if (!layer) return;
  const d = el('div', 'dmg-num', str);
  d.style.left = x + 'px';
  d.style.top = y + 'px';
  if (color) d.style.color = color;
  layer.appendChild(d);
  setTimeout(() => d.remove(), 950);
}

/* ---------- 关卡横幅 ---------- */
/**
 * @param {string} stageName
 * @param {boolean} isBoss
 * @param {string} [bossName]
 */
export function showStageBanner(stageName, isBoss, bossName) {
  const wrap = document.getElementById('game');
  if (!wrap) return;
  const b = el('div', 'stage-banner' + (isBoss ? ' boss' : ''));
  b.innerHTML =
    '<div class="sb-kicker">' + (isBoss ? 'WARNING · 蚀潮涌动' : 'NIGHT ' + G.stage + ' / ' + CONFIG.STAGES) + '</div>' +
    '<div class="sb-title">' + (isBoss ? bossName : stageName) + '</div>' +
    (isBoss ? '<div class="sb-sub">斩落它，守月人</div>' : '<div class="sb-sub">噬光之潮将至</div>');
  wrap.appendChild(b);
  setTimeout(() => b.remove(), 2300);
}

/* ---------- Toast ---------- */
/** @param {string} msg */
export function toast(msg) {
  const wrap = $('toast');
  const t = el('div', 'toast', msg);
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('out'); }, 2200);
  setTimeout(() => t.remove(), 2800);
}

/* ---------- HUD 刷新 ---------- */
export function uiTick() {
  const p = G.player;
  if (!p) return;
  const hpPct = clamp(p.hp / p.maxHp * 100, 0, 100);
  $('hp-fill').style.width = hpPct + '%';
  $('hp-text').textContent = p.hp.toFixed(0) + ' / ' + p.maxHp.toFixed(0);
  $('xp-fill').style.width = clamp(G.xp / G.xpNeeded * 100, 0, 100) + '%';
  $('xp-text').textContent = 'Lv.' + p.level;
  $('gold-text').textContent = String(Math.floor(G.gold));
  $('kill-text').textContent = String(G.kills);
  $('stage-num').textContent = '第 ' + G.stage + ' 夜';
  $('stage-name').textContent = G.stageName;
  const mp = $('moonphase');
  mp.innerHTML = iconSVG(G.stage >= CONFIG.FINAL_STAGE ? 'moonFull' : 'moon');
  mp.classList.toggle('eclipsed', G.stage >= CONFIG.FINAL_STAGE);
  const prog = $('stage-progress');
  prog.style.width = clamp(G.stageTime / G.stageMax * 100, 0, 100) + '%';
  if (G.boss) {
    $('wave-text').textContent = G.boss.name + ' 降临——将其终结！';
  } else {
    $('wave-text').textContent = '噬光之潮 · ' + Math.ceil(G.stageMax - G.stageTime) + 's';
  }
  renderWeaponBar();
  updateWeaponCds();
}

/* ---------- 武器栏 ---------- */
/* 计算与给定背景色（液面主题色）对比度最高的文字/强调色 */
/** @param {string} hex @returns {string} */
function contrastText(hex) {
  const c = String(hex || PALETTE.gold).replace('#', '');
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0a1130' : '#eaf6ff';   // 亮底→深墨蓝，暗底→亮白
}

function renderWeaponBar() {
  const p = G.player;
  if (!p) return;
  const bar = /** @type {HTMLElement & {_sig?: string, _liqSig?: string|null}} */ ($('weapon-bar'));
  const sig = p.weapons.map(w => w.id + ':' + w.lv).join(',') + '|' + p.weapons.length;
  if (bar._sig === sig) return;
  bar._sig = sig;
  bar._liqSig = null;   // 强制首帧全量刷新液面
  bar.innerHTML = '';
  for (let i = 0; i < CONFIG.MAX_WEAPONS; i++) {
    const w = p.weapons[i];
    const slot = el('div', 'wslot' + (w ? ' filled' : ' empty'));
    if (w) {
      const def = WEAPONS[w.id];
      slot.dataset.wid = w.id;
      slot.style.setProperty('--fill-txt', contrastText(def.color));
      slot.style.setProperty('--wcolor', def.color);
      slot.innerHTML =
        '<div class="wliquid"><svg class="w-wave" viewBox="0 0 40 6" preserveAspectRatio="none"><path d="M0 3 Q5 0 10 3 T20 3 T30 3 T40 3 V6 H0 Z"/></svg></div>' +
        '<div class="w-icon">' +
          '<span class="wi-base">' + def.icon + '</span>' +
          '<span class="wi-fill">' + def.icon + '</span>' +
        '</div>' +
        '<div class="w-name">' +
          '<span class="wn-base">' + def.name + '</span>' +
          '<span class="wn-fill">' + def.name + '</span>' +
        '</div>' +
        '<div class="w-lvl">' +
          '<span class="wl-base">' + iconSVG('star') + ' ' + w.lv + '</span>' +
          '<span class="wl-fill">' + iconSVG('star') + ' ' + w.lv + '</span>' +
        '</div>' +
        '<div class="wpct">0%</div>';
      slot.title = def.name + '（Lv.' + w.lv + '）· 占比 -- · ' + def.desc;
    } else {
      slot.innerHTML = '<div class="w-icon">' + iconSVG('slotEmpty') + '</div><div class="w-name">空</div>';
    }
    bar.appendChild(slot);
  }
}

/* 每帧：武器冷却外环 + 液面占比（低频） */
function updateWeaponCds() {
  const p = G.player;
  if (!p || !p.weapons.length) return;
  const bar = /** @type {HTMLElement & {_sig?: string, _liqSig?: string|null}} */ ($('weapon-bar'));
  const slots = /** @type {HTMLCollectionOf<HTMLElement & {_wasCool?: boolean}>} */ (bar.children);
  const wDmg = G.runStats.wDmg || {};
  const wTotal = Object.keys(wDmg).reduce((s, k) => s + wDmg[k], 0);
  let liqSig = '';
  for (let i = 0; i < p.weapons.length; i++) {
    const w = p.weapons[i];
    const slot = slots[i];
    if (!slot || !slot.classList.contains('filled')) continue;
    // --- 冷却：外边框亮段旋转一圈 = 一次冷却 ---
    const cur = G.weaponCd[w.id] || 0;
    const full = G.weaponCdFull[w.id] || 0.001;
    const prog = clamp(1 - cur / full, 0, 1);
    slot.style.setProperty('--cddeg', (prog * 360).toFixed(1) + 'deg');
    slot.classList.toggle('cool', prog < 1);
    if (prog >= 1 && slot._wasCool) {          // 冷却完成：边框亮起脉冲
      slot.classList.remove('ready-pulse');
      void slot.offsetWidth;
      slot.classList.add('ready-pulse');
    }
    slot._wasCool = prog < 1;
    // --- 液面占比（签名缓存，低频） ---
    const d = wDmg[w.id] || 0;
    const pct = wTotal > 0 ? d / wTotal * 100 : 0;
    liqSig += Math.round(pct) + ';';
  }
  if (bar._liqSig !== liqSig) {
    bar._liqSig = liqSig;
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      const slot = slots[i];
      if (!slot || !slot.classList.contains('filled')) continue;
      const def = WEAPONS[w.id];
      const d = wDmg[w.id] || 0;
      const pct = wTotal > 0 ? d / wTotal * 100 : 0;
      const liq = /** @type {HTMLElement | null} */ (slot.querySelector('.wliquid'));
      const pctEl = /** @type {HTMLElement | null} */ (slot.querySelector('.wpct'));
      const h = pct <= 0 ? 0 : Math.max(6, pct);
      if (liq) {
        liq.style.height = h + '%';
        liq.style.opacity = pct > 0 ? '1' : '0';   // 0 占比：连波浪一起隐藏
      }
      if (pctEl) pctEl.textContent = Math.round(pct) + '%';
      // 图标/名字/等级覆盖比例：液面线以下的部分切换为强调色
      const iconEl = /** @type {HTMLElement | null} */ (slot.querySelector('.w-icon'));
      const nameEl = /** @type {HTMLElement | null} */ (slot.querySelector('.w-name'));
      const lvlEl = /** @type {HTMLElement | null} */ (slot.querySelector('.w-lvl'));
      if ((iconEl || nameEl || lvlEl) && slot.offsetHeight) {
        const slotH = slot.offsetHeight;
        const liqLine = slotH * (1 - h / 100);
        /** @param {HTMLElement} el @returns {number} */
        const covOf = (el) => {
          if (!el || !el.getBoundingClientRect || !slot.getBoundingClientRect) return 0;
          const r = el.getBoundingClientRect();
          const sr = slot.getBoundingClientRect();
          return clamp((r.top - sr.top + r.height - liqLine) / (r.height || 12), 0, 1);
        };
        if (iconEl) iconEl.style.setProperty('--cov', covOf(iconEl).toFixed(3));
        if (nameEl) nameEl.style.setProperty('--covn', covOf(nameEl).toFixed(3));
        if (lvlEl) lvlEl.style.setProperty('--covl', covOf(lvlEl).toFixed(3));
      }
      slot.title = def.name + '（Lv.' + w.lv + '）· 占比 ' + Math.round(pct) + '% · ' + def.desc;
    }
  }
}

/* ---------- 升级选择 ---------- */
