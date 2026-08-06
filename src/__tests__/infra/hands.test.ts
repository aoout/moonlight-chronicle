/* =========================================================
   infra/persistence/hands · 记手录
   器物与持握者的相遇次数（跨局累计）。
   深层档案需相伴十次（HANDS_DEEP_THRESHOLD）才显现。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { handsGet, handsAdd, loadHands, HANDS_DEEP_THRESHOLD } from '../../infra/persistence/hands.js';

const KEY = 'eclipse_hands_save';

beforeEach(() => {
  localStorage.removeItem(KEY);
});

describe('记手录 hands', () => {
  it('未选取过返回 0', () => {
    expect(handsGet('weapons', 'moonRing')).toBe(0);
  });

  it('选取一次 +1，并持久化到 localStorage', () => {
    handsAdd('weapons', 'moonRing');
    handsAdd('weapons', 'moonRing');
    expect(handsGet('weapons', 'moonRing')).toBe(2);
    const raw = localStorage.getItem(KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)['weapons']['moonRing']).toBe(2);
  });

  it('不同类目（武器/道具）互不影响', () => {
    handsAdd('weapons', 'moonRing');
    handsAdd('items', 'moonRing');
    expect(handsGet('weapons', 'moonRing')).toBe(1);
    expect(handsGet('items', 'moonRing')).toBe(1);
  });

  it('深层档案阈值 = 10（世界设定：相伴十夜）', () => {
    expect(HANDS_DEEP_THRESHOLD).toBe(10);
  });

  it('损坏存档时安全降级为 0', () => {
    localStorage.setItem(KEY, '{{{');
    expect(handsGet('items', 'hp1')).toBe(0);
    expect(loadHands()).toEqual({});
  });
});
