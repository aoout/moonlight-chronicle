/* =========================================================
   蚀月远征 · 特效层：粒子生成（爆点 / 火花 / 冲击环 / 星爆）
   ========================================================= */
import { RNG, rand } from '../../utils.js';
import { world } from '../../ecs/World.js';
import { addDmgNumber } from '../../ui/hud_utils.js';

export function releaseParticle(pa: any): void {
  // 池化粒子由 PARTICLE_POOL 管理，此函数保留调用兼容但无操作
}

export function addFx(pa: any): void {
  const pool = world.getPool('particles'); if (pool && pool.count >= 512) return;
  world.add('particles', pa);
}
export function spawnBurst(x: number, y: number, color: string, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = RNG() * 6.28, sp = rand(30, 130);
    addFx({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.7), max: 0.7, size: rand(1.5, 3.5), color });
  }
}
/* 扩散圆环（冲击波） */
export function spawnRing(x: number, y: number, color: string, max?: number, r1?: number, lw?: number): void {
  addFx({ ring: true, x, y, t: 0, max: max || 0.5, color, r0: 4, r1: r1 || 60, lw: lw || 3 });
}
/* 方向火花（短线段） */
export function spawnSpark(x: number, y: number, color: string, n: number, sp: number): void {
  for (let i = 0; i < n; i++) {
    const a = RNG() * 6.28, s = rand(sp * 0.4, sp);
    addFx({ spark: true, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, max: rand(0.2, 0.4), size: rand(1, 2), color });
  }
}
/* 星形爆点 */
export function spawnStar(x: number, y: number, color: string, size?: number): void {
  addFx({ star: true, x, y, t: 0, max: 0.4, size: size || 10, color });
}
/* 旋转碎片（菱形，旋转飞出） */
export function spawnShard(x: number, y: number, color: string, n: number, sp: number): void {
  for (let i = 0; i < n; i++) {
    const a = RNG() * 6.28, s = rand(sp * 0.35, sp);
    addFx({ shard: true, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      rot: RNG() * 6.28, vr: rand(-9, 9), size: rand(2, 4.5), max: rand(0.35, 0.6), color });
  }
}
/* 流光（沿方向的长条，渐隐） */
export function spawnStreak(x: number, y: number, ang: number, len?: number, w?: number, color?: string, max?: number): void {
  addFx({ streak: true, x, y, ang, len: len || 26, w: w || 2, t: 0, max: max || 0.3, color });
}
/* 光晕（呼吸扩散圆） */
export function spawnGlow(x: number, y: number, size?: number, color?: string, max?: number): void {
  addFx({ glow: true, x, y, t: 0, max: max || 0.5, size: size || 14, color });
}
/* 通用命中特效：爆点 + 白火花 + 冲击环 */
export function spawnImpact(x: number, y: number, color: string, power?: number): void {
  spawnBurst(x, y, color, 4 + (power || 0));
  spawnSpark(x, y, '#ffffff', 2 + (power || 0), 150);
  spawnRing(x, y, color, 0.32, 20 + (power || 0) * 5, 2.2);
}
export function spawnHitFx(x: number, y: number, dmg: number, crit: boolean): void {
  if (Math.random() < 0.5) return;
  addDmgNumber(x + rand(-6, 6), y + rand(-8, 2), Math.round(dmg), crit);
}

/* ---------- 武器系统 ---------- */
