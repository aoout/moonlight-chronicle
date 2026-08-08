/* =========================================================
   domain · shop_offers 集市货架生成
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateShopSlots, refillSoldSlots,
  SHOP_WEAPON_SLOTS, SHOP_ITEM_SLOTS,
} from '../../domain/shop_offers.js';
import { WEAPONS, SHOP_ITEMS } from '../../config/index.js';
import { installPlayer } from '../_harness/index.js';
import { addWeapon } from '../../domain/player.js';
import { playerState } from '../../state/player.js';

const player = () => playerState.state.player!;

beforeEach(() => {
  installPlayer();
  addWeapon('moonRing');
});

describe('generateShopSlots', () => {
  it('池充足时生成 2 武器 + 4 道具共 6 槽，全部未售', () => {
    const slots = generateShopSlots(player());
    expect(slots).toHaveLength(SHOP_WEAPON_SLOTS + SHOP_ITEM_SLOTS);
    expect(slots.filter(s => s.kind === 'weapon')).toHaveLength(SHOP_WEAPON_SLOTS);
    expect(slots.filter(s => s.kind === 'item')).toHaveLength(SHOP_ITEM_SLOTS);
    expect(slots.every(s => s.sold === false)).toBe(true);
  });

  it('武器槽 id 来自武器表且侵蚀态为布尔；道具槽 id 来自道具表', () => {
    const slots = generateShopSlots(player());
    for (const s of slots) {
      if (s.kind === 'weapon') {
        expect(WEAPONS[s.id]).toBeDefined();
        expect(typeof s.eroded).toBe('boolean');
      } else {
        expect(SHOP_ITEMS.some(it => it.id === s.id)).toBe(true);
      }
    }
  });
});

describe('refillSoldSlots', () => {
  it('只重填空槽：未售槽原样保留，售罄槽被新货填充', () => {
    const p = player();
    const keep = { kind: 'weapon' as const, id: 'crossbow', eroded: false, sold: false };
    const slots = [
      { ...keep },
      { kind: 'item' as const, id: SHOP_ITEMS[0].id, sold: true },
    ];
    refillSoldSlots(p, slots);
    expect(slots[0]).toEqual(keep);
    expect(slots[1].sold).toBe(false);
    expect(SHOP_ITEMS.some(it => it.id === slots[1].id)).toBe(true);
  });

  it('已拥有且未满级的武器可被补成升级槽', () => {
    const p = player();
    const slots = [
      { kind: 'weapon' as const, id: 'moonRing', eroded: false, sold: true },
    ];
    refillSoldSlots(p, slots);
    expect(slots[0].sold).toBe(false);
    expect(slots[0].kind).toBe('weapon');
    expect(WEAPONS[slots[0].id]).toBeDefined();
  });
});
