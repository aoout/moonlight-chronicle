/* =========================================================
   domain/item_effects · 道具效果注册表
   ---------------------------------------------------------
   这个模块最容易出的不是逻辑 bug，而是「配置与实现对不上」：
   items.json 里加了一件新道具，忘了在 APPLY_FN 里登记效果 ——
   玩家花钱买了个空气，而且**没有任何报错**。

   所以本文件的第一等公民是两条契约测试（双向全覆盖），
   之后才是具体效果的数值断言。
   ========================================================= */
import { describe, it, expect } from 'vitest';
import { applyItemEffect, hasItemEffect, itemEffectIds } from '../../domain/item_effects.js';
import { SHOP_ITEMS } from '../../config/index.js';
import { makePlayer } from '../_harness/index.js';
import type { Player } from '../../types/core.d.ts';

const ITEM_IDS = SHOP_ITEMS.map(i => i.id);

/** 玩家上所有数值字段的快照，用来检测「有没有改动 / 改出没改出 NaN」 */
function numericSnapshot(p: Player): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(p)) {
    if (typeof v === 'number') out[k] = v;
  }
  return out;
}

describe('配置与实现的双向契约', () => {
  it('items.json 里每一件道具都必须登记效果（买了不能是空气）', () => {
    const missing = ITEM_IDS.filter(id => !hasItemEffect(id));
    expect(missing, `这些道具没有实现：${missing.join(', ')}`).toEqual([]);
  });

  it('每一条已登记的效果都能被商店买到（没有死实现）', () => {
    const shop = new Set(ITEM_IDS);
    const orphan = itemEffectIds().filter(id => !shop.has(id));
    expect(orphan, `这些效果没有对应道具：${orphan.join(', ')}`).toEqual([]);
  });

  it('道具 id 不重复', () => {
    expect(new Set(ITEM_IDS).size).toBe(ITEM_IDS.length);
  });

  it('全部道具作用在标准玩家上都不产生 NaN / undefined', () => {
    for (const id of ITEM_IDS) {
      const p = makePlayer();
      applyItemEffect(id, p);

      for (const [k, v] of Object.entries(numericSnapshot(p))) {
        expect(Number.isFinite(v), `${id} 把 ${k} 变成了 ${v}`).toBe(true);
      }
    }
  });

  it('全部道具都确实改变了玩家状态（不存在只挂名不生效的实现）', () => {
    for (const id of ITEM_IDS) {
      const p = makePlayer();
      const before = JSON.stringify([numericSnapshot(p), p.effects]);
      applyItemEffect(id, p);
      const after = JSON.stringify([numericSnapshot(p), p.effects]);

      expect(after, `${id} 没有产生任何效果`).not.toBe(before);
    }
  });
});

describe('applyItemEffect · 边界', () => {
  it('未注册 id 是空操作，不抛异常也不改状态', () => {
    const p = makePlayer();
    const before = JSON.stringify(numericSnapshot(p));

    expect(() => applyItemEffect('不存在的道具', p)).not.toThrow();
    expect(JSON.stringify(numericSnapshot(p))).toBe(before);
  });

  it('hasItemEffect 对未注册 id 返回 false', () => {
    expect(hasItemEffect('不存在的道具')).toBe(false);
    expect(hasItemEffect('hp1')).toBe(true);
  });
});

describe('具体效果 · 数值', () => {
  it('hp1 同时抬上限并回等额血，且不会溢出上限', () => {
    const p = makePlayer({ maxHp: 100, hp: 90 });

    applyItemEffect('hp1', p);

    expect(p.maxHp).toBe(125);
    expect(p.hp).toBe(115);
  });

  it('hp1 在满血时回血被上限钳住', () => {
    const p = makePlayer({ maxHp: 100, hp: 100 });

    applyItemEffect('hp1', p);

    expect(p.maxHp).toBe(125);
    expect(p.hp).toBe(125);
  });

  it('同一道具可叠加购买，效果线性累加', () => {
    const p = makePlayer();
    const base = p.atk;

    applyItemEffect('atk1', p);
    applyItemEffect('atk1', p);
    applyItemEffect('atk1', p);

    expect(p.atk).toBe(base + 12);
  });

  it('多词条道具的每一项都要生效（area1 同时给范围与拾取半径）', () => {
    const p = makePlayer();
    const area = p.area, magnet = p.magnet;

    applyItemEffect('area1', p);

    expect(p.area).toBeCloseTo(area + 0.12);
    expect(p.magnet).toBe(magnet + 20);
  });

  it('dash1 的乘法与加法有先后顺序，不能写反', () => {
    const p = makePlayer({ speed: 200, dodge: 0 });

    applyItemEffect('dash1', p);

    // 先 ×1.08 再 +30，写反会得到 248.4
    expect(p.speed).toBeCloseTo(200 * 1.08 + 30);
    expect(p.dodge).toBeCloseTo(0.08);
  });

  it('shield1 同时设定护盾值与护盾上限', () => {
    const p = makePlayer();

    applyItemEffect('shield1', p);

    expect(p.effects.shield).toBe(30);
    expect(p.effects.shieldMax).toBe(30);
  });

  it('写 effects 的道具不会污染玩家顶层数值字段', () => {
    const p = makePlayer();
    const before = JSON.stringify(numericSnapshot(p));

    applyItemEffect('devour', p);

    expect(p.effects.devour).toBe(1);
    expect(JSON.stringify(numericSnapshot(p))).toBe(before);
  });

  it('yourMoon 记录当前月相并套用对应加成', () => {
    const p = makePlayer();

    applyItemEffect('yourMoon', p);

    expect(p.effects.yourMoon).toBe(1);
    expect(typeof p.effects.moonPhase).toBe('number');
  });
});
