/* =========================================================
   蚀月远征 · 基准测试：纯统计函数
   不依赖浏览器 API，可在 Node.js 中直接测试
   ========================================================= */
import type { Stats } from './types.js';

/** 计算统计指标 */
export function computeStats(samples: number[]): Stats {
  if (samples.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, p95: 0, p99: 0, stdDev: 0 };
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const n = sorted.length;
  const avg = sorted.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const min = sorted[0];
  const max = sorted[n - 1];
  const p95 = sorted[Math.floor(n * 0.95)];
  const p99 = sorted[Math.floor(n * 0.99)];
  const variance = sorted.reduce((sum, v) => sum + (v - avg) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  return { min, max, avg, median, p95, p99, stdDev };
}