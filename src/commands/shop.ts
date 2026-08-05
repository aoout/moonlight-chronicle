/* =========================================================
   蚀月远征 · 命令模式：商店操作
   封装 UI 触发的多步骤状态变更（金币扣除 / 武器增删 / 属性重算）
   UI 层只需调用命令并依据返回值给出反馈（toast / 音效 / 重渲染）
   ========================================================= */
import { achOnItemBuy } from '../systems/AchievementSystem.js';
import { statsState } from '../state/stats.js';
import { playerState } from '../state/player.js';
import { addWeapon, upgradeWeapon, removeWeapon, computeDerived } from '../domain/player.js';
import { codexAdd } from '../persistence/codex.js';
import { isDevMode } from '../debug/dev_mode.js';

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
  item.apply(p);
  codexAdd('items', item.id);
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
