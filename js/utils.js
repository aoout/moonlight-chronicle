/* =========================================================
   蚀月远征 · 工具函数
   ========================================================= */

export const RNG = Math.random;

export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function rand(a, b) { return a + RNG() * (b - a); }
export function pick(arr) { return arr[Math.floor(RNG() * arr.length)]; }
export function angTo(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

/* 原地数组压缩：用双指针将活着的元素移到前方，避免每帧创建新数组导致 GC */
export function _compactArray(arr, isDead, onDead) {
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