/* =========================================================
   蚀月远征 · 工具函数
   ========================================================= */

export const RNG = Math.random;

interface Point { x: number; y: number; }

export function dist(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
export function clamp(v: number, lo: number, hi: number): number { return v < lo ? lo : v > hi ? hi : v; }
export function rand(a: number, b: number): number { return a + RNG() * (b - a); }
export function pick<T>(arr: T[]): T { return arr[Math.floor(RNG() * arr.length)]; }
export function angTo(a: Point, b: Point): number { return Math.atan2(b.y - a.y, b.x - a.x); }

/* 原地数组压缩：用双指针将活着的元素移到前方，避免每帧创建新数组导致 GC */
export function _compactArray<T>(
  arr: T[],
  isDead: (item: T) => boolean,
  onDead?: (item: T) => void,
): void {
  let w = 0;
  for (let r = 0; r < arr.length; r++) {
    const item = arr[r];
    if (isDead(item)) {
      if (onDead) onDead(item);
    } else {
      arr[w++] = item;
    }
  }
  arr.length = w;
}
