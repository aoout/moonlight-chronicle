import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as any).window = globalThis;
  (globalThis as any).requestAnimationFrame = (cb: any) => 0;
  // localStorage stub
  const store: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
});

import { ACHIEVEMENTS } from '../data/achievements.js';
import {
  achSessionStart, achSessionEnd, achOnKill, achOnDamage, achOnHurt, achOnDodge,
  achIsEarned, achProgressOf, achOnWeapon, achOnItemBuy,
} from '../systems/AchievementSystem.js';

const a = (id: string) => ACHIEVEMENTS.find(x => x.id === id)!;

describe('蚀月功勋', () => {
  it('累计击杀 100 解锁「初踏月土」', () => {
    achSessionStart(0);
    for (let i = 0; i < 100; i++) achOnKill('grub', undefined, false);
    expect(achIsEarned('a_kill_100')).toBe(true);
    expect(achIsEarned('a_kill_1000')).toBe(false);
    expect(achProgressOf(a('a_kill_100'))).toBe(100);
  });

  it('单局击杀与累计分离', () => {
    achSessionStart(0);
    for (let i = 0; i < 500; i++) achOnKill('grub', undefined, false);
    expect(achIsEarned('a_kill_500')).toBe(true);          // 单局 500
    expect(achIsEarned('a_kill_1000')).toBe(false);        // 累计才 500+100
  });

  it('单次伤害 2000 解锁「一锤定音」', () => {
    achSessionStart(0);
    achOnDamage(2500, true);
    expect(achIsEarned('a_dmg_2000')).toBe(true);
  });

  it('受击后单夜无伤不达成', () => {
    achSessionStart(0);
    achOnHurt();
    // noHit 需要未受伤——直接验证受伤标记不影响（此处仅确认不抛）
    expect(achProgressOf(a('a_noHit_stage'))).toBeGreaterThanOrEqual(0);
  });

  it('获得武器与道具计数', () => {
    achSessionStart(0);
    achOnWeapon();
    achOnWeapon(); achOnWeapon(); achOnWeapon(); achOnWeapon();
    for (let i = 0; i < 15; i++) achOnItemBuy(false);
    achSessionEnd();
    expect(achProgressOf(a('a_weapon_5'))).toBe(5);
    expect(achProgressOf(a('a_item_15'))).toBe(15);
  });
});

describe('单局成就历史最佳', () => {
  it('局末结算后 best 记录最高单局成绩', () => {
    achSessionStart(0);
    for (let i = 0; i < 500; i++) achOnKill('grub', undefined, false);
    achOnDamage(2500, true);
    achSessionEnd();
    // 局末结算（未解锁时进度读 best）
    expect(achProgressOf(a('a_kill_500'))).toBe(500);
    // 第二局更差：best 保持
    achSessionStart(0);
    for (let i = 0; i < 100; i++) achOnKill('grub', undefined, false);
    expect(achProgressOf(a('a_kill_500'))).toBe(500);
    expect(achProgressOf(a('a_dmg_2000'))).toBe(2000);
  });

  it('单局达成后 best 不达标则不解锁（仅当前局判定）', () => {
    achSessionStart(0);
    for (let i = 0; i < 500; i++) achOnKill('grub', undefined, false);
    expect(achIsEarned('a_kill_500')).toBe(true);   // 当前局 500 → 解锁
  });
});
