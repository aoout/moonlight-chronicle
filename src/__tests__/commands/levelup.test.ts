/* =========================================================
   commands/levelup · 升级祝福操作
   ---------------------------------------------------------
   封装「施加祝福 + 递减升级队列 + 属性重算 + 队列清空后切回 PLAYING」。
   核心分支：队列还有剩余时不切状态；清空后才 transition。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { applyBlessing } from '../../commands/levelup.js';
import { STATE, sm } from '../../engine/core/states.js';
import { statsState } from '../../state/stats.js';
import { playerState } from '../../state/player.js';
import { installPlayer } from '../_harness/index.js';

beforeEach(() => {
  installPlayer();
  sm.reset(); // → MENU，让「切回 PLAYING」的断言有意义
});

describe('applyBlessing', () => {
  it('无玩家时安全返回，不掷骰子', () => {
    playerState.set('player', null);
    expect(applyBlessing({ apply: () => {} })).toEqual({ ok: false, hasMore: false });
  });

  it('施加祝福、递增属性、递减队列，最后一个时切回 PLAYING', () => {
    const p = playerState.state.player!;
    const before = p.atk;
    statsState.set('levelQueue', 1);

    const r = applyBlessing({ apply: (pl: any) => { pl.atk += 10; } });

    expect(r.ok).toBe(true);
    expect(r.hasMore).toBe(false);
    expect(p.atk).toBe(before + 10); // 祝福确实作用，且 computeDerived 未覆盖基类
    expect(statsState.get('levelQueue')).toBe(0);
    expect(sm.is(STATE.PLAYING)).toBe(true);
  });

  it('队列还有剩余时不切状态，清空后才切回 PLAYING', () => {
    statsState.set('levelQueue', 2);

    const r1 = applyBlessing({ apply: () => {} });
    expect(r1.hasMore).toBe(true);
    expect(statsState.get('levelQueue')).toBe(1);
    expect(sm.is(STATE.MENU)).toBe(true); // 尚未清空，停留在菜单等待下一个祝福

    const r2 = applyBlessing({ apply: () => {} });
    expect(r2.hasMore).toBe(false);
    expect(statsState.get('levelQueue')).toBe(0);
    expect(sm.is(STATE.PLAYING)).toBe(true);
  });
});
