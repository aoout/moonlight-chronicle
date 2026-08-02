// @ts-check
/* =========================================================
   蚀月远征 · 商店：武器详情与出售
   ========================================================= */
import { G } from '../../state.js';
import { WEAPONS } from '../../data/index.js';
import { $, toast } from '../hud.js';
import { AudioEngine } from '../../audio.js';
import { iconSVG } from '../../icons.js';
import { PlayerSystem } from '../../systems/PlayerSystem.js';
import { weaponFormulaText, weaponFormulaBreakdown, weaponProjInfo } from './formulas.js';
import { openShop } from './open_shop.js';

let _pwSelected = null;
/** @type {string|number} */
let _pwSellConfirm = 0;

/**
 * @param {number} lv
 */
function weaponSellPrice(lv) { return Math.floor(8 + (lv - 1) * 4); }

/**
 * @param {string} id
 */
export function showWeaponDetail(id) {
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
  if (_pwSellConfirm !== id) {
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
  PlayerSystem.removeWeapon(id);
  AudioEngine.playSfx('sell');
  _pwSellConfirm = 0;
  toast(def.name + ' 已出售 +' + price);
  openShop();
}