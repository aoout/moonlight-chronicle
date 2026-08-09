/* =========================================================
   蚀月远征 · 工具函数
   ========================================================= */

export const RNG = Math.random;

/* ---- 数学常量（统一 π 的各种写法，禁止 6.28 / 6.2832 / 1.57 / 1.5708 等字面量） ---- */
export const TAU = Math.PI * 2;
export const HALF_PI = Math.PI / 2;

interface Point { x: number; y: number; }

export function dist(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
export function distSq(a: Point, b: Point): number { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
export function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
export function rand(a: number, b: number): number { return a + RNG() * (b - a); }
export function pick<T>(arr: T[]): T {
  if (arr.length === 0) throw new Error('pick from empty array');
  return arr[Math.floor(RNG() * arr.length)];
}
export function angTo(a: Point, b: Point): number { return Math.atan2(b.y - a.y, b.x - a.x); }

/**
 * 倒计时递减 + 到点重置（消除各处手写的 `x=(x||n)-dt; if(x<=0){x=n;...}` 重复）。
 * @param cur   当前计数值（首次为 undefined/0 时按 interval 起算）
 * @param interval 重置周期
 * @param dt    帧时间
 * @returns 递减后的计数值，以及是否在本帧到点（到点时 t 已重置为 interval）
 */
export function tickCooldown(cur: number | undefined, interval: number, dt: number): { t: number; fired: boolean } {
  const t = (cur ?? interval) - dt;
  if (t <= 0) return { t: interval, fired: true };
  return { t, fired: false };
}
