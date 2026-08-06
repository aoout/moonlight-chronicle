/* =========================================================
   测试地基 · 类型安全的测试数据
   =========================================================

   替代此前散落在 5 个测试文件里的 `function makeP(): any`。

   那种写法的根本问题是返回 `any`：Player 有约 50 个必填字段，
   手抄的 fixture 只填了 15 个，靠 `as any` 蒙混过关。
   于是源类型加字段、改语义时，测试**不会变红** —— 它测的是一个
   现实中不存在的对象形状，给出的绿灯是假的。

   这里的做法：
   - 玩家直接复用生产的 `createPlayer()`，字段永远同步；
   - 敌人/投射物由真实的 E_SCHEMA / P_SCHEMA 生成，schema 加字段自动跟上；
   - 全部返回精确类型，overrides 走 `Partial<T>`，写错字段名当场编译失败。
   ========================================================= */
import { createPlayer, computeDerived } from '../../domain/player.js';
import { E_SCHEMA, P_SCHEMA, D_SCHEMA } from '../../engine/ecs/entity_pool.js';
import { playerState } from '../../state/player.js';
import { entityState } from '../../state/entities.js';
import { statsState } from '../../state/stats.js';
import { world } from '../../engine/ecs/World.js';
import type { Player, EnemyInstance, Projectile, Drop, WeaponInstance } from '../../types/core.d.ts';

/** 按 schema 把所有数值字段铺成 0，与实体池 TypedArray 的初始状态一致 */
function zeroed(schema: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of schema) out[k] = 0;
  return out;
}

/* ---------- 玩家 ---------- */

/**
 * 一个属性齐全、派生值已计算好的玩家。
 *
 *   makePlayer()                          // 基础属性的标准玩家
 *   makePlayer({ atk: 100, critRate: 1 }) // 必定暴击的高攻玩家
 *
 * 注意 overrides 在 computeDerived 之前生效，所以改 atk 会正确反映到 effAtk。
 */
export function makePlayer(overrides: Partial<Player> = {}): Player {
  const p = createPlayer();
  Object.assign(p, overrides);
  p.effects ??= {};
  return computeDerived(p);
}

/** 造一个玩家并装进 playerState —— 绝大多数领域测试的起手式 */
export function installPlayer(overrides: Partial<Player> = {}): Player {
  const p = makePlayer(overrides);
  playerState.set('player', p);
  return p;
}

/** 给玩家装备武器（同时初始化冷却表，与 addWeapon 的副作用对齐） */
export function equip(p: Player, ...weapons: Array<string | WeaponInstance>): Player {
  for (const w of weapons) {
    const inst: WeaponInstance = typeof w === 'string' ? { id: w, lv: 1 } : w;
    p.weapons.push(inst);
    playerState.state.weaponCd[inst.id] = 0;
  }
  return p;
}

/* ---------- 敌人 ---------- */

/** schema 字段全 0，再叠一层「活着的普通敌人」的合理默认值 */
export function makeEnemy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
  return {
    ...zeroed(E_SCHEMA),
    hp: 100,
    maxHp: 100,
    size: 10,
    dmg: 5,
    spd: 60,
    type: 'grub',
    color: '#8a8',
    state: 'chase',
    boss: false,
    hit: new Set<string>(),
    ...overrides,
  } as unknown as EnemyInstance;
}

/** 血量高到打不死的靶子：测伤害统计时不希望中途死亡改变分支 */
export function makeDummy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
  return makeEnemy({ hp: 1e9, maxHp: 1e9, ...overrides });
}

export function makeBoss(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
  return makeEnemy({
    hp: 5000,
    maxHp: 5000,
    size: 30,
    dmg: 20,
    boss: true,
    type: 'behemoth',
    attCd: 3.4,
    ...overrides,
  });
}

/* ---------- 投射物 ---------- */

export function makeProjectile(overrides: Partial<Projectile> = {}): Projectile {
  return {
    ...zeroed(P_SCHEMA),
    r: 4,
    dmg: 10,
    life: 2,
    speed: 300,
    range: 400,
    color: '#fff',
    hit: new Set<EnemyInstance>(),
    ...overrides,
  } as unknown as Projectile;
}

/* ---------- 掉落物 ---------- */

export function makeDrop(overrides: Partial<Drop> = {}): Drop {
  return {
    ...zeroed(D_SCHEMA),
    amount: 1,
    kind: 'gold',
    ...overrides,
  } as unknown as Drop;
}

/* ---------- 场景装配 ---------- */

/**
 * 把 World 绑到 entityState 的真实实体列表。
 *
 * 为什么需要显式调用：World 持有的是**列表引用**，生产环境由 main.ts
 * 在启动时 init 一次。单测里 store 每个用例都会重置成新数组，World 还
 * 攥着上一轮的旧引用 —— 于是 buildSpatialGrid() 扫的是空列表，
 * queryRadius 永远查不到测试刚放进去的敌人，症状是「伤害莫名其妙不生效」。
 *
 * 凡是走 queryRadius / nearestInGrid 的测试（范围伤害、索敌、环绕武器）
 * 都要在 beforeEach 里调一次。
 */
export function bindWorld(): void {
  const e = entityState.state;
  world.init({
    enemies: e.enemies,
    projectiles: e.projectiles,
    drops: e.drops,
    particles: e.particles,
    phantoms: e.phantoms,
  });
}

/** 把敌人放进实体列表并返回它们，便于链式断言 */
export function spawnEnemies(...enemies: EnemyInstance[]): EnemyInstance[] {
  entityState.state.enemies.push(...enemies);
  return enemies;
}

export function spawnProjectiles(...projectiles: Projectile[]): Projectile[] {
  entityState.state.projectiles.push(...projectiles);
  return projectiles;
}

/** 重置本局统计，避免伤害数字跨用例累加 */
export function resetRunStats(): void {
  statsState.set('runStats', { totalDmg: 0, bossKills: 0, win: false, wDmg: {} });
}
