// @ts-check
/* =========================================================
   蚀月远征 · ECS System：敌人更新 + 压缩
   包含 enemyTick 函数（从 enemies.js 迁移）
   ========================================================= */
import { System } from '../core/system.js';
import { G } from '../state.js';
import { stageState } from '../state/stage.js';
import { renderState } from '../state/render.js';
import { angTo, dist, clamp } from '../utils.js';
import { CombatSystem } from './CombatSystem.js';
import { bossTick } from '../boss_skills.js';
import { ENEMY_SKILLS } from '../enemy_skills.js';
import { ENEMY_MOVES } from '../enemies/behaviors/index.js';
import { world } from '../ecs/World.js';

/** 便捷引用 */
const gSt = () => stageState.state;
const rSt = () => renderState.state;

/* ---------- 敌人主更新 ---------- */
/** @param {import('../types/core.d.ts').EnemyInstance} e @param {number} dt */
function enemyTick(e, dt) {
  const p = G.player;
  if (!p) return;
  const gs = gSt();
  const slowF = (Math.max(e.slow || 0, e.auraSlow || 0) > 0 || G._echoSlowT > 0)
    ? 1 - Math.max(e.slow || 0, e.auraSlow || 0, G._echoSlowT > 0 ? 0.5 : 0)
    : 1;
  e.t += dt * e.wob;
  if (e.flash > 0) e.flash -= dt;
  if (e.slow > 0) e.slow -= dt;
  if (e.stun > 0) { e.stun -= dt; return; }
  if (e.bleed > 0) {
    e.bleed -= dt;
    e.hp -= 1 + gs.stage * 0.2;
    e.flash = 0.15;
    if (e.hp <= 0) { CombatSystem.killEnemy(e, 'bleed'); return; }
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

  /* 接触伤害（所有敌人共享） */
  if (e.hp > 0 && p.invuln <= 0) {
    const d = dist(e, p);
    if (d < p.r + e.size - 2) {
      CombatSystem.hurtPlayer(e, e.dmg);
      const a = angTo(e, p);
      e.x += Math.cos(a) * 16;
      e.y += Math.sin(a) * 16;
    }
  }
  e.x = clamp(e.x, -40, rSt().width + 40);
  e.y = clamp(e.y, -40, rSt().height + 40);
}

export class EnemySystem extends System {
  name = 'EnemySystem';

  /** @param {number} dt */
  update(dt) {
    for (const e of world.query('enemies')) enemyTick(e, dt);
    world.compact('enemies', /** @param {any} e */ e => e.dead);
  }
}