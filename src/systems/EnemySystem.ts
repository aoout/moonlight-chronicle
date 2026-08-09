/* =========================================================
   蚀月远征 · ECS System：敌人更新 + 压缩
   包含 enemyTick 函数（从 enemies.js 迁移）
   ========================================================= */
import { System } from '../engine/core/system.js';
import { angTo, dist, clamp } from '../engine/util/utils.js';
import { killEnemy, hurtPlayer } from '../domain/combat.js';
import { bossTick } from '../domain/enemies/boss_skills.js';
import { ENEMY_SKILLS } from '../domain/enemies/skills.js';
import { ENEMY_MOVES } from '../domain/enemies/behaviors/index.js';
import { world } from '../engine/ecs/World.js';
import { ENEMY_POOL } from '../engine/ecs/entity_pool.js';
import { isFixedLoad } from '../engine/env.js';
import type { EnemyInstance } from '../types/core.d.ts';

import { gSt, rSt, pSt, gmSt } from '../state/accessors.js';

/* ---------- 敌人主更新 ----------
 * O9：热字段全部直读 TypedArray（与视图 getter 共享同一 _data 内存，
 * 混合安全）。行为函数 / 技能 / combat 仍收视图对象，内部访问自动落到
 * 同一内存。视图只用于动态属性（type/boss/state）与外部函数参数。
 */
function enemyTick(
  e: EnemyInstance,
  dt: number,
  data: Float64Array,
  base: number,
  off: Record<string, number>,
): void {
  const p = pSt().player;
  if (!p) return;
  const gs: any = gSt();
  const slow = data[base + off.slow] || 0;
  const auraSlow = data[base + off.auraSlow] || 0;
  const slowF = (slow > 0 || auraSlow > 0 || gmSt()._echoSlowT > 0)
    ? 1 - Math.max(slow, auraSlow, gmSt()._echoSlowT > 0 ? 0.5 : 0)
    : 1;
  data[base + off.t] += dt * data[base + off.wob];
  if (data[base + off.flash] > 0) data[base + off.flash] -= dt;
  if (data[base + off.slow] > 0) data[base + off.slow] -= dt;
  if (data[base + off.stun] > 0) { data[base + off.stun] -= dt; return; }

  // 固定负载基准：只保留稳定的基础移动，禁用技能/伤害/击杀衍生物，避免实体数漂移
  if (isFixedLoad()) {
    ENEMY_MOVES._default(e, dt, p, slowF);
    data[base + off.x] = clamp(data[base + off.x], -40, rSt().width + 40);
    data[base + off.y] = clamp(data[base + off.y], -40, rSt().height + 40);
    return;
  }

  if (data[base + off.bleed] > 0) {
    data[base + off.bleed] -= dt;
    data[base + off.hp] -= 1 + gs.stage * 0.2;
    data[base + off.flash] = 0.15;
    if (data[base + off.hp] <= 0) { killEnemy(e, 'bleed'); return; }
  }
  const type = e.type || '';
  const skill = ENEMY_SKILLS[type];
  if (skill && skill(e, dt, p)) return;

  /* 通过行为注册表调度移动 */
  if (e.boss) {
    bossTick(e, dt);
  } else {
    const moveFn = ENEMY_MOVES[type] || ENEMY_MOVES._default;
    moveFn(e, dt, p, slowF);
  }

  /* 接触伤害（所有敌人共享；冲刺中的 Boss 接触伤害 -12%） */
  if (data[base + off.hp] > 0 && p.invuln <= 0) {
    const d = dist(e, p);
    if (d < p.r + data[base + off.size] - 2) {
      hurtPlayer(e, e.state === 'dashMove' ? data[base + off.dmg] * 0.88 : data[base + off.dmg]);
      const a = angTo(e, p);
      data[base + off.x] += Math.cos(a) * 16;
      data[base + off.y] += Math.sin(a) * 16;
    }
  }
  data[base + off.x] = clamp(data[base + off.x], -40, rSt().width + 40);
  data[base + off.y] = clamp(data[base + off.y], -40, rSt().height + 40);
}

export class EnemySystem extends System {
  name = 'EnemySystem';

  update(dt: number): void {
    const pool = ENEMY_POOL;
    const data = pool._data;
    const stride = pool._stride;
    const off = pool._offsets;
    const views = pool._views;
    let dirty = false;
    // killEnemy 仅设置 e.dead=1 不修改 pool.count，因此循环不会越界；
    // 但每次迭代检查 pool.count 增强防御性，避免未来改动引入新问题。
    for (let i = 0; i < pool.count; i++) {
      const base = i * stride;
      if (data[base + off.dead]) { dirty = true; continue; }
      const e = views[i];
      enemyTick(e, dt, data, base, off);
      if (data[base + off.dead]) dirty = true;
    }
    if (dirty) world.markCompactDirty('enemies');
  }
}
