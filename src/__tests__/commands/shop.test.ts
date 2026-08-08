/* =========================================================
   commands/shop · 商店命令
   ---------------------------------------------------------
   原来这里 mock 了 AchievementSystem 和 `../persistence/codex.js`。
   后者在分层重构后已经搬到 infra/persistence，路径失效 —— vi.mock
   对解析不到的路径是**静默空转**，等于什么都没挡住。

   现在两个都不 mock：成就与图鉴都已被证明可在无 DOM 环境加载，
   localStorage 由测试宿主接管，跑真身反而多测一段真实链路。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  purchaseWeapon, upgradeWeaponCmd, purchaseItem, sellWeapon, weaponSellPrice, refillShop,
} from '../../commands/shop.js';
import { addWeapon } from '../../domain/player.js';
import { SHOP_ITEMS } from '../../config/index.js';
import { CONFIG, refillPrice } from '../../config/index.js';
import { playerState } from '../../state/player.js';
import { statsState } from '../../state/stats.js';
import { shopState } from '../../state/shop.js';
import { generateShopSlots } from '../../domain/shop_offers.js';
import { installPlayer, enableDevMode } from '../_harness/index.js';

const player = () => playerState.state.player!;
const gold = () => statsState.state.gold;
const weaponIds = () => player().weapons.map(w => w.id);

/** 挑一件普通道具和一件传说道具，避免把测试钉死在具体 id 上 */
const anyItem = () => SHOP_ITEMS[0];
const legendItem = () => SHOP_ITEMS.find(i => i.rarity === 'legend') ?? SHOP_ITEMS[0];

beforeEach(() => {
  installPlayer();
  addWeapon('moonRing');
  statsState.set('gold', 10);
});

/* ========== 购买武器 ========== */

describe('purchaseWeapon', () => {
  it('金币不足时失败，不扣款也不上武器', () => {
    const r = purchaseWeapon('crossbow', 20);

    expect(r.ok).toBe(false);
    expect(r.reason).toBe('金币不足');
    expect(gold()).toBe(10);
    expect(weaponIds()).toEqual(['moonRing']);
  });

  it('金币刚好够时按原价扣款', () => {
    statsState.set('gold', 20);
    const r = purchaseWeapon('crossbow', 20);

    expect(r.ok).toBe(true);
    expect(gold()).toBe(0);
    expect(weaponIds()).toContain('crossbow');
  });

  it('武器栏满时失败且不扣款', () => {
    statsState.set('gold', 9999);
    for (const id of ['crossbow', 'orbit', 'storm', 'blade']) purchaseWeapon(id, 1);
    expect(player().weapons).toHaveLength(CONFIG.MAX_WEAPONS);

    const before = gold();
    const r = purchaseWeapon('overflow', 1);

    expect(r.ok).toBe(false);
    expect(r.reason).toContain('武器栏已满');
    expect(gold()).toBe(before);
  });

  it('购买后立即重算派生属性', () => {
    statsState.set('gold', 100);
    player().atk = 999;
    purchaseWeapon('crossbow', 10);

    expect(player().effAtk).toBe(999);   // 命令内部调了 computeDerived
  });

  it('eroded 参数透传到武器实例', () => {
    statsState.set('gold', 100);
    purchaseWeapon('crossbow', 10, true);

    expect(player().weapons.find(w => w.id === 'crossbow')).toMatchObject({ eroded: true });
  });
});

/* ========== 升级武器 ========== */

describe('upgradeWeaponCmd', () => {
  it('金币不足时失败且等级不变', () => {
    const r = upgradeWeaponCmd('moonRing', 999);

    expect(r.ok).toBe(false);
    expect(player().weapons[0].lv).toBe(1);
  });

  it('成功升级并扣款', () => {
    statsState.set('gold', 30);
    const r = upgradeWeaponCmd('moonRing', 12);

    expect(r.ok).toBe(true);
    expect(gold()).toBe(18);
    expect(player().weapons[0].lv).toBe(2);
  });

  it('满级后失败，且不能白扣钱', () => {
    statsState.set('gold', 9999);
    for (let i = 0; i < 9; i++) upgradeWeaponCmd('moonRing', 1);
    expect(player().weapons[0].lv).toBe(10);

    const before = gold();
    const r = upgradeWeaponCmd('moonRing', 1);

    expect(r.ok).toBe(false);
    expect(r.reason).toBe('无法升级');
    expect(gold()).toBe(before);
  });
});

/* ========== 购买道具 ========== */

describe('purchaseItem', () => {
  it('无玩家时直接失败', () => {
    playerState.set('player', null);
    expect(purchaseItem(anyItem(), 0).ok).toBe(false);
  });

  it('金币不足时失败且不结算效果', () => {
    const item = anyItem();
    const r = purchaseItem(item, 999);

    expect(r.ok).toBe(false);
    expect(player().effects.boughtItems?.[item.id]).toBeUndefined();
  });

  it('成功购买后记录持有份数', () => {
    statsState.set('gold', 9999);
    const item = anyItem();

    purchaseItem(item, 1);
    expect(player().effects.boughtItems![item.id]).toBe(1);

    purchaseItem(item, 1);
    expect(player().effects.boughtItems![item.id]).toBe(2);
  });

  it('传说道具同样能购入（稀有度只影响成就计数）', () => {
    statsState.set('gold', 9999);
    const item = legendItem();
    expect(purchaseItem(item, 1).ok).toBe(true);
  });
});

/* ========== 出售武器 ========== */

describe('weaponSellPrice', () => {
  it('1 级基础价 8，每级 +4', () => {
    expect(weaponSellPrice(1)).toBe(8);
    expect(weaponSellPrice(2)).toBe(12);
    expect(weaponSellPrice(10)).toBe(44);
  });

  it('单调不减（升级过的武器不会越卖越便宜）', () => {
    for (let lv = 2; lv <= 10; lv++) {
      expect(weaponSellPrice(lv)).toBeGreaterThan(weaponSellPrice(lv - 1));
    }
  });
});

describe('sellWeapon', () => {
  it('无玩家时失败', () => {
    playerState.set('player', null);
    expect(sellWeapon('moonRing')).toMatchObject({ ok: false, price: 0 });
  });

  it('只剩一件武器时拒绝出售（防止裸奔）', () => {
    const r = sellWeapon('moonRing');

    expect(r.ok).toBe(false);
    expect(r.reason).toBe('至少保留一件武器');
    expect(weaponIds()).toEqual(['moonRing']);
  });

  it('未持有的武器无法出售', () => {
    statsState.set('gold', 100);
    purchaseWeapon('crossbow', 1);

    expect(sellWeapon('nope')).toMatchObject({ ok: false, reason: '未拥有该武器' });
  });

  it('成功出售：移除武器、按等级返还金币', () => {
    statsState.set('gold', 100);
    purchaseWeapon('crossbow', 40);   // gold → 60
    upgradeWeaponCmd('crossbow', 10); // gold → 50, lv 2

    const r = sellWeapon('crossbow');

    expect(r.ok).toBe(true);
    expect(r.price).toBe(weaponSellPrice(2));
    expect(gold()).toBe(50 + weaponSellPrice(2));
    expect(weaponIds()).toEqual(['moonRing']);
  });

  it('出售后冷却表被清干净（卖了不该还在转 CD）', () => {
    statsState.set('gold', 100);
    purchaseWeapon('crossbow', 1);
    playerState.state.weaponCdFull.crossbow = 2;

    sellWeapon('crossbow');

    expect(playerState.state.weaponCd).not.toHaveProperty('crossbow');
    expect(playerState.state.weaponCdFull).not.toHaveProperty('crossbow');
  });
});

/* ========== 涨潮补货 ========== */

describe('refillShop（涨潮补货）', () => {
  /** 构造含 1 个空位的货架 */
  const withSoldSlot = () => {
    const slots = generateShopSlots(player());
    slots[0].sold = true;
    shopState.set('slots', slots);
    shopState.set('refills', 0);
  };

  it('货架无空位时失败', () => {
    shopState.set('slots', generateShopSlots(player()));
    shopState.set('refills', 0);
    const r = refillShop();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('货架已满，无需补货');
  });

  it('金币不足时失败，不扣款不计数', () => {
    withSoldSlot();
    statsState.set('gold', 1);
    const r = refillShop();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('金币不足');
    expect(gold()).toBe(1);
    expect(shopState.state.refills).toBe(0);
    expect(shopState.state.slots.some(s => s.sold)).toBe(true);
  });

  it('成功补货：扣基础价 2、计数 +1、空槽补满且未售槽保留', () => {
    withSoldSlot();
    const kept = { ...shopState.state.slots[1] };
    const r = refillShop();
    expect(r.ok).toBe(true);
    expect(r.price).toBe(2);
    expect(gold()).toBe(8); // 10 - 2
    expect(shopState.state.refills).toBe(1);
    expect(shopState.state.slots.some(s => s.sold)).toBe(false);
    expect(shopState.state.slots[1]).toEqual(kept); // 未售槽原样
  });

  it('第二次补货涨价：refillPrice(2) = 6', () => {
    withSoldSlot();
    refillShop();
    // 再制造一个空位后补第二次
    const slots = shopState.state.slots.map(s => ({ ...s }));
    slots[0].sold = true;
    shopState.set('slots', slots);
    const r = refillShop();
    expect(r.price).toBe(refillPrice(2));
    expect(shopState.state.refills).toBe(2);
    expect(gold()).toBe(8 - 6);
  });

  it('补货价不受通货膨胀与加价诅咒影响（纯 refillPrice）', () => {
    withSoldSlot();
    const p = player();
    p.effects.priceMul = 1.3;          // 蚀雾弥漫诅咒
    const r = refillShop();
    expect(r.price).toBe(refillPrice(1)); // 仍是 2，未 ×1.3 也未 ×inflation
  });
});

/* ========== god 模式 ========== */

describe('god 模式（?dev=1）：无限金币', () => {
  beforeEach(() => { enableDevMode(); });

  it('金币不足也能买武器且不扣款', () => {
    const r = purchaseWeapon('crossbow', 20);

    expect(r.ok).toBe(true);
    expect(gold()).toBe(10);
    expect(weaponIds()).toContain('crossbow');
  });

  it('升级与买道具同样不扣款', () => {
    expect(upgradeWeaponCmd('moonRing', 9999).ok).toBe(true);
    expect(purchaseItem(anyItem(), 9999).ok).toBe(true);
    expect(gold()).toBe(10);
  });

  it('免费不等于无视规则：武器栏上限仍然生效', () => {
    for (const id of ['crossbow', 'orbit', 'storm', 'blade']) purchaseWeapon(id, 9999);
    expect(purchaseWeapon('overflow', 9999).ok).toBe(false);
  });

  it('免费不等于无视规则：满级武器仍不能再升', () => {
    for (let i = 0; i < 9; i++) upgradeWeaponCmd('moonRing', 9999);
    expect(upgradeWeaponCmd('moonRing', 9999).ok).toBe(false);
  });

  it('god 模式补货不扣款但计数照加', () => {
    const slots = generateShopSlots(player());
    slots[0].sold = true;
    shopState.set('slots', slots);
    shopState.set('refills', 0);
    const r = refillShop();
    expect(r.ok).toBe(true);
    expect(gold()).toBe(10); // 不扣款
    expect(shopState.state.refills).toBe(1);
  });
});
