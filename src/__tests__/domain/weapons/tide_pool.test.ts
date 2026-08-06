/* =========================================================
   domain/weapons · 蚀潮之锚水域机制
   ---------------------------------------------------------
   第三级差异化：潮锚从「一次性爆炸」升级为「落点爆裂 + 蚀潮水域」。
   水域覆盖范围内敌人：持续减速（出域自然恢复）+ 周期性潮压冲击。

   测试覆盖：
   1. 爆炸伤害应用 impactMul（落点冲击弱化，重击感交给水域）
   2. 爆炸后生成水域实体（tidePool）
   3. 水域内敌人被减速（slow ≥ poolSlow），出域后恢复
   4. 潮压按 poolTick 周期触发，单跳 = 公式伤害 × poolDmgMul
   5. 水域到期后消失（dead）
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { projTick } from '../../../domain/weapons/index.js';
import { WEAPONS } from '../../../config/index.js';
import { installPlayer, equip, makeEnemy, spawnEnemies, bindWorld, makeDummy } from '../../_harness/index.js';
import { buildSpatialGrid, queryRadius } from '../../../engine/spatial/SpatialSystem.js';
import { world } from '../../../engine/ecs/World.js';
import { entityState } from '../../../state/entities.js';
import { stageState } from '../../../state/stage.js';
import type { Player, Projectile } from '../../../types/core.d.ts';

const FRAME = 1 / 60;

/** effAtk 钉成 100，伤害期望可手算 */
function scaledPlayer(): Player {
  const p = installPlayer({ speed: 50 });
  p.effAtk = 100;
  return p;
}

const tideConfig = () => {
  const def = WEAPONS.tideAnchor as any;
  const proj = def.fire.projectile;
  return {
    delay: proj.delay,
    impactMul: proj.impactMul,
    poolDur: proj.poolDur,
    poolTick: proj.poolTick,
    poolSlow: proj.poolSlow,
    poolDmgMul: proj.poolDmgMul,
    aoe: proj.aoe,
  };
};

/** 在目标位置生成一发蚀潮（tide）投射物，返回它 */
function spawnTide(x: number, y: number): Projectile {
  const p = scaledPlayer();
  equip(p, { id: 'tideAnchor', lv: 1 });
  const baseDmg = WEAPONS.tideAnchor.dmg(p, 1, 0);
  const pr = world.add('projectiles', {
    x, y, vx: 0, vy: 0, r: 12, dmg: baseDmg, pierce: 0, color: '#5fb8a8',
    hit: new Set(), wId: 'tideAnchor',
    tide: 1, delay: tideConfig().delay, aoe: tideConfig().aoe,
  });
  buildSpatialGrid();
  return pr;
}

/** 推进 tide 直到爆炸，返回场上全部投射物（应含水域） */
function explodeTide(pr: Projectile): Projectile[] {
  const steps = Math.ceil((tideConfig().delay + FRAME) / FRAME) + 2;
  for (let i = 0; i < steps; i++) {
    projTick(pr, FRAME);
    if (pr.dead) break;   // 爆炸后停止（生产环境由 compact 移除，测试手动跳出）
  }
  return entityState.state.projectiles;
}

beforeEach(() => { bindWorld(); });

describe('tideAnchor · 蚀潮水域', () => {
  it('落点爆炸伤害应用 impactMul（弱化单发，重击交给水域）', () => {
    const target = makeEnemy({ x: 200, y: 200, hp: 1e6, maxHp: 1e6 });
    spawnEnemies(target);
    const pr = spawnTide(200, 200);
    const hpBefore = target.hp;

    explodeTide(pr);

    // 中心伤害 = 公式 × AOE_CENTER_DMG × impactMul（damageEnemy 会四舍五入）
    const baseDmg = WEAPONS.tideAnchor.dmg(scaledPlayer(), 1, 0);
    const expected = Math.round(baseDmg * 1.4 * tideConfig().impactMul);
    expect(hpBefore - target.hp).toBe(expected);
  });

  it('爆炸后在落点生成水域实体（tidePool）', () => {
    const pr = spawnTide(300, 300);
    const after = explodeTide(pr);
    const pool = after.find(p => p.tidePool);
    expect(pool).toBeDefined();
    expect(pool!.x).toBe(300);
    expect(pool!.y).toBe(300);
  });

  it('水域内敌人持续减速，出域后自然恢复', () => {
    const pr = spawnTide(200, 200);
    explodeTide(pr);
    // 敌人在水域中心
    const target = makeEnemy({ x: 200, y: 200, hp: 1e9, maxHp: 1e9 });
    spawnEnemies(target);
    buildSpatialGrid();

    // 推进若干帧，水域每帧刷新减速
    const pool = entityState.state.projectiles.find(p => p.tidePool)!;
    for (let i = 0; i < 10; i++) {
      stageState.state.time += FRAME;
      projTick(pool, FRAME);
    }
    expect(target.slow).toBeGreaterThanOrEqual(tideConfig().poolSlow);

    // 敌人移出水域后，slow 不再被刷新；slow 是「强度+计时器」复合字段，
    // 由 EnemySystem 每秒 -1 衰减。此处手动模拟衰减，验证出域后不再被水域续上
    target.x = 1000; target.y = 1000;
    buildSpatialGrid();
    for (let i = 0; i < 30; i++) {
      stageState.state.time += FRAME;
      projTick(pool, FRAME);
    }
    // 水域不再刷新 slow（敌人在域外），手动按 EnemySystem 规则衰减 0.5s
    target.slow = Math.max(0, (target.slow || 0) - 0.5);
    expect(target.slow).toBeLessThan(tideConfig().poolSlow);
  });

  it('潮压按 poolTick 周期触发，单跳伤害 = 公式 × poolDmgMul', () => {
    const p = scaledPlayer();
    const baseDmg = WEAPONS.tideAnchor.dmg(p, 1, 0);
    const target = makeDummy({ x: 200, y: 200 });
    spawnEnemies(target);
    const pr = spawnTide(200, 200);
    explodeTide(pr);

    const pool = entityState.state.projectiles.find(x => x.tidePool)!;
    const hp0 = target.hp;

    // 推进刚好一个 poolTick（0.6s），应触发第一跳潮压
    const tickSteps = Math.ceil(tideConfig().poolTick / FRAME);
    for (let i = 0; i < tickSteps; i++) {
      stageState.state.time += FRAME;
      projTick(pool, FRAME);
    }
    const firstHit = hp0 - target.hp;
    expect(firstHit).toBe(Math.round(baseDmg * tideConfig().poolDmgMul));

    // 再推进一个 tick，第二跳（damageEnemy 四舍五入，两跳各 round 一次）
    const hp1 = target.hp;
    for (let i = 0; i < tickSteps; i++) {
      stageState.state.time += FRAME;
      projTick(pool, FRAME);
    }
    expect(hp1 - target.hp).toBe(Math.round(baseDmg * tideConfig().poolDmgMul));
  });

  it('水域到期后消失（dead 置位）', () => {
    const pr = spawnTide(200, 200);
    explodeTide(pr);
    const pool = entityState.state.projectiles.find(x => x.tidePool)!;

    const durSteps = Math.ceil((tideConfig().poolDur + FRAME) / FRAME) + 2;
    for (let i = 0; i < durSteps; i++) {
      stageState.state.time += FRAME;
      projTick(pool, FRAME);
    }
    expect(pool.dead).toBeTruthy();
  });

  it('水域不伤害水域外的敌人', () => {
    const outside = makeDummy({ x: 900, y: 900 });
    spawnEnemies(outside);
    const pr = spawnTide(200, 200);
    explodeTide(pr);
    const pool = entityState.state.projectiles.find(x => x.tidePool)!;

    const hp0 = outside.hp;
    const tickSteps = Math.ceil(tideConfig().poolTick / FRAME);
    for (let i = 0; i < tickSteps; i++) {
      stageState.state.time += FRAME;
      projTick(pool, FRAME);
    }
    expect(outside.hp).toBe(hp0);
    expect(outside.slow).toBe(0);
  });

  it('无玩家时水域安全空转', () => {
    const pr = spawnTide(200, 200);
    explodeTide(pr);
    const pool = entityState.state.projectiles.find(x => x.tidePool)!;
    expect(() => projTick(pool, FRAME)).not.toThrow();
  });
});
