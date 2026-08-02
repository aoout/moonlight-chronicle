/* =========================================================
   蚀月远征 · ECS System：敌人生成
   敌人生成逻辑 + 静态 spawn 方法
   ========================================================= */
import { System } from '../core/system.js';
import { G } from '../state.js';
import { stageState } from '../state/stage.js';
import { renderState } from '../state/render.js';
import { RNG, rand, pick } from '../utils.js';
import { ENEMIES, BOSSES, CONFIG, enemyScale, levelEnemyScale, stageSpawnRate, stageEnemyPool } from '../data/index.js';
import { world } from '../ecs/World.js';
import { codexAdd } from '../persistence/codex.js';
import { createEntity, Position, Health, Renderable, Combat, Timer, Status, Enemy, Velocity } from '../ecs/components.js';
import type { EnemyInstance } from '../types/core.d.ts';

/** 便捷引用 */
const gSt = () => stageState.state;
const rSt = () => renderState.state;

export class SpawnSystem extends System {
  name = 'SpawnSystem';

  update(dt: number): void {
    const gs: any = gSt();
    const sRate = stageSpawnRate(gs.stage) * (G._timeScale || 1);
    if (!gs.boss) {
      stageState.set('spawnAcc', gs.spawnAcc + sRate * dt);
      while (gSt().spawnAcc >= 1) {
        stageState.set('spawnAcc', gSt().spawnAcc - 1);
        SpawnSystem.spawnEnemy(pick(stageEnemyPool(gs.stage)));
      }
    }
  }

  /* =============================================================
     静态方法：生成逻辑（从 spawn.js 迁移）
     ============================================================= */

  /** 生成敌人 */
  static spawnEnemy(type: string, opts?: { hpMul?: number }): EnemyInstance {
    const def = ENEMIES[type];
    const gs: any = gSt();
    const rs: any = rSt();
    codexAdd('enemies', type);
    const sc = enemyScale(gs.stage);
    const ls = levelEnemyScale(gs.depth);
    const p = G.player;
    const m = 30;
    const side = Math.floor(RNG() * 4);
    let x: number, y: number;
    if (side === 0) { x = rand(-m, rs.width + m); y = -m; }
    else if (side === 1) { x = rand(-m, rs.width + m); y = rs.height + m; }
    else if (side === 2) { x = -m; y = rand(-m, rs.height + m); }
    else { x = rs.width + m; y = rand(-m, rs.height + m); }
    const hp = def.hp * sc.hp * (opts && opts.hpMul ? opts.hpMul : 1) * ls.hp * (p && p._enemyHpMul ? p._enemyHpMul : 1);
    const dmg = def.dmg * sc.dmg * ls.dmg * (p && p._enemyDmgMul ? p._enemyDmgMul : 1);
    const e = world.add('enemies', createEntity(
      Position(x, y),
      Health(hp),
      Renderable(def.color, def.size),
      Combat(dmg),
      Timer(RNG() * 6.28, 0),
      Status(0, 0, 0, 0),
      Enemy(type, false),
      Velocity(0, 0),
      {
        spd: def.spd, wob: rand(0.6, 1.4),
        stateT: 0, dead: 0, state: 'chase',
        split: def.split || 0, splitHp: def.splitHp || 0,
        dash: def.dash || 0, projSpd: def.projSpd || 0, projDmg: def.projDmg || 0,
        ranged: def.ranged || false,
      }
    )) as EnemyInstance;
    e.maxHp = e.hp;
    return e;
  }

  /** 生成 Boss */
  static spawnBoss(type: string): EnemyInstance {
    const def = BOSSES[type];
    const gs: any = gSt();
    const rs: any = rSt();
    codexAdd('bosses', type);
    const sc = enemyScale(gs.stage);
    const ls = levelEnemyScale(gs.depth);
    const p = G.player;
    const hp = def.hp * (type === 'final' ? 1.35 : 1) * (1 + (gs.stage - 1) * 0.02) * ls.hp * (p && p._enemyHpMul ? p._enemyHpMul : 1);
    const dmg = def.dmg * sc.dmg * ls.dmg * (p && p._enemyDmgMul ? p._enemyDmgMul : 1);
    const e = world.add('enemies', createEntity(
      Position(rs.width / 2, -70),
      Health(hp),
      Renderable(def.color, def.size),
      Combat(dmg),
      Timer(0, 0),
      Status(0, 0, 0, 0),
      Enemy(type, true),
      Velocity(0, 0),
      {
        stateT: 0, vx: 0, vy: 0, dead: 0,
        spd: def.spd, attT: rand(1, 2), state: 'enter',
        skills: def.skills || ['wave'],
        attCd: def.attCd || 3.4,
      }
    )) as EnemyInstance;
    e.maxHp = e.hp;
    stageState.set('boss', e);
    return e;
  }

  /** 敌人投射物（远射魔等） */
  static spawnEnemyProjectile(e: EnemyInstance, ang: number): void {
    const gs: any = gSt();
    const projSpd = e.projSpd ?? 0;
    const projDmg = e.projDmg ?? 0;
    world.add('projectiles', createEntity(
      Position(e.x, e.y),
      Velocity(Math.cos(ang) * projSpd, Math.sin(ang) * projSpd),
      Renderable('#7fd6a4', 5),
      Combat(projDmg * enemyScale(gs.stage).dmg, 0),
      Timer(0, 4),
      { enemy: true, hit: new Set() }
    ));
  }
}
