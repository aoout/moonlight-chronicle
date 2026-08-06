/* =========================================================
   蚀月远征 · 基准测试：共享状态
   用于在 game.ts 与 runner 之间通信
   ========================================================= */

let _active = false;

/** 设置基准测试是否激活（game.ts 据此跳过正常渲染） */
export function setBenchActive(v: boolean): void {
  _active = v;
}

/** 查询基准测试是否激活 */
export function isBenchActive(): boolean {
  return _active;
}