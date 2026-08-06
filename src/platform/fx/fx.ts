/* =========================================================
   蚀月远征 · 特效层：粒子生成（爆点 / 火花 / 冲击环 / 星爆）
   ========================================================= */
import { RNG, rand } from '../../engine/util/utils.js';
import { world } from '../../engine/ecs/World.js';
import { EventBus } from '../../engine/core/event_bus.js';
import { settingsState } from '../../state/settings.js';
import { isFixedLoad } from '../../engine/env.js';

const PARTICLE_SOFT_CAP = 220;
const PARTICLE_HARD_CAP = 300;

function particleCaps(): { soft: number; hard: number } {
  const density = settingsState.get('particleDensity');
  return {
    soft: Math.max(40, Math.floor(PARTICLE_SOFT_CAP * density)),
    hard: Math.max(64, Math.floor(PARTICLE_HARD_CAP * density)),
  };
}

function isImportantFx(pa: any): boolean {
  return !!(pa.ring || pa.glow || pa.star || pa.timestop || pa.echo || pa.chain);
}

/** 蚀尘浓度：按粒子密度系数的精确缩放（全局小数累积，避免逐个抽样产生间隙） */
let _densityAcc = 0;
function densityBudget(n: number): number {
  const pool = world.getPool('particles');
  const { soft, hard } = particleCaps();
  if (pool.count >= hard) return 0;
  const pressure = pool.count >= soft ? 0.35 : pool.count >= soft * 0.75 ? 0.65 : 1;
  const m = settingsState.get('particleDensity') * pressure;
  _densityAcc += n * m;
  const out = Math.floor(_densityAcc);
  _densityAcc -= out;
  return out;
}

export function releaseParticle(pa: any): void {
  // 池化粒子由 PARTICLE_POOL 管理，此函数保留调用兼容但无操作
}

export function addFx(pa: any): void {
  // 固定负载基准只测场景 setup 的实体，不允许运行期尾迹/命中/死亡特效污染实体数量。
  if (isFixedLoad()) return;
  const pool = world.getPool('particles');
  const { soft, hard } = particleCaps();
  if (pool && pool.count >= hard) return;
  if (pool && pool.count >= soft && !isImportantFx(pa)) return;
  world.add('particles', pa);
}
export function spawnBurst(x: number, y: number, color: string, n: number): void {
  const budget = densityBudget(n);
  for (let i = 0; i < budget; i++) {
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
  const budget = densityBudget(n);
  for (let i = 0; i < budget; i++) {
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
  const budget = densityBudget(n);
  for (let i = 0; i < budget; i++) {
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
  // 伤害数字是 DOM 层职责，经事件桥转交 UI，canvas 层不直接触碰 DOM
  EventBus.emit('ui:dmgNumber', {
    x: x + rand(-6, 6),
    y: y + rand(-8, 2),
    n: Math.round(dmg),
    crit,
  });
}

/* ---------- 武器系统 ---------- */
