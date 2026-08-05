import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../systems/AchievementSystem.js', () => ({
  achOnItemBuy: vi.fn(), achOnWeapon: vi.fn(), achSessionStart: vi.fn(),
}));
vi.mock('../persistence/codex.js', () => ({
  codexAdd: vi.fn(),
}));

import { purchaseWeapon, upgradeWeaponCmd, purchaseItem } from '../commands/shop.js';
import { createPlayer, addWeapon } from '../domain/player.js';
import { SHOP_ITEMS } from '../data/index.js';
import { playerState } from '../state/player.js';
import { statsState } from '../state/stats.js';

function setupPlayer(): void {
  playerState.set('player', createPlayer());
  addWeapon('moonRing');
  statsState.set('gold', 10);
}

describe('god 模式：无限金币', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    playerState.set('player', null);
  });

  it('正常模式：金币不足时购买失败', () => {
    setupPlayer();
    const r = purchaseWeapon('crossbow', 20);
    expect(r.ok).toBe(false);
    expect(statsState.state.gold).toBe(10);
  });

  it('正常模式：金币足够时正常扣款', () => {
    setupPlayer();
    statsState.set('gold', 50);
    const r = purchaseWeapon('crossbow', 20);
    expect(r.ok).toBe(true);
    expect(statsState.state.gold).toBe(30);
  });

  it('god 模式：金币不足也能购买且不扣款', () => {
    vi.stubGlobal('window', { location: { search: '?dev=1' } });
    setupPlayer();
    const r = purchaseWeapon('crossbow', 20);
    expect(r.ok).toBe(true);
    expect(statsState.state.gold).toBe(10); // 无限金币：不扣
    const p = playerState.state.player!;
    expect(p.weapons.some(w => w.id === 'crossbow')).toBe(true);
  });

  it('god 模式：升级武器与购买道具均不扣款', () => {
    vi.stubGlobal('window', { location: { search: '?dev=1' } });
    setupPlayer();
    const r1 = upgradeWeaponCmd('moonRing', 9999);
    expect(r1.ok).toBe(true);
    const r2 = purchaseItem(SHOP_ITEMS[0], 9999);
    expect(r2.ok).toBe(true);
    expect(statsState.state.gold).toBe(10);
  });
});
