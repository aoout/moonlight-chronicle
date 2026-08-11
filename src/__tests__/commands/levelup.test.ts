/* =========================================================
   commands/levelup · 升级祝福操作
   ---------------------------------------------------------
   封装「施加祝福 + 递减升级队列 + 属性重算」。
   resolvePick 不再负责切回 PLAYING —— 升级面板关闭前世界保持
   LEVELUP 冻结（否则选完轮盘、结果展示期间怪物继续行动）；
   切回由 resumeAfterLevelUp()（面板 _close 时）执行。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { applyBlessing, resumeAfterLevelUp } from '../../commands/levelup.js';
import { STATE, sm } from '../../engine/core/states.js';
import { statsState } from '../../state/stats.js';
import { playerState } from '../../state/player.js';
import { installPlayer } from '../_harness/index.js';
import type { BlessingDef } from '../../types/core.d.ts';

beforeEach(() => {
  installPlayer();
  sm.reset(); // → MENU
});

/** 构造一个最小完整 BlessingDef（applyBlessing 已收口为 BlessingDef 类型） */
const mkBlessing = (apply: (p: any) => void): BlessingDef => ({
  id: 'test', name: '测试祝福', icon: 'x', tier: 'common', weight: 1, desc: '', apply,
});

describe('applyBlessing', () => {
  it('无玩家时安全返回，不掷骰子', () => {
    playerState.set('player', null);
    expect(applyBlessing(mkBlessing(() => {}))).toEqual({ ok: false, hasMore: false });
  });

  it('施加祝福、递增属性、递减队列；队列清空不切状态（由面板关闭时切回）', () => {
    const p = playerState.state.player!;
    const before = p.atk;
    statsState.set('levelQueue', 1);

    const r = applyBlessing(mkBlessing(pl => { pl.atk += 10; }));

    expect(r.ok).toBe(true);
    expect(r.hasMore).toBe(false);
    expect(p.atk).toBe(before + 10); // 祝福确实作用，且 computeDerived 未覆盖基类
    expect(statsState.get('levelQueue')).toBe(0);
    expect(sm.is(STATE.PLAYING)).toBe(false); // 仍冻结，等面板关闭
  });

  it('队列还有剩余时不切状态', () => {
    statsState.set('levelQueue', 2);

    const r1 = applyBlessing(mkBlessing(() => {}));
    expect(r1.hasMore).toBe(true);
    expect(statsState.get('levelQueue')).toBe(1);
    expect(sm.is(STATE.MENU)).toBe(true); // 尚未清空，停留在菜单等待下一个祝福

    const r2 = applyBlessing(mkBlessing(() => {}));
    expect(r2.hasMore).toBe(false);
    expect(statsState.get('levelQueue')).toBe(0);
    expect(sm.is(STATE.PLAYING)).toBe(false); // 冻结保持，等待面板关闭
  });
});

describe('resumeAfterLevelUp', () => {
  const toLevelUp = () => { sm.transition(STATE.PLAYING); sm.transition(STATE.LEVELUP); };

  it('队列清空且处于 LEVELUP 时切回 PLAYING', () => {
    toLevelUp();
    statsState.set('levelQueue', 0);
    resumeAfterLevelUp();
    expect(sm.is(STATE.PLAYING)).toBe(true);
  });

  it('队列仍有剩余时不切回（多级升级，面板会重建）', () => {
    toLevelUp();
    statsState.set('levelQueue', 1);
    resumeAfterLevelUp();
    expect(sm.is(STATE.LEVELUP)).toBe(true);
  });

  it('非 LEVELUP 状态时幂等', () => {
    statsState.set('levelQueue', 0);
    resumeAfterLevelUp();
    expect(sm.is(STATE.MENU)).toBe(true); // 未进入 LEVELUP，不做任何事
  });
});
