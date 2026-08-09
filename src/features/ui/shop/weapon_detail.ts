/* =========================================================
   蚀月远征 · 商店：武器详情与出售
   ========================================================= */
import { EVENTS } from '../../../engine/core/events.js';
import { playerState } from '../../../state/player.js';
import { statsState } from '../../../state/stats.js';
import { WEAPONS } from '../../../config/index.js';
import { $, html, toast } from '../hud_utils.js';
import { AudioEngine } from '../../../platform/audio/engine.js';
import { iconSVG } from '../../../assets/icons.js';
import { sellWeapon as sellWeaponCmd, weaponSellPrice } from '../../../commands/index.js';
import { weaponFormulaText, weaponFormulaBreakdown, weaponProjInfo } from './formulas.js';
import { EventBus } from '../../../engine/core/event_bus.js';
import { weaponDmg } from '../../../domain/erosion.js';

const pSt = () => playerState.state;
const sSt = () => statsState.state;

let _pwSelected: string | null = null;
let _pwSellConfirm: string | number = 0;
let _pwSellTimer = 0;

export function showWeaponDetail(id: string): void {
  const p = pSt().player;
  if (!p) return;
  const w = p.weapons.find((x: any) => x.id === id);
  if (!w) return;
  const def = WEAPONS[id];
  const box = $('pw-detail');
  if (!box) return;
  // 点击已展开的同武器：关闭
  if (_pwSelected === id && !box.classList.contains('hidden')) {
    box.classList.add('hidden');
    _pwSelected = null;
    Array.from($('shop-weapons').children).forEach(li => { const target = li as HTMLElement; target.classList.remove('active'); });
    return;
  }
  _pwSelected = id;
  Array.from($('shop-weapons').children).forEach(li => { const target = li as HTMLElement; target.classList.toggle('active', target.dataset.wid === id); });
  // 本夜伤害占比
  const wDmg: Record<string, number> = sSt().runStats.wDmg || {};
  const wTotal = Object.keys(wDmg).reduce((s, k) => s + wDmg[k], 0);
  const pct = wTotal > 0 ? Math.round((wDmg[id] || 0) / wTotal * 100) : 0;
  // 属性明细
  const rows: any[] = [
    ['冷却', (def.cd ? def.cd() : (def.tick || 0) * 2).toFixed(2) + 's'],
  ];
  if (def.range) rows.push(['射程', def.range]);
  if (def.radius) rows.push(['环绕半径', def.radius]);
  if (def.cores) rows.push(['核心数', def.cores]);
  if (def.pierce !== undefined) rows.push(['穿透', def.pierce === Infinity ? '∞' : def.pierce]);
  if (def.speed) rows.push(['弹速', def.speed]);
  // 投射物数量（含余影/连珠加成）
  const projInfo = weaponProjInfo(def, p);
  if (projInfo.multi) {
    const diff = projInfo.total - projInfo.base;
    rows.push(['投射物', diff > 0 ? projInfo.base + '+' + diff + '→' + projInfo.total : String(projInfo.total)]);
  }
  if (def.aoe) rows.push(['范围', def.aoe]);
  if (def.fire && (def.fire as any).chain) rows.push(['连锁', (def.fire as any).chain + ' 次']);
  if (def.slow) rows.push(['减速', (def.slow * 100).toFixed(0) + '%']);
  if (def.homing) rows.push(['追踪', '是']);
  // 蚀潮水域：落点爆裂后遗留的潮汐区域
  const tideProj = (def.fire?.projectile as any) || {};
  if (tideProj.poolDur) rows.push(['水域', tideProj.poolDur + 's · 潮压' + tideProj.poolTick + 's']);
  if (tideProj.poolSlow) rows.push(['水域减速', Math.round(tideProj.poolSlow * 100) + '%']);
  const price = weaponSellPrice(w.lv);
  // 侵蚀武器：公式行内联合并月蚀倍率（与商店卡片一致）
  const eroFrag = w.eroded && def.erosion
    ? ' <span class="eroded-tier">+ 月蚀深度×(' + (Math.round(def.erosion.x * 100) / 100) + '+' + (Math.round(def.erosion.y * 100) / 100) + '×L)</span>'
    : '';
  box.innerHTML = html`
    <div class="pwd-head">
      <span class="pwd-ic" style="color:${def.color};filter:drop-shadow(0 0 9px ${def.color}66)">${def.icon}</span>
      <div class="pwd-title">
        <div class="pwd-name">${def.name}${w.eroded ? '·侵蚀' : ''}</div>
        <div class="pwd-lv">Lv.${w.lv} · 本夜占比 ${pct}%</div>
      </div>
      <button class="pwd-close" id="pwd-close">×</button>
    </div>
    <div class="pwd-formula">${weaponFormulaText(def)}${eroFrag}</div>
    <div class="pwd-calc">
      ${weaponFormulaBreakdown(def, p, w.lv, w).map(s => html`
        <div class="pwd-calc-row"><span>${s.label}</span><i>${s.expr}</i><b>${Math.round(s.value * 10) / 10}</b></div>
      `).join('')}
      <div class="pwd-calc-total">最终伤害 <b>${Math.round(weaponDmg(w, p))}</b></div>
    </div>
    <div class="pwd-stats">
      ${rows.map(r => html`<div class="pwd-stat"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
    </div>
    <div class="pwd-sell">
      <button class="sell-btn" id="pwd-sell">出售 · ${price} ${iconSVG('coin')}</button>
    </div>
  `;
  box.classList.remove('hidden');
  box.classList.toggle('eroded', !!w.eroded);
  _pwSellConfirm = 0;
  $('pwd-close').onclick = () => {
    box.classList.add('hidden');
    _pwSelected = null;
    Array.from($('shop-weapons').children).forEach(li => { const target = li as HTMLElement; target.classList.remove('active'); });
  };
  $('pwd-sell').onclick = () => sellWeapon(id);
}

function sellWeapon(id: string): void {
  const p = pSt().player;
  if (!p) return;
  if (p.weapons.length <= 1) { toast('至少保留一件武器'); return; }
  const w = p.weapons.find((x: any) => x.id === id);
  const def = WEAPONS[id];
  if (!w || !def) return;
  const price = weaponSellPrice(w.lv);
  const btn = $('pwd-sell');
  if (_pwSellConfirm !== id) {
    _pwSellConfirm = id;
    btn.classList.add('confirm');
    btn.innerHTML = html`确认出售 ${price} ${iconSVG('coin')}？`;
    window.clearTimeout(_pwSellTimer);
    _pwSellTimer = window.setTimeout(() => {
      if (_pwSellConfirm === id) {
        _pwSellConfirm = 0;
        const b2 = $('pwd-sell');
        if (b2) { b2.classList.remove('confirm'); b2.innerHTML = html`出售 · ${price} ${iconSVG('coin')}`; }
      }
    }, 2600);
    return;
  }
  const r = sellWeaponCmd(id);
  if (!r.ok) { if (r.reason) toast(r.reason); return; }
  AudioEngine.playSfx('sell');
  _pwSellConfirm = 0;
  _pwSelected = null;
  toast(def.name + ' 已出售 +' + r.price);
  // 局部刷新：重建武器列表 / 属性面板 / 金币，不重新随机商店卡牌
  //（openShop() 会重摇武器与道具池，出售不应触发）
  const cur = pSt().player;
  if (cur) EventBus.emit(EVENTS.SHOP_PANEL_REFRESH, { player: cur });
  const gold = $('shop-gold');
  if (gold) gold.textContent = String(Math.floor(sSt().gold));
}
