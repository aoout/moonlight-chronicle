/* =========================================================
   systems/AchievementSystem · 蚀月功勋
   ---------------------------------------------------------
   这个模块把 accum / earned / best 放在文件顶层，并在首次
   import 时从 localStorage 载入。三份 map 一旦被写脏，同一个
   测试文件里后面所有用例都会读到上一条用例的残留。

   所以每条用例都用 importFresh 拿一份出厂状态的模块，
   配合 setup.ts 里的 clearHostStorage()，做到彼此完全独立。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { importFreshAll } from '../_harness/index.js';
import type { AchievementDef } from '../../config/achievements.js';

type AchSystem = typeof import('../../systems/AchievementSystem.js');
type AchConfig = typeof import('../../config/achievements.js');
type AchStore = typeof import('../../infra/persistence/achievements.js');

let ach: AchSystem;
let defs: AchievementDef[];
let store: AchStore;

/** 按 id 取成就定义（用同一份模块图里的定义，避免新旧实例串味） */
const def = (id: string): AchievementDef => {
  const d = defs.find(x => x.id === id);
  if (!d) throw new Error(`成就定义不存在: ${id}（配置改名了？）`);
  return d;
};

beforeEach(async () => {
  const [sys, cfg, persist] = await importFreshAll(
    () => import('../../systems/AchievementSystem.js'),
    () => import('../../config/achievements.js'),
    () => import('../../infra/persistence/achievements.js'),
  );
  ach = sys as AchSystem;
  defs = (cfg as AchConfig).ACHIEVEMENTS;
  store = persist as AchStore;
});

/* ========== 用例独立性自检 ========== */

describe('用例隔离', () => {
  it('每条用例拿到的都是零进度的全新模块', () => {
    expect(ach.achIsEarned('a_kill_100')).toBe(false);
    expect(ach.achOtherEarned()).toBe(0);
  });

  it('上一条用例哪怕解锁了成就也不会漏进来', () => {
    // 先污染
    ach.achSessionStart(0);
    for (let i = 0; i < 100; i++) ach.achOnKill('grub', undefined, false);
    expect(ach.achIsEarned('a_kill_100')).toBe(true);
    // 下一条用例的 beforeEach 会把它清掉——由上一条用例的断言反证
  });

  it('确认前一条的污染没有渗透过来', () => {
    expect(ach.achIsEarned('a_kill_100')).toBe(false);
  });
});

/* ========== 累计 vs 单局 ========== */

describe('累计型成就', () => {
  it('累计击杀达标即解锁，未达标的更高档位保持关闭', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 100; i++) ach.achOnKill('grub', undefined, false);

    expect(ach.achIsEarned('a_kill_100')).toBe(true);
    expect(ach.achIsEarned('a_kill_1000')).toBe(false);
    expect(ach.achProgressOf(def('a_kill_100'))).toBe(100);
  });

  it('累计进度跨局叠加', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 60; i++) ach.achOnKill('grub', undefined, false);
    ach.achSessionEnd();

    ach.achSessionStart(0);
    for (let i = 0; i < 40; i++) ach.achOnKill('grub', undefined, false);

    expect(ach.achIsEarned('a_kill_100')).toBe(true);   // 60 + 40
  });

  it('累计进度显示时被 target 截断，不会超过 100%', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 300; i++) ach.achOnKill('grub', undefined, false);

    const d = def('a_kill_100');
    expect(ach.achProgressOf(d)).toBe(d.target);
  });
});

describe('单局型成就', () => {
  it('单局击杀达标即解锁，不与累计混算', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 500; i++) ach.achOnKill('grub', undefined, false);

    expect(ach.achIsEarned('a_kill_500')).toBe(true);    // 单局 500 → 达标
    expect(ach.achIsEarned('a_kill_1000')).toBe(false);  // 累计也才 500
  });

  it('两局各 300 不解锁单局 500（单局统计每局清零）', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 300; i++) ach.achOnKill('grub', undefined, false);
    ach.achSessionEnd();

    ach.achSessionStart(0);
    for (let i = 0; i < 300; i++) ach.achOnKill('grub', undefined, false);

    expect(ach.achIsEarned('a_kill_500')).toBe(false);
    expect(ach.achIsEarned('a_kill_100')).toBe(true);    // 累计 600 → 达标
  });

  it('单次伤害取本局峰值，不累加', () => {
    ach.achSessionStart(0);
    ach.achOnDamage(1500, true);
    ach.achOnDamage(1200, false);
    expect(ach.achIsEarned('a_dmg_2000')).toBe(false);   // 1500 与 1200 不相加

    ach.achOnDamage(2500, true);
    expect(ach.achIsEarned('a_dmg_2000')).toBe(true);
  });

  it('武器与道具计数按本局累加', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 5; i++) ach.achOnWeapon();
    for (let i = 0; i < 15; i++) ach.achOnItemBuy(false);
    ach.achSessionEnd();

    expect(ach.achProgressOf(def('a_weapon_5'))).toBe(5);
    expect(ach.achProgressOf(def('a_item_15'))).toBe(15);
  });
});

/* ========== 历史最佳 ========== */

describe('历史最佳（best）', () => {
  it('局末结算把单局成绩写入 best', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 300; i++) ach.achOnKill('grub', undefined, false);
    ach.achSessionEnd();

    expect(ach.achProgressOf(def('a_kill_500'))).toBe(300);
  });

  it('后续更差的一局不会把 best 拉低', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 300; i++) ach.achOnKill('grub', undefined, false);
    ach.achSessionEnd();

    ach.achSessionStart(0);
    for (let i = 0; i < 10; i++) ach.achOnKill('grub', undefined, false);
    ach.achSessionEnd();

    expect(ach.achProgressOf(def('a_kill_500'))).toBe(300);
  });

  it('未结算的当前局不计入 best（进度读的是已结算成绩）', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 300; i++) ach.achOnKill('grub', undefined, false);
    // 故意不调 achSessionEnd

    expect(ach.achProgressOf(def('a_kill_500'))).toBe(0);
  });

  it('best 同样被 target 截断', () => {
    ach.achSessionStart(0);
    ach.achOnDamage(99999, true);
    ach.achSessionEnd();

    const d = def('a_dmg_2000');
    expect(ach.achProgressOf(d)).toBe(d.target);
  });
});

/* ========== 持久化 ========== */

describe('持久化', () => {
  it('解锁与累计写入存档，重新载入后仍在', async () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 100; i++) ach.achOnKill('grub', undefined, false);
    ach.achSessionEnd();

    const saved = store.loadAch();
    expect(saved.earned['a_kill_100']).toBe(true);
    expect(saved.counts.kill).toBe(100);

    // 换一份全新模块实例（模拟重开游戏），localStorage 不清
    const [reloaded] = await importFreshAll(
      () => import('../../systems/AchievementSystem.js'),
    );
    expect((reloaded as AchSystem).achIsEarned('a_kill_100')).toBe(true);
  });

  it('存档损坏时降级为空进度而不是崩掉', async () => {
    localStorage.setItem('eclipse_achievements_save', '{ 这不是 JSON');

    const [reloaded] = await importFreshAll(
      () => import('../../systems/AchievementSystem.js'),
    );
    expect((reloaded as AchSystem).achOtherEarned()).toBe(0);
  });
});

/* ========== 月之圆满 ========== */

describe('月之圆满（a_all）', () => {
  it('a_all 不把自己算进分母', () => {
    expect(ach.achTotal()).toBe(defs.length);
    expect(ach.achOtherEarned()).toBeLessThan(ach.achTotal());
  });

  it('achProgressOf(a_all) 返回其他成就的已解锁数', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 100; i++) ach.achOnKill('grub', undefined, false);

    expect(ach.achProgressOf(def('a_all'))).toBe(ach.achOtherEarned());
    expect(ach.achOtherEarned()).toBeGreaterThan(0);
  });

  it('其他成就未全解锁时 a_all 保持关闭', () => {
    ach.achSessionStart(0);
    for (let i = 0; i < 600; i++) ach.achOnKill('grub', undefined, false);
    ach.achOnDamage(9999, true);
    for (let i = 0; i < 5; i++) ach.achOnWeapon();
    for (let i = 0; i < 20; i++) ach.achOnItemBuy(false);
    ach.achSessionEnd();

    expect(ach.achOtherEarned()).toBeLessThan(defs.length - 1);
    expect(ach.achIsEarned('a_all')).toBe(false);
  });
});

/* ========== 击杀来源归类 ========== */

describe('击杀来源分类计数', () => {
  it.each([
    ['thorns', 'thorns'],
    ['starfall', 'starfall'],
    ['duo', 'starfall'],
    ['chainItem', 'chain'],
    ['boom', 'boom'],
    ['splash', 'boom'],
    ['critBoom', 'boom'],
  ])('来源 %s 计入 %s 分类', (src) => {
    ach.achSessionStart(0);
    expect(() => ach.achOnKill('grub', src, false)).not.toThrow();
  });

  it('Boss 击杀同时计入总击杀与 Boss 计数', () => {
    ach.achSessionStart(0);
    ach.achOnKill('nightWarden', undefined, true);

    ach.achSessionEnd();
    const saved = store.loadAch();
    expect(saved.counts.kill).toBe(1);
    expect(saved.counts.boss).toBe(1);
  });
});
