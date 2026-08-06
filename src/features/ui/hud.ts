/* =========================================================
   蚀月远征 · HUD 核心：血条 / 武器栏液面与冷却
   工具函数已拆分至 hud_utils.ts
   ========================================================= */
import { PALETTE } from '../../assets/palette.js';
import { $, el, html } from './hud_utils.js';
import { pSt, sSt, gSt } from '../../state/accessors.js';
import { clamp } from '../../engine/util/utils.js';
import { CONFIG, WEAPONS } from '../../config/index.js';
import { iconSVG } from '../../assets/icons.js';
import { MOON_NAMES, currentMoonPhase, currentMoonIllumination } from '../../config/moon_phase.js';

/* ---------- HUD 刷新 ---------- */
export function uiTick(): void {
  const p = pSt().player;
  if (!p) return;
  // 血条（帧级平滑）；数值变化时 pop 反馈（掉血/回血的"重量感"）
  const hpPct = clamp(p.hp / p.maxHp * 100, 0, 100);
  $('hp-fill').style.width = hpPct + '%';
  const hpText = $('hp-text');
  const hpStr = p.hp.toFixed(0) + ' / ' + p.maxHp.toFixed(0);
  if (hpText.textContent !== hpStr) {
    hpText.textContent = hpStr;
    hpText.classList.remove('pop');
    void hpText.offsetWidth; /* 强制重排以重置动画 */
    hpText.classList.add('pop');
  }
  // 关卡进度条（帧级动画）
  const prog = $('stage-progress');
  prog.style.width = clamp(gSt().stageTime / gSt().stageMax * 100, 0, 100) + '%';
  // 波次文字（帧级倒计时；Boss 降临切换血色警示态）
  const boss = gSt().boss;
  const wt = $('wave-text');
  if (boss) {
    wt.textContent = boss.name + ' 降临——将其终结！';
    wt.classList.add('boss');
  } else {
    wt.textContent = '噬光之潮 · ' + Math.ceil(gSt().stageMax - gSt().stageTime) + 's';
    wt.classList.remove('boss');
  }
  // 现实月相（你的月亮：拥有道具后显示，相位/照明变化时惰性刷新）
  const mr = $('moon-real');
  if (mr) {
    const hasMoon = !!p.effects.yourMoon;
    mr.hidden = !hasMoon;
    if (hasMoon) {
      const ph = currentMoonPhase();
      const ill = Math.round(currentMoonIllumination() * 100);
      const sig = ph + ':' + ill;
      if (mr.dataset.sig !== sig) {
        mr.dataset.sig = sig;
        mr.innerHTML = '<span class="mr-ic">' + iconSVG('moon') + '</span>' +
          '<span class="mr-txt">现实 · ' + MOON_NAMES[ph] + ' · ' + ill + '%</span>';
        mr.title = MOON_NAMES[ph] + '，月面照明 ' + ill + '%。你的月亮效果随现实月相流转。';
      }
    }
  }
  // 武器栏（帧级冷却动画 + 惰性重建）
  renderWeaponBar();
  updateWeaponCds();
}

/* ---------- 武器栏 ---------- */
/* 计算与给定背景色（液面主题色）对比度最高的文字/强调色 */
function contrastText(hex: string): string {
  const c = String(hex || PALETTE.gold).replace('#', '');
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? '#0a1130' : '#eaf6ff';   // 亮底→深墨蓝，暗底→亮白
}

type WeaponBarEl = HTMLElement & { _sig?: string, _liqSig?: string | null };
type WeaponSlotEl = HTMLElement & { _wasCool?: boolean; _prevCur?: number };

/* 当前回合道具造成的总伤害（武器 + 道具 = 100%） */
function sumItemDmg(p: any): number {
  const st = p.effects?.itemStats;
  if (!st) return 0;
  let s = 0;
  for (const k in st) s += (st[k]?.stageDmg || 0);
  return s;
}

function renderWeaponBar(): void {
  const p = pSt().player;
  if (!p) return;
  const bar = $('weapon-bar') as WeaponBarEl;
  const sig = p.weapons.map((w: any) => w.id + ':' + w.lv).join(',') + '|' + p.weapons.length;
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
      slot.innerHTML = html`
  <div class="wliquid"><svg class="w-wave" viewBox="0 0 40 6" preserveAspectRatio="none"><path d="M0 3 Q5 0 10 3 T20 3 T30 3 T40 3 V6 H0 Z"/></svg></div>
  <div class="w-icon">
    <span class="wi-base">${def.icon}</span>
    <span class="wi-fill">${def.icon}</span>
  </div>
  <div class="w-name">
    <span class="wn-base">${def.name}</span>
    <span class="wn-fill">${def.name}</span>
  </div>
  <div class="w-lvl">
    <span class="wl-base">${iconSVG('star')} ${w.lv}</span>
    <span class="wl-fill">${iconSVG('star')} ${w.lv}</span>
  </div>
  <div class="wpct">0%</div>
`;
      slot.title = def.name + '（Lv.' + w.lv + '）· 占比 -- · ' + def.desc;
    } else {
      slot.innerHTML = html`<div class="w-icon">${iconSVG('slotEmpty')}</div><div class="w-name">空</div>`;
    }
    bar.appendChild(slot);
  }
  // 秘宝槽：道具伤害占比（无道具伤害时隐藏）
  const itemSlot = el('div', 'wslot item-slot');
  itemSlot.style.setProperty('--wcolor', PALETTE.violet);
  itemSlot.style.setProperty('--fill-txt', '#eaf6ff');
  itemSlot.innerHTML = html`
  <div class="wliquid"><svg class="w-wave" viewBox="0 0 40 6" preserveAspectRatio="none"><path d="M0 3 Q5 0 10 3 T20 3 T30 3 T40 3 V6 H0 Z"/></svg></div>
  <div class="w-icon">
    <span class="wi-base">${iconSVG('gem')}</span>
    <span class="wi-fill">${iconSVG('gem')}</span>
  </div>
  <div class="w-name">
    <span class="wn-base">秘宝</span>
    <span class="wn-fill">秘宝</span>
  </div>
  <div class="wpct">0%</div>`;
  itemSlot.title = '秘宝之力 · 道具造成的伤害占比';
  bar.appendChild(itemSlot);
}

/* 每帧：武器冷却外环 + 液面占比（低频） */
function updateWeaponCds(): void {
  const p = pSt().player;
  if (!p || !p.weapons.length) return;
  const bar = $('weapon-bar') as WeaponBarEl;
  const slots = bar.children as unknown as HTMLCollectionOf<WeaponSlotEl>;
  const wDmg: Record<string, number> = sSt().runStats.wDmg || {};
  const wTotal = Object.keys(wDmg).reduce((s, k) => s + wDmg[k], 0);
  const itemDmg = sumItemDmg(p);
  const total = wTotal + itemDmg;   // 武器 + 道具 = 100%
  let liqSig = '';
  for (let i = 0; i < p.weapons.length; i++) {
    const w = p.weapons[i];
    const slot = slots[i];
    if (!slot || !slot.classList.contains('filled')) continue;
    // --- 冷却：外边框亮段旋转一圈 = 一次冷却 ---
    const cur = pSt().weaponCd[w.id] || 0;
    const full = pSt().weaponCdFull[w.id] || 0.001;
    const prog = clamp(1 - cur / full, 0, 1);
    const prevCur = slot._prevCur ?? full;
    slot.style.setProperty('--cddeg', (prog * 360).toFixed(1) + 'deg');
    slot.classList.toggle('cool', prog < 1);
    // 冷却完成检测：冷却值从极小跳回满值 → 武器刚开火 → 脉冲反馈
    if (cur > prevCur && prevCur <= full * 0.05) {
      slot.classList.remove('ready-pulse');
      void slot.offsetWidth;
      slot.classList.add('ready-pulse');
    }
    slot._prevCur = cur;
    // --- 液面占比（签名缓存，低频） ---
    const d = wDmg[w.id] || 0;
    const pct = total > 0 ? d / total * 100 : 0;
    liqSig += Math.round(pct) + ';';
  }
  const ipct = total > 0 ? itemDmg / total * 100 : 0;
  liqSig += 'i' + Math.round(ipct) + ';';
  if (bar._liqSig !== liqSig) {
    bar._liqSig = liqSig;
    for (let i = 0; i < p.weapons.length; i++) {
      const w = p.weapons[i];
      const slot = slots[i];
      if (!slot || !slot.classList.contains('filled')) continue;
      const def = WEAPONS[w.id];
      const d = wDmg[w.id] || 0;
      const pct = total > 0 ? d / total * 100 : 0;
      const liq = slot.querySelector('.wliquid') as HTMLElement | null;
      const pctEl = slot.querySelector('.wpct') as HTMLElement | null;
      const h = pct <= 0 ? 0 : Math.max(6, pct);
      if (liq) {
        liq.style.height = h + '%';
        liq.style.opacity = pct > 0 ? '1' : '0';   // 0 占比：连波浪一起隐藏
      }
      if (pctEl) pctEl.textContent = Math.round(pct) + '%';
      // 图标/名字/等级覆盖比例：液面线以下的部分切换为强调色
      const iconEl = slot.querySelector('.w-icon') as HTMLElement | null;
      const nameEl = slot.querySelector('.w-name') as HTMLElement | null;
      const lvlEl = slot.querySelector('.w-lvl') as HTMLElement | null;
      if ((iconEl || nameEl || lvlEl) && slot.offsetHeight) {
        const slotH = slot.offsetHeight;
        const liqLine = slotH * (1 - h / 100);
        const covOf = (target: HTMLElement): number => {
          if (!target || !target.getBoundingClientRect || !slot.getBoundingClientRect) return 0;
          const r = target.getBoundingClientRect();
          const sr = slot.getBoundingClientRect();
          return clamp((r.top - sr.top + r.height - liqLine) / (r.height || 12), 0, 1);
        };
        if (iconEl) iconEl.style.setProperty('--cov', covOf(iconEl).toFixed(3));
        if (nameEl) nameEl.style.setProperty('--covn', covOf(nameEl).toFixed(3));
        if (lvlEl) lvlEl.style.setProperty('--covl', covOf(lvlEl).toFixed(3));
      }
      slot.title = def.name + '（Lv.' + w.lv + '）· 占比 ' + Math.round(pct) + '% · ' + def.desc;
    }
    // --- 秘宝槽（道具伤害占比） ---
    const itemSlot = slots[CONFIG.MAX_WEAPONS] as HTMLElement | null;
    if (itemSlot) {
      const show = itemDmg > 0;
      itemSlot.style.display = show ? '' : 'none';
      const liq = itemSlot.querySelector('.wliquid') as HTMLElement | null;
      const pctEl = itemSlot.querySelector('.wpct') as HTMLElement | null;
      const h = ipct <= 0 ? 0 : Math.max(6, ipct);
      if (liq) { liq.style.height = h + '%'; liq.style.opacity = ipct > 0 ? '1' : '0'; }
      if (pctEl) pctEl.textContent = Math.round(ipct) + '%';
      const iconEl = itemSlot.querySelector('.w-icon') as HTMLElement | null;
      if (iconEl && itemSlot.offsetHeight) {
        const slotH = itemSlot.offsetHeight;
        const liqLine = slotH * (1 - h / 100);
        const r = iconEl.getBoundingClientRect();
        const sr = itemSlot.getBoundingClientRect();
        iconEl.style.setProperty('--cov', clamp((r.top - sr.top + r.height - liqLine) / (r.height || 12), 0, 1).toFixed(3));
      }
      itemSlot.title = '秘宝之力 · 道具造成的伤害占比 ' + Math.round(ipct) + '%';
    }
  }
}