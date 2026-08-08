/* =========================================================
   蚀月远征 · 领域模块：集市货架生成
   从 open_shop.ts 抽出的纯逻辑：生成货架 / 补满空位。
   槽位模型：每夜 2 武器 + 4 道具共 6 槽，购买后置空（sold），
   涨潮补货只重填空槽，未售槽位原样保留。
   ========================================================= */
import { RNG } from '../engine/util/utils.js';
import { WEAPONS, SHOP_ITEMS } from '../config/index.js';
import { rollErosion } from './erosion.js';
import { stageState } from '../state/stage.js';
import type { Player } from '../types/core.d.ts';

/** 货架槽位（与 ShopState 同步，避免循环依赖故在领域层独立声明） */
export interface ShopOffer {
  kind: 'weapon' | 'item';
  id: string;
  eroded?: boolean;
  sold: boolean;
}

/** 每夜武器槽数量 / 道具槽数量（与 SHOP_WEAPON_OFFERS、原道具张数一致） */
export const SHOP_WEAPON_SLOTS = 2;
export const SHOP_ITEM_SLOTS = 4;

/** 掷 1 个武器槽：池 = 未拥有 + 未满级(Lv.10)；抽到已拥有即升级（保留侵蚀态），新武器掷侵蚀 */
export function rollWeaponOffer(p: Player): ShopOffer | null {
  const pool = Object.keys(WEAPONS).filter(id => {
    const w = p.weapons.find((x: any) => x.id === id);
    return !w || w.lv < 10;
  });
  if (!pool.length) return null;
  const id = pool[Math.floor(RNG() * pool.length)];
  const w = p.weapons.find((x: any) => x.id === id);
  return { kind: 'weapon', id, eroded: w ? !!w.eroded : rollErosion(stageState.state.depth || 0), sold: false };
}

/** 掷 1 个道具槽：池 = 未达购买上限的道具 */
export function rollItemOffer(p: Player): ShopOffer | null {
  const bought = p.effects.boughtItems || {};
  const pool = SHOP_ITEMS.filter(it => !it.max || (bought[it.id] || 0) < it.max);
  if (!pool.length) return null;
  const it = pool[Math.floor(RNG() * pool.length)];
  return { kind: 'item', id: it.id, sold: false };
}

/** 生成整夜货架：2 武器 + 4 道具（池空时少槽），随机混合排序 */
export function generateShopSlots(p: Player): ShopOffer[] {
  const slots: ShopOffer[] = [];
  for (let i = 0; i < SHOP_WEAPON_SLOTS; i++) {
    const o = rollWeaponOffer(p);
    if (o) slots.push(o);
  }
  for (let i = 0; i < SHOP_ITEM_SLOTS; i++) {
    const o = rollItemOffer(p);
    if (o) slots.push(o);
  }
  return slots.sort(() => RNG() - 0.5);
}

/** 补满空槽（涨潮补货）：只重填 sold 槽，未售槽保留；池空时槽保持售罄 */
export function refillSoldSlots(p: Player, slots: ShopOffer[]): void {
  for (const s of slots) {
    if (!s.sold) continue;
    const o = s.kind === 'weapon' ? rollWeaponOffer(p) : rollItemOffer(p);
    if (o) {
      s.id = o.id;
      s.eroded = o.eroded;
      s.sold = false;
    }
  }
}
