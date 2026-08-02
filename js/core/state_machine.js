/* =========================================================
   蚀月远征 · 状态机
   统一管理游戏状态流转，替代散落的 G.state = xxx
   ========================================================= */

/**
 * 状态机示例：
 *   const sm = new StateMachine({
 *     initial: 'MENU',
 *     states: {
 *       MENU: { transitions: ['PLAYING'] },
 *       PLAYING: { transitions: ['LEVELUP', 'SHOP', 'OVER', 'WIN'] },
 *       LEVELUP: { transitions: ['PLAYING'] },
 *       SHOP: { transitions: ['PLAYING'] },
 *       OVER: { transitions: ['RESULT'] },
 *       WIN: { transitions: ['RESULT'] },
 *       RESULT: { transitions: ['MENU'] },
 *     }
 *   });
 */
export class StateMachine {
  constructor(config) {
    this._current = config.initial;
    this._config = config;
    this._hooks = {};        // state → { onEnter: [], onExit: [] }
    this._globalHooks = [];  // { from, to, fn }
  }

  get current() { return this._current; }

  /** 注册状态进入钩子 */
  onEnter(state, fn) {
    (this._hooks[state] ||= { onEnter: [], onExit: [] }).onEnter.push(fn);
  }

  /** 注册状态离开钩子 */
  onExit(state, fn) {
    (this._hooks[state] ||= { onEnter: [], onExit: [] }).onExit.push(fn);
  }

  /** 注册任意转换钩子（from/to 可设为 '*' 通配） */
  onTransition(from, to, fn) {
    this._globalHooks.push({ from, to, fn });
  }

  /** 尝试状态转换 */
  transition(to, data) {
    const from = this._current;
    const stateDef = this._config.states[from];
    if (!stateDef || !stateDef.transitions.includes(to)) {
      console.warn(`[StateMachine] 非法转换: ${from} → ${to}`);
      return false;
    }
    // 执行 onExit
    const fromHooks = this._hooks[from];
    if (fromHooks) for (const fn of fromHooks.onExit) fn(data);
    this._current = to;
    // 执行全局钩子（此时 sm.current 已更新为新状态）
    for (const h of this._globalHooks) {
      if ((h.from === '*' || h.from === from) && (h.to === '*' || h.to === to)) {
        h.fn(data);
      }
    }
    // 执行 onEnter
    const toHooks = this._hooks[to];
    if (toHooks) for (const fn of toHooks.onEnter) fn(data);
    return true;
  }

  /** 检查当前状态 */
  is(state) { return this._current === state; }

  /** 检查是否能转换到目标状态 */
  can(to) {
    const stateDef = this._config.states[this._current];
    return !!(stateDef && stateDef.transitions.includes(to));
  }
}