/* =========================================================
   蚀月远征 · 状态切片：商店货架
   每夜货架槽位（购买置空，刷新补满）与刷新计数
   ========================================================= */
import { Store } from '../engine/core/store.js';

/** 单个货架槽位：武器（含侵蚀）/ 道具，sold=已售罄 */
export interface ShopSlot {
  kind: 'weapon' | 'item';
  id: string;
  eroded?: boolean;
  sold: boolean;
}

export interface ShopState {
  /** 当前夜货架槽位；空数组 = 尚未开市（进入商店时生成） */
  slots: ShopSlot[];
  /** 本夜已刷新次数（决定下次刷新价格，每夜重置） */
  refills: number;
}

const INITIAL: ShopState = {
  slots: [],
  refills: 0,
};

export const shopState = new Store<ShopState>(INITIAL);

/** 每夜开市：清空货架与刷新计数（由状态机 SHOP onEnter 调用） */
export function resetShopNight(): void {
  shopState.set('slots', []);
  shopState.set('refills', 0);
}
