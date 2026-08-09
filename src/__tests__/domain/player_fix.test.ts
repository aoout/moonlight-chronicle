/* =========================================================
   domain/player · gainXp 无限循环保护
   ---------------------------------------------------------
   覆盖 xpNeeded 返回 0 时 while 循环的安全退出分支。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { gainXp } from '../../domain/player.js';
import { installPlayer, enterPlaying } from '../_harness/index.js';
import { statsState } from '../../state/stats.js';

describe('gainXp · 无限循环保护', () => {
  beforeEach(() => { enterPlaying(); });

  it('gainXp 当 xpNeeded 返回 0 时不会无限循环', () => {
    installPlayer();
    // 人为将 xpNeeded 设为 0，触发保护分支
    statsState.set('xpNeeded', 0);
    // 不应死循环
    expect(() => gainXp(100)).not.toThrow();
    // xp 累加了 100，但 xpNeeded=0 导致 while 立即 break，未发生升级
    expect(statsState.state.xp).toBe(100);
    expect(statsState.state.level).toBe(1);
    expect(statsState.state.levelQueue).toBe(0);
  });

  it('gainXp 当 xpNeeded 为负数时也不会无限循环', () => {
    installPlayer();
    statsState.set('xpNeeded', -1);
    expect(() => gainXp(100)).not.toThrow();
    expect(statsState.state.xp).toBe(100);
    expect(statsState.state.level).toBe(1);
  });
});