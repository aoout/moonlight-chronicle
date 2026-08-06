/* =========================================================
   测试地基 · 流程与事件
   ---------------------------------------------------------
   状态机与事件总线都是模块级单例，跨用例常驻。
   状态位由 setup.ts 统一重置；这里提供的是「显式摆姿势」和
   「监听事件」两类工具。
   ========================================================= */
import { afterEach, vi } from 'vitest';
import { STATE, sm } from '../../engine/core/states.js';
import { EventBus } from '../../engine/core/event_bus.js';

/**
 * 把状态机推进到「战斗中」。
 *
 * 走的是 menu → playing 这条合法路径，而不是硬改内部字段——
 * 如果哪天转换表把这条路封了，测试应该跟着红，而不是继续假装能玩。
 */
export function enterPlaying(): void {
  if (sm.is(STATE.PLAYING)) return;
  sm.reset();
  const ok = sm.transition(STATE.PLAYING);
  if (!ok) throw new Error('menu → playing 转换失败：状态机转换表被改了？');
}

/**
 * 临时开启开发者（god）模式。
 *
 * isDevMode() 只在 `window` 存在时才去看 URL 与 localStorage，
 * 而测试宿主刻意不提供 window，所以这里补一个最小替身。
 * vitest 配置了 unstubGlobals，用例结束自动还原。
 */
export function enableDevMode(): void {
  vi.stubGlobal('window', { location: { search: '?dev=1' } });
}

export interface EventLog<T = any> {
  /** 收到的事件负载，按发生顺序 */
  readonly payloads: T[];
  /** 收到的次数 */
  readonly count: number;
  /** 最后一次的负载 */
  readonly last: T | undefined;
  /** 提前停止监听 */
  stop(): void;
}

/**
 * 录制某个事件的所有发射，用例结束自动退订。
 *
 * @example
 * const lvl = captureEvent('player:levelup');
 * gainXp(999);
 * expect(lvl.count).toBe(3);
 */
export function captureEvent<T = any>(event: string): EventLog<T> {
  const payloads: T[] = [];
  const off = EventBus.on(event, (d: T) => { payloads.push(d); });
  let stopped = false;
  const stop = () => { if (!stopped) { off(); stopped = true; } };
  afterEach(stop);

  return {
    payloads,
    get count() { return payloads.length; },
    get last() { return payloads[payloads.length - 1]; },
    stop,
  };
}
