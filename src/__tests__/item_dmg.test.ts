import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as any).window = globalThis;
  (globalThis as any).requestAnimationFrame = (cb: any) => 0;
});
import { damageEnemy } from '../domain/combat.js';
import { playerState } from '../state/player.js';
import { statsState } from '../state/stats.js';

function makeP(): any {
  return {
    id: 'p', x: 0, y: 0, r: 16, facing: 0, hp: 100, maxHp: 100, armor: 0,
    atk: 10, speed: 50, dodge: 0, lifesteal: 0, thorns: 0,
    effCrit: 0.1, critDmg: 2, effAtk: 10,
    effects: { itemStats: {} }, weapons: [], level: 1, invuln: 0,
  };
}
function makeE(): any {
  return { x: 0, y: 0, hp: 999999, flash: 0, type: 'grub', dead: 0, dmg: 1, size: 10, boss: false, split: 0 };
}

describe('道具伤害统计归属', () => {
  beforeEach(() => {
    playerState.set('player', makeP());
    statsState.set('runStats', { totalDmg: 0, bossKills: 0, win: false, wDmg: {} });
  });

  it('武器伤害计入 wDmg，道具伤害计入 itemStats', () => {
    const p = playerState.state.player as any;
    damageEnemy(makeE(), 50, false, 'proj', 'moonRing');
    damageEnemy(makeE(), 30, false, 'proj', 'starfall');
    damageEnemy(makeE(), 20, false, 'proj', 'duo');
    damageEnemy(makeE(), 10, false, 'boom');
    const rs = statsState.state.runStats;
    expect(rs.wDmg.moonRing).toBe(50);
    expect(rs.wDmg.starfall).toBeUndefined();
    expect(rs.wDmg.duo).toBeUndefined();
    expect(p.effects.itemStats.starfall.stageDmg).toBe(30);
    expect(p.effects.itemStats.duo.stageDmg).toBe(20);
    expect(p.effects.itemStats.boom.stageDmg).toBe(10);
  });

  it('武器 + 道具占比基底一致且和为 100%', () => {
    const p = playerState.state.player as any;
    damageEnemy(makeE(), 60, false, 'proj', 'moonRing');
    damageEnemy(makeE(), 40, false, 'proj', 'starfall');
    const wTotal = Object.values(statsState.state.runStats.wDmg).reduce((s: number, v: any) => s + v, 0);
    let itemTotal = 0;
    for (const k in p.effects.itemStats) itemTotal += p.effects.itemStats[k].stageDmg;
    expect(wTotal).toBe(60);
    expect(itemTotal).toBe(40);
    expect(wTotal / (wTotal + itemTotal) + itemTotal / (wTotal + itemTotal)).toBe(1);
  });
});
