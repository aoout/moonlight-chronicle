// @ts-check
/* =========================================================
   蚀月远征 · ECS System：敌人生成
   敌人生成逻辑 + 静态 spawn 方法
   ========================================================= */
import { System } from '../core/system.js';
import { G } from '../state.js';
import { RNG, rand, pick } from '../utils.js';
import { ENEMIES, BOSSES, CONFIG, enemyScale, levelEnemyScale, stageSpawnRate, stageEnemyPool } from '../data/index.js';
import { ENEMY_POOL, PROJECTILE_POOL } from '../entity_pool.js';
import { codexAdd } from '../codex.js';
import { createEntity, Position, Health, Renderable, Combat, Timer, Status, Enemy, Velocity } from '../ecs/components.js';

export class SpawnSystem extends System {
  name = 'SpawnSystem';

  /** @param {number} dt */
  update(dt) {
    const sRate = stageSpawnRate(G.stage) * (G._timeScale || 1);
    if (!G.boss) {
      G.spawnAcc += sRate * dt;
      while (G.spawnAcc >= 1) {
        G.spawnAcc -= 1;
        SpawnSystem.spawnEnemy(pick(stageEnemyPool(G.stage)));
      }
    }
  }

  /* =============================================================
     静态方法：生成逻辑（从 spawn.js 迁移）
     ============================================================= */

  /** 生成敌人
   * @param {string} type
   * @param {{hpMul?:number}} [opts]
   */
  static spawnEnemy(type, opts) {
    const def = ENEMIES[type];
    codexAdd('enemies', type);
    const sc = enemyScale(G.stage);
    const ls = levelEnemyScale(G.depth);
    const p = G.player;
    const m = 30;
    const side = Math.floor(RNG() * 4);
    let x, y;
    if (side === 0) { x = rand(-m, G.width + m); y = -m; }
    else if (side === 1) { x = rand(-m, G.width + m); y = G.height + m; }
    else if (side === 2) { x = -m; y = rand(-m, G.height + m); }
    else { x = G.width + m; y = rand(-m, G.height + m); }
    const hp = def.hp * sc.hp * (opts && opts.hpMul ? opts.hpMul : 1) * ls.hp * (p && p._enemyHpMul ? p._enemyHpMul : 1);
    const dmg = def.dmg * sc.dmg * ls.dmg * (p && p._enemyDmgMul ? p._enemyDmgMul : 1);
    const e = ENEMY_POOL.addWith(createEntity(
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
    ));
    e.maxHp = e.hp;
    G.enemies.push(e);
    return e;
  }

  /** 生成 Boss
   * @param {string} type
   */
  static spawnBoss(type) {
    const def = BOSSES[type];
    codexAdd('bosses', type);
    const sc = enemyScale(G.stage);
    const ls = levelEnemyScale(G.depth);
    const p = G.player;
    const hp = def.hp * (type === 'final' ? 1.35 : 1) * (1 + (G.stage - 1) * 0.02) * ls.hp * (p && p._enemyHpMul ? p._enemyHpMul : 1);
    const dmg = def.dmg * sc.dmg * ls.dmg * (p && p._enemyDmgMul ? p._enemyDmgMul : 1);
    const e = ENEMY_POOL.addWith(createEntity(
      Position(G.width / 2, -70),
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
    ));
    /** @type {import('../types/core.d.ts').EnemyInstance} */ (e).maxHp = e.hp;
    G.enemies.push(e);
    G.boss = e;
    return e;
  }

  /** 敌人投射物（远射魔等） */
  /** @param {import('../types/core.d.ts').EnemyInstance} e @param {number} ang */
  static spawnEnemyProjectile(e, ang) {
    G.projectiles.push(PROJECTILE_POOL.addWith(createEntity(
      Position(e.x, e.y),
      Velocity(Math.cos(ang) * e.projSpd, Math.sin(ang) * e.projSpd),
      Renderable('#7fd6a4', 5),
      Combat(e.projDmg * enemyScale(G.stage).dmg, 0),
      Timer(0, 4),
      { enemy: true, hit: new Set() }
    )));
  }
}