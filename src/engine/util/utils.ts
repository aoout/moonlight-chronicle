/* =========================================================
   蚀月远征 · 工具函数
   ========================================================= */

export const RNG = Math.random;

interface Point { x: number; y: number; }

export function dist(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
export function distSq(a: Point, b: Point): number { const dx = a.x - b.x, dy = a.y - b.y; return dx * dx + dy * dy; }
export function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
export function rand(a: number, b: number): number { return a + RNG() * (b - a); }
export function pick<T>(arr: T[]): T { return arr[Math.floor(RNG() * arr.length)]; }
export function angTo(a: Point, b: Point): number { return Math.atan2(b.y - a.y, b.x - a.x); }

