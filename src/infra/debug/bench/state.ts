/* =========================================================
   蚀月远征 · 基准测试：共享状态
   用于在 game.ts 与 runner 之间通信
   ========================================================= */
import { setFixedLoadProbe } from '../../../engine/env.js';

let _active = false;
let _mode: 'fixed' | 'simulation' = 'fixed';

/** 设置基准测试是否激活（game.ts 据此跳过正常渲染） */
export function setBenchActive(v: boolean): void {
  _active = v;
  if (!v) _mode = 'fixed';
}

/** 查询基准测试是否激活 */
export function isBenchActive(): boolean {
  return _active;
}

export function setBenchMode(mode: 'fixed' | 'simulation'): void {
  _mode = mode;
}

export function getBenchMode(): 'fixed' | 'simulation' {
  return _mode;
}

export function isBenchFixed(): boolean {
  return _active && _mode === 'fixed';
}

export function isBenchSimulation(): boolean {
  return _active && _mode === 'simulation';
}

// 向渲染层注册特效抑制判定：固定负载基准期间不产生运行期特效。
// 渲染层因此无需知道"基准测试"这个概念。
setFixedLoadProbe(isBenchFixed);
