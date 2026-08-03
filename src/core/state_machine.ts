/* =========================================================
   蚀月远征 · 状态机
   统一管理游戏状态流转
   ========================================================= */

interface StateConfig {
  transitions: string[];
  [key: string]: any;
}

interface StateMachineConfig {
  initial: string;
  states: Record<string, StateConfig>;
}

interface Hook {
  onEnter: Array<(data?: any) => void>;
  onExit: Array<(data?: any) => void>;
}

interface GlobalHook {
  from: string;
  to: string;
  fn: (data?: any) => void;
}

export class StateMachine {
  private _current: string;
  private _config: StateMachineConfig;
  private _hooks: Record<string, Hook> = {};
  private _globalHooks: GlobalHook[] = [];

  constructor(config: StateMachineConfig) {
    this._current = config.initial;
    this._config = config;
  }

  get current(): string { return this._current; }

  /** 注册状态进入钩子 */
  onEnter(state: string, fn: (data?: any) => void): void {
    (this._hooks[state] ||= { onEnter: [], onExit: [] }).onEnter.push(fn);
  }

  /** 注册状态离开钩子 */
  onExit(state: string, fn: (data?: any) => void): void {
    (this._hooks[state] ||= { onEnter: [], onExit: [] }).onExit.push(fn);
  }

  /** 注册任意转换钩子（from/to 可设为 '*' 通配） */
  onTransition(from: string, to: string, fn: (data?: any) => void): void {
    this._globalHooks.push({ from, to, fn });
  }

  /** 尝试状态转换 */
  transition(to: string, data?: any): boolean {
    const from = this._current;
    const stateDef = this._config.states[from];
    if (!stateDef || !stateDef.transitions.includes(to)) {
      console.warn(`[StateMachine] 非法转换: ${from} → ${to}`);
      return false;
    }
    const fromHooks = this._hooks[from];
    if (fromHooks) for (const fn of fromHooks.onExit) fn(data);
    this._current = to;
    for (const h of this._globalHooks) {
      if ((h.from === '*' || h.from === from) && (h.to === '*' || h.to === to)) {
        h.fn(data);
      }
    }
    const toHooks = this._hooks[to];
    if (toHooks) for (const fn of toHooks.onEnter) fn(data);
    return true;
  }

  /** 检查当前状态 */
  is(state: string): boolean { return this._current === state; }

  /** 检查是否能转换到目标状态 */
  can(to: string): boolean {
    const stateDef = this._config.states[this._current];
    return !!(stateDef && stateDef.transitions.includes(to));
  }
}
