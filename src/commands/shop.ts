/* =========================================================
   蚀月远征 · 命令模式：商店操作
   封装 UI 触发的多步骤状态变更（金币扣除 / 武器增删 / 属性重算）
   UI 层只需调用命令并依据返回值给出反馈（toast / 音效 / 重渲染）
   ========================================================= */
import { achOnItemBuy } from '../systems/AchievementSystem.js';
import { statsState } from '../state/stats.js';
import { playerState } from '../state/player.js';
import { shopState } from '../state/shop.js';
import { addWeapon, upgradeWeapon, removeWeapon, computeDerived } from '../domain/player.js';
import { applyItemEffect } from '../domain/item_effects.js';
import { regenerateAllSlots, refillCost } from '../domain/shop_offers.js';
import { codexAdd } from '../infra/persistence/codex.js';
import { handsAdd } from '../infra/persistence/hands.js';
import { isDevMode } from '../engine/env.js';

interface Result {
  ok: boolean;
  reason?: string;
}

interface SellResult extends Result {
  price: number;
}

/** 购买新武器（eroded：月蚀侵蚀，伤害 +月蚀深度×(x+yL)） */
export function purchaseWeapon(id: string, price: number, eroded?: boolean): Result {
  const s = statsState.state;
  const god = isDevMode(); // god 模式：无限金币
  if (!god && s.gold < price) return { ok: false, reason: '金币不足' };
  if (!addWeapon(id, { eroded })) return { ok: false, reason: '武器栏已满（最多 5 件）' };
  handsAdd('weapons', id); // 记手录：选取一次，深一层字迹
  if (!god) statsState.set('gold', s.gold - price);
  const p = playerState.state.player;
  if (p) computeDerived(p);
  return { ok: true };
}

/** 升级武器 */
export function upgradeWeaponCmd(id: string, price: number): Result {
  const s = statsState.state;
  const god = isDevMode(); // god 模式：无限金币
  if (!god && s.gold < price) return { ok: false, reason: '金币不足' };
  if (!upgradeWeapon(id)) return { ok: false, reason: '无法升级' };
  if (!god) statsState.set('gold', s.gold - price);
  const p = playerState.state.player;
  if (p) computeDerived(p);
  return { ok: true };
}

/** 购买道具 */
export function purchaseItem(item: any, price: number): Result {
  const s = statsState.state;
  const p = playerState.state.player;
  if (!p) return { ok: false, reason: '无玩家' };
  const god = isDevMode(); // god 模式：无限金币
  if (!god && s.gold < price) return { ok: false, reason: '金币不足' };
  if (!god) statsState.set('gold', s.gold - price);
  applyItemEffect(item.id, p);
  codexAdd('items', item.id);
  handsAdd('items', item.id); // 记手录：选取一次，深一层字迹
  const prev = p.effects.boughtItems?.[item.id] ?? 0;
  const cnt = prev + 1;
  p.effects.boughtItems = p.effects.boughtItems || {};
  p.effects.boughtItems[item.id] = cnt;
  achOnItemBuy(item.rarity === 'legend');
  computeDerived(p);
  return { ok: true };
}

/** 出售武器 */
export function sellWeapon(id: string): SellResult {
  const p = playerState.state.player;
  if (!p) return { ok: false, price: 0, reason: '无玩家' };
  if (p.weapons.length <= 1) return { ok: false, price: 0, reason: '至少保留一件武器' };
  const w = p.weapons.find((x: any) => x.id === id);
  if (!w) return { ok: false, price: 0, reason: '未拥有该武器' };
  const price = weaponSellPrice(w.lv);
  removeWeapon(id);
  statsState.set('gold', statsState.state.gold + price);
  computeDerived(p);
  return { ok: true, price };
}

/** 出售价格公式 */
export function weaponSellPrice(lv: number): number {
  return Math.floor(8 + (lv - 1) * 4);
}

/** 涨潮补货：刷新全部槽位。价格由 refillCost 计算（集市三契联动），不受通胀/诅咒 */
export function refillShop(): Result & { price?: number } {
  const s = statsState.state;
  const p = playerState.state.player;
  if (!p) return { ok: false, reason: '无玩家' };
  const st = shopState.state;
  const price = refillCost(p, st.refills + 1);
  const god = isDevMode();
  // 消耗退潮拾贝的免费次数（免费刷新也计入刷新计数，价格照常递增）
  // 必须在金币扣除之前检查，否则免费次数被浪费且金币被误扣
  let actualPrice = price;
  if (!god && (p.effects.nextRefillFree || 0) > 0) {
    p.effects.nextRefillFree = (p.effects.nextRefillFree || 0) - 1;
    actualPrice = 0;
  }
  if (!god && actualPrice > 0 && s.gold < actualPrice) return { ok: false, reason: '金币不足' };
  if (!god && actualPrice > 0) statsState.set('gold', s.gold - actualPrice);
  shopState.set('refills', st.refills + 1);
  // 潮生之珠：每次补货 +1 生命上限 / +1% 暴击伤害
  if (p.effects.tideGrowth) {
    p.maxHp += 1;
    p.hp = Math.min(p.maxHp, p.hp + 1);
    p.critDmg += 0.01;
    computeDerived(p);
  }
  // 全量重掷后整体替换，确保 Store 订阅感知
  const slots = st.slots.map(x => ({ ...x }));
  regenerateAllSlots(p, slots);
  shopState.set('slots', slots);
  return { ok: true, price };
}
