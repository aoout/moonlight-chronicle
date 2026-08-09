/* =========================================================
   engine/state_machine · 目标状态验证修复
   ---------------------------------------------------------
   覆盖 transition 中目标状态存在性检查的分支。
   ========================================================= */
import { describe, it, expect, vi } from 'vitest';
import { StateMachine } from '../../engine/core/state_machine.js';

describe('StateMachine · 目标状态验证', () => {
  it('transition 到不存在的目标状态返回 false 并打印警告', () => {
    const sm = new StateMachine({
      initial: 'a',
      states: {
        a: { transitions: ['b', 'nonexistent'] },
        b: { transitions: ['a'] },
      },
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // 'nonexistent' 在 a 的 transitions 列表中，但 states 中没有定义
    const result = sm.transition('nonexistent');
    expect(result).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('不存在');
    warn.mockRestore();
  });

  it('transition 到不存在的目标状态时控制台警告包含目标状态名', () => {
    const sm = new StateMachine({
      initial: 'a',
      states: {
        a: { transitions: ['missing'] },
      },
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sm.transition('missing');
    expect(warn.mock.calls[0][0]).toMatch(/missing/);
    warn.mockRestore();
  });

  it('transition 到存在的目标状态成功', () => {
    const sm = new StateMachine({
      initial: 'a',
      states: {
        a: { transitions: ['b'] },
        b: { transitions: ['a'] },
      },
    });
    const result = sm.transition('b');
    expect(result).toBe(true);
    expect(sm.current).toBe('b');
  });
});