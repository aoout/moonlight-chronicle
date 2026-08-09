/* =========================================================
   state/flow · setEchoSlow
   ---------------------------------------------------------
   覆盖 setEchoSlow 正确设置 _echoSlowT 的修复行为。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { gameState, setEchoSlow } from '../../state/flow.js';

describe('setEchoSlow', () => {
  beforeEach(() => {
    // setup.ts 的 resetAllStores 会重置 gameState，但为明确起见显式重置
    gameState.reset();
  });

  it('setEchoSlow(3) 正确设置 _echoSlowT 为 3', () => {
    expect(gameState.get('_echoSlowT')).toBe(0);
    setEchoSlow(3);
    expect(gameState.get('_echoSlowT')).toBe(3);
  });

  it('setEchoSlow(0) 将 _echoSlowT 设为 0', () => {
    gameState.set('_echoSlowT', 5);
    setEchoSlow(0);
    expect(gameState.get('_echoSlowT')).toBe(0);
  });
});