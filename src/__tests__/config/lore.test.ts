/* =========================================================
   lore.json 完整性守卫：
   1) 所有武器/道具都应有对应 lore 碎片（防新增条目漏写文案）
   2) lore 被正确合并进 WEAPONS / SHOP_ITEMS
   3) 每段碎片都有出处（src）与正文（text）
   ========================================================= */
import { describe, it, expect } from 'vitest';
import { WEAPONS } from '../../config/weapons.js';
import { SHOP_ITEMS } from '../../config/items.js';
import loreData from '../../config/lore.json';

const LORE: {
  weapons: Record<string, { src: string; text: string }[]>;
  items: Record<string, { src: string; text: string }[]>;
} = loreData as any;

describe('lore 数据完整性', () => {
  it('lore.json 覆盖全部武器 id', () => {
    const missing = Object.keys(WEAPONS).filter(id => !LORE.weapons[id]?.length);
    expect(missing).toEqual([]);
  });

  it('lore.json 覆盖全部道具 id', () => {
    const missing = SHOP_ITEMS.map(it => it.id).filter(id => !LORE.items[id]?.length);
    expect(missing).toEqual([]);
  });

  it('lore.json 无多余条目（id 均真实存在）', () => {
    const weaponIds = new Set(Object.keys(WEAPONS));
    const itemIds = new Set(SHOP_ITEMS.map(it => it.id));
    expect(Object.keys(LORE.weapons).filter(id => !weaponIds.has(id))).toEqual([]);
    expect(Object.keys(LORE.items).filter(id => !itemIds.has(id))).toEqual([]);
  });

  it('每段碎片都有出处与正文，且正文非空', () => {
    const all = [...Object.values(LORE.weapons).flat(), ...Object.values(LORE.items).flat()];
    expect(all.length).toBeGreaterThan(50);
    for (const frag of all) {
      expect(frag.src.trim().length).toBeGreaterThan(0);
      expect(frag.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('碎片化叙事不直白点破因果（正文不含直接因果句式）', () => {
    // 魂系铁律：lore 禁「因为…所以…」式直白因果，避免把故事讲穿
    const all = [...Object.values(LORE.weapons).flat(), ...Object.values(LORE.items).flat()];
    const offenders = all.filter(f => /因为.{0,12}所以/.test(f.text));
    expect(offenders.map(f => f.src)).toEqual([]);
  });
});

describe('lore 合并进运行时配置', () => {
  it('WEAPONS 条目已附加 lore 字段', () => {
    const sample = WEAPONS['moonRing'];
    expect(sample.lore).toBeDefined();
    expect(sample.lore!.length).toBeGreaterThan(0);
    expect(sample.lore![0].src).toContain('月童谣');
  });

  it('SHOP_ITEMS 条目已附加 lore 字段', () => {
    const sample = SHOP_ITEMS.find(it => it.id === 'yourMoon');
    expect(sample).toBeDefined();
    expect(sample!.lore).toBeDefined();
    expect(sample!.lore!.length).toBeGreaterThan(0);
    expect(sample!.lore![0].src).toContain('守月人手记');
  });
});
