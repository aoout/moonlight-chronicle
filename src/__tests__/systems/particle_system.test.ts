/* =========================================================
   systems/ParticleSystem · 粒子更新回归（O6 + O8）
   ---------------------------------------------------------
   O6 把粒子更新从视图遍历改成 TypedArray 直读；
   O8 顺带把过期粒子 dead 置 1（供 compact 判定）。
   这里守的三条行为线：
     1. 存活粒子正常推进（t += dt、位移 + 阻尼衰减）
     2. 过期粒子（t >= max）被标记 dead，且不再做运动计算
     3. 直读路径与视图读取路径看到同一份数据（混合访问一致）
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { ParticleSystem } from '../../systems/ParticleSystem.js';
import { PARTICLE_POOL } from '../../engine/ecs/entity_pool.js';
import { resetAllStores } from '../_harness/stores.js';

const DT = 1 / 60;
const system = new ParticleSystem();

/** 塞入一个粒子：数值字段走 TypedArray，color 等动态属性走视图对象 */
function spawnParticle(overrides: Record<string, any> = {}): any {
  const p = PARTICLE_POOL.addWith({
    x: 100, y: 100, vx: 60, vy: -30,
    t: 0, max: 0.7, size: 3, color: '#ff0000',
    ...overrides,
  });
  return p;
}

function poolView() {
  return {
    data: PARTICLE_POOL._data,
    stride: PARTICLE_POOL._stride,
    off: PARTICLE_POOL._offsets,
    count: PARTICLE_POOL.count,
  };
}

function read(i: number, field: string): number {
  const { data, stride, off } = poolView();
  return data[i * stride + off[field]];
}

beforeEach(() => {
  PARTICLE_POOL.reset();
  resetAllStores();
});

describe('ParticleSystem · O6/O8 直读更新', () => {
  it('存活粒子：位置按速度推进，速度按 0.92 阻尼衰减', () => {
    const p = spawnParticle();
    const idx = p._idx;

    system.update(DT);

    // 位移：x += vx*dt = 100 + 60*(1/60) = 101
    expect(read(idx, 'x')).toBeCloseTo(101, 5);
    expect(read(idx, 'y')).toBeCloseTo(99.5, 5);
    // 阻尼：vx = 60 * 0.92 = 55.2
    expect(read(idx, 'vx')).toBeCloseTo(55.2, 5);
    expect(read(idx, 'vy')).toBeCloseTo(-27.6, 5);
    // t 推进
    expect(read(idx, 't')).toBeCloseTo(DT, 5);
    // 未过期 → 不死
    expect(read(idx, 'dead')).toBe(0);
  });

  it('过期粒子（t >= max）被标记 dead，不再做运动计算', () => {
    // max=0.1，一帧后 t=0.0167 未过期；把 max 调小模拟即将过期
    const p = spawnParticle({ max: 0.005 });
    const idx = p._idx;
    const xBefore = read(idx, 'x');

    system.update(DT); // t = 0.0167 >= 0.005 → dead=1

    expect(read(idx, 'dead')).toBe(1);
    // 标记 dead 后跳过运动：x 不应再被推进（停留在 spawn 时的值）
    expect(read(idx, 'x')).toBe(xBefore);
    // 但 t 仍推进（t += dt 在 dead 判定之前）
    expect(read(idx, 't')).toBeCloseTo(DT, 5);
  });

  it('直读路径与视图读取一致（混合访问安全）', () => {
    const p = spawnParticle({ vx: 0, vy: 0, x: 42, y: 24 });
    const idx = p._idx;

    system.update(DT);

    // 视图读到的是直读写进去的同一份数据
    expect(p.x).toBeCloseTo(42, 5);   // vx=0 无位移
    expect(p.y).toBeCloseTo(24, 5);
    expect(p.t).toBeCloseTo(DT, 5);
    // 动态属性（color）不受直读影响
    expect(p.color).toBe('#ff0000');
  });

  it('过期标记后再次 update：t 继续推进（dead 只影响运动计算）', () => {
    // O8 语义：t += dt 在 dead 判定之前无条件执行，
    // 标记 dead 后仅跳过运动计算 —— 这保证 compact 判定与渲染都能读到
    // 一致的「过期后继续增长的 t」，不会出现已死粒子 t 冻结的边界。
    const p = spawnParticle({ max: 0.005 });
    const idx = p._idx;

    system.update(DT); // 第一次：t=0.0167>=0.005 → dead=1
    expect(read(idx, 'dead')).toBe(1);
    const xAfterDead = read(idx, 'x');

    system.update(DT); // 第二次：t 继续 += dt，但运动被跳过

    expect(read(idx, 't')).toBeCloseTo(DT * 2, 5);
    expect(read(idx, 'x')).toBe(xAfterDead); // 位置不再变
  });
});
