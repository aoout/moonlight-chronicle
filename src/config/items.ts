/* =========================================================
   蚀月远征 · 数据层：商店道具（纯声明式）
   仅描述道具元数据；购买后的实际效果见 domain/item_effects.ts，
   两者以 id 关联，配置层因此不依赖任何 domain / state。
   ========================================================= */
import { ICONS } from '../assets/icons.js';
import { validateEntries, validateAndWarn } from './validate.js';
import itemsData from './items.json';
import type { ShopItemDef } from '../types/core.d.ts';

export const SHOP_ITEMS: ShopItemDef[] = [];

const ICON_MAP = ICONS;

// 校验道具数据
validateAndWarn(validateEntries(itemsData, {
  id: { type: 'string', desc: '道具标识' },
  name: { type: 'string', desc: '道具名称' },
  icon: { type: 'string', desc: '图标键名' },
  rarity: { type: 'string', desc: '稀有度' },
  price: { type: 'number', desc: '价格' },
  desc: { type: 'string', desc: '描述' },
  max: { type: 'number', optional: true, desc: '最大购买次数（无则不限）' },
}, 'items.json'), 'items.json');

// 加载 JSON 数据，解析图标键名
for (const data of Object.values(itemsData)) {
  const item: Record<string, any> = { ...data };
  if (typeof item.icon === 'string') {
    item.icon = ICON_MAP[item.icon] || item.icon;
  }
  SHOP_ITEMS.push(item as ShopItemDef);
}
