/* =========================================================
   蚀月远征 · ECS System：粒子更新 + 压缩
   ========================================================= */
import { System } from '../engine/core/system.js';
import { PARTICLE_POOL } from '../engine/ecs/entity_pool.js';

export class ParticleSystem extends System {
  name = 'ParticleSystem';

  /**
   * 直读 TypedArray 的粒子更新（O6 + O8）。
   *
   * 原实现走 `world.query('particles')` 视图遍历：每个粒子要经过
   * `pa.t / pa.vx / pa.x ...` 六次 getter 代理。后期粒子池顶满 512 时
   * 每帧就是几千次视图访问 —— 这是 O1 之后仍然残留的头号 getter 热点。
   *
   * 这里直接从池的 Float64Array 读，一次 base 计算取全部字段。
   * O8：粒子原本从不标记 dead（compact 用 `t >= max` 判定，每实体 2 次
   * getter）；现在 update 顺带把过期粒子 dead 置 1 —— 既省去死粒子的
   * 运动计算，也让 World.compactAll 的判定从 2 次 getter 降到 1 次。
   * 行为与旧实现完全一致（vx 是 schema 字段，`pa.vx !== undefined` 恒真）。
   */
  update(dt: number): void {
    const pool = PARTICLE_POOL;
    const data = pool._data;
    const stride = pool._stride;
    const off = pool._offsets;
    const count = pool.count;
    const oT = off.t, oMax = off.max, oX = off.x, oY = off.y, oVX = off.vx, oVY = off.vy, oDead = off.dead;

    for (let i = 0; i < count; i++) {
      const base = i * stride;
      const t = data[base + oT] + dt;
      data[base + oT] = t;
      // 过期粒子：标记 dead（供 compact 判定），跳过运动计算
      if (t >= (data[base + oMax] || 0.7)) { data[base + oDead] = 1; continue; }
      data[base + oX] += data[base + oVX] * dt;
      data[base + oY] += data[base + oVY] * dt;
      data[base + oVX] *= 0.92;
      data[base + oVY] *= 0.92;
    }
  }
}
