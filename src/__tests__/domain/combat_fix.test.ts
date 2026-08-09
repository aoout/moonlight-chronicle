/* =========================================================
   domain/combat · oath early return 修复
   ---------------------------------------------------------
   覆盖 hurtPlayer 中 oath 触发后 early return 使 nearDeath
   不再同时触发的修复行为。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { hurtPlayer } from '../../domain/combat.js';
import { installPlayer, makeEnemy, enterPlaying, queueRandom, bindWorld } from '../_harness/index.js';

describe('hurtPlayer · oath early return', () => {
  beforeEach(() => {
    bindWorld();
    enterPlaying();
  });

  it('hurtPlayer 中 oath 触发后 nearDeath 不再同时触发（oath early return 修复）', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.hp = 20;                              // 残血，同时满足 oath 与 nearDeath 条件
    p.effects.oath = 1;
    p.effects.nearDeath = 1;

    // 确保不闪避
    queueRandom(0.999);

    hurtPlayer(makeEnemy(), 500);

    // oath 应触发
    expect(p.hp).toBe(1);
    expect(p.effects.oath).toBe(0);
    // nearDeath 不应被消耗（oath early return 阻止了后续分支）
    expect(p.effects.nearDeath).toBe(1);
    // invuln 来自 oath（1s），不是来自 nearDeath（3s）
    expect(p.invuln).toBeGreaterThanOrEqual(1);
    expect(p.invuln).toBeLessThan(3);
  });

  it('oath 触发后 nearDeath 的回血不应发生', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.hp = 20;
    p.effects.oath = 1;
    p.effects.nearDeath = 1;

    queueRandom(0.999);

    hurtPlayer(makeEnemy(), 500);

    // oath 把 hp 设为 1，nearDeath 的 30% 回血不应发生
    expect(p.hp).toBe(1);
    // 如果 nearDeath 也触发了，hp 会是 20 + 30 = 50
    expect(p.hp).not.toBeGreaterThan(1);
  });
});