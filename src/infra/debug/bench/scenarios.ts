/* =========================================================
   蚀月远征 · 基准测试：场景定义
   涵盖从空闲到高负载的各类典型游戏状态
   ========================================================= */
import type { BenchScenario } from './types.js';
import { ENEMIES, BOSSES } from '../../../config/index.js';
import { PROJECTILE_POOL, PARTICLE_POOL } from '../../../engine/ecs/entity_pool.js';
import { world } from '../../../engine/ecs/World.js';
import { Position, Health, Renderable, Combat, Timer, Status, Enemy, Velocity } from '../../../engine/ecs/entity_factories.js';
import { eSt, pSt, rSt } from '../../../state/accessors.js';
import { playerState } from '../../../state/player.js';
import { statsState } from '../../../state/stats.js';
import { gameState } from '../../../state/flow.js';
import { stageState } from '../../../state/stage.js';

/* ---------- 内部工具 ---------- */

/** 在指定位置生成一个敌人（从 ENEMIES 定义读取正确外观数据） */
function spawnEnemyAt(type: string, x: number, y: number): void {
  const def = ENEMIES[type];
  if (!def) return;
  const e = world.add('enemies', {
    ...Position(x, y),
    ...Health(def.hp),
    ...Renderable(def.color, def.size),
    ...Combat(def.dmg),
    ...Timer(0, 0),
    ...Status(0, 0, 0, 0),
    ...Enemy(type, false),
    ...Velocity(0, 0),
    spd: def.spd, wob: 1,
    stateT: 0, dead: 0, state: 'chase',
    split: def.split || 0, splitHp: def.splitHp || 0,
    dash: def.dash || 0, projSpd: def.projSpd || 0, projDmg: def.projDmg || 0,
    ranged: def.ranged || false,
  });
  e.maxHp = e.hp;
}

/** 在指定位置生成一个 Boss（从 BOSSES 定义读取正确外观数据） */
function spawnBossAt(type: string, x: number, y: number): void {
  const def = BOSSES[type];
  if (!def) return;
  const e = world.add('enemies', {
    ...Position(x, y),
    ...Health(def.hp),
    ...Renderable(def.color, def.size),
    ...Combat(def.dmg),
    ...Timer(0, 0),
    ...Status(0, 0, 0, 0),
    ...Enemy(type, true),
    ...Velocity(0, 0),
    spd: def.spd, wob: 1,
    stateT: 0, dead: 0, state: 'enter',
    attT: 0, attCd: def.attCd || 3.4,
  });
  e.maxHp = e.hp;
}

/** 生成一个投射物 */
function spawnProjectile(x: number, y: number, vx: number, vy: number, noHit: boolean = true): void {
  const p = PROJECTILE_POOL.add() as any;
  p.x = x; p.y = y;
  p.vx = vx; p.vy = vy;
  p.r = 4; p.dmg = 10; p.t = 0; p.life = 60; p.dead = 0;
  p.speed = 200; p.range = 400; p.width = 4; p.owner = 0;
  if (noHit) p.benchNoHit = true;
  p.color = '#ffd700';
  eSt().projectiles.push(p);
}

/** 生成一个粒子 */
function spawnParticle(x: number, y: number): void {
  const p = PARTICLE_POOL.add() as any;
  p.x = x; p.y = y;
  p.vx = (Math.random() - 0.5) * 100;
  p.vy = (Math.random() - 0.5) * 100;
  p.t = 0; p.max = 30 + Math.random() * 30;
  p.life = 1; p.size = 2 + Math.random() * 3; p.dead = 0;
  p.color = '#ffd700'; p.spark = true;
  eSt().particles.push(p);
}

/** 清理所有实体池 */
function clearAllPools(): void {
  world.resetAll();
  eSt().enemies.length = 0;
  eSt().projectiles.length = 0;
  eSt().particles.length = 0;
  eSt().drops.length = 0;
  eSt().phantoms.length = 0;
}

/** 重置为基准测试专用玩家，避免复用真实局内玩家触发升级/死亡/菜单 */
function ensurePlayer(opts?: { weapons?: { id: string; lv: number }[]; stage?: number }): void {
  const dummy = {
    x: rSt().width / 2, y: rSt().height / 2,
    r: 20, hp: 999999, maxHp: 999999, invuln: 999999,
    facing: 0, spd: 180, speed: 180,
    dmg: 10, dmgMul: 1, atk: 18, atkSpd: 1.15,
    effAtk: 18, effCrit: 0.08, effSpeed: 180, effGold: 1, effAtkSpd: 1.15,
    range: 300, pierce: 0, size: 20, area: 1, duration: 1, cdr: 0, projCount: 0,
    crit: 0, critRate: 0, critDmg: 1.5,
    armor: 0, dodge: 0, regen: 0, lifeSteal: 0, lifesteal: 0,
    xpGain: 0, goldGain: 1, luck: 1,
    weapons: opts?.weapons || [], effects: { weapons: [], items: [], itemStats: {} },
  };
  playerState.patch({ player: dummy as any, weaponCd: {}, weaponCdFull: {} });
  statsState.patch({ xp: 0, level: 1, levelQueue: 0 });
  gameState.patch({ levelUpOpen: false, shopOpen: false });
  stageState.patch({ stage: opts?.stage || 1, stageTime: 0, stageMax: 999999, paused: false, spawnAcc: 0, boss: null });
}

/* ========== 场景定义 ========== */

export const IDLE: BenchScenario = {
  id: 'idle',
  label: '空闲',
  desc: '无敌人、无投射物，仅渲染背景和玩家',
  mode: 'fixed',
  duration: 5,
  warmup: 1,
  setup: () => {
    clearAllPools();
    ensurePlayer();
  },
  teardown: clearAllPools,
};

export const LIGHT: BenchScenario = {
  id: 'light',
  label: '轻负载',
  desc: '10 个普通敌人，模拟前期战斗',
  mode: 'fixed',
  duration: 5,
  warmup: 1,
  setup: () => {
    clearAllPools();
    ensurePlayer();
    const cx = rSt().width / 2, cy = rSt().height / 2;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 150 + Math.random() * 100;
      spawnEnemyAt('grub', cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
    }
  },
  teardown: clearAllPools,
};

export const MEDIUM: BenchScenario = {
  id: 'medium',
  label: '中等负载',
  desc: '30 个敌人（含多种类型）+ 部分投射物，模拟中期战斗',
  mode: 'fixed',
  duration: 5,
  warmup: 1.5,
  setup: () => {
    clearAllPools();
    ensurePlayer();
    const cx = rSt().width / 2, cy = rSt().height / 2;
    const types = ['grub', 'rat', 'charger'];
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2 + Math.random() * 0.3;
      const dist = 120 + Math.random() * 180;
      spawnEnemyAt(types[i % 3], cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
    }
    for (let i = 0; i < 15; i++) {
      spawnProjectile(
        Math.random() * rSt().width, Math.random() * rSt().height,
        (Math.random() - 0.5) * 150, (Math.random() - 0.5) * 150,
      );
    }
  },
  teardown: clearAllPools,
};

export const HEAVY: BenchScenario = {
  id: 'heavy',
  label: '高负载',
  desc: '80 个敌人 + 大量投射物，模拟后期割草场面',
  mode: 'fixed',
  duration: 6,
  warmup: 2,
  setup: () => {
    clearAllPools();
    ensurePlayer();
    const cx = rSt().width / 2, cy = rSt().height / 2;
    const types = ['grub', 'rat', 'charger', 'spitter', 'bomber'];
    for (let i = 0; i < 80; i++) {
      const angle = (i / 80) * Math.PI * 2 + Math.random() * 0.2;
      const dist = 80 + Math.random() * 250;
      spawnEnemyAt(types[i % 5], cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
    }
    for (let i = 0; i < 40; i++) {
      spawnProjectile(
        Math.random() * rSt().width, Math.random() * rSt().height,
        (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200,
      );
    }
  },
  teardown: clearAllPools,
};

export const BOSS: BenchScenario = {
  id: 'boss',
  label: 'Boss 战',
  desc: '1 个大型 Boss + 4 个小兵，模拟 Boss 战场景',
  mode: 'fixed',
  duration: 5,
  warmup: 1.5,
  setup: () => {
    clearAllPools();
    ensurePlayer();
    const cx = rSt().width / 2, cy = rSt().height / 2;
    spawnBossAt('final', cx + 150, cy);
    const offsets = [[-80, -80], [80, -80], [-80, 80], [80, 80]];
    for (const [dx, dy] of offsets) {
      spawnEnemyAt('grub', cx + 150 + dx, cy + dy);
    }
  },
  teardown: clearAllPools,
};

export const PROJECTILE_STORM: BenchScenario = {
  id: 'projectile_storm',
  label: '弹幕风暴',
  desc: '大量投射物在屏幕上飞行，模拟弹幕密集场景',
  mode: 'fixed',
  duration: 5,
  warmup: 1,
  setup: () => {
    clearAllPools();
    ensurePlayer();
    const cx = rSt().width / 2, cy = rSt().height / 2;
    for (let i = 0; i < 120; i++) {
      const angle = (i / 120) * Math.PI * 2;
      const spd = 100 + Math.random() * 150;
      spawnProjectile(cx, cy, Math.cos(angle) * spd, Math.sin(angle) * spd);
    }
  },
  teardown: clearAllPools,
};

export const PARTICLE_FEST: BenchScenario = {
  id: 'particle_fest',
  label: '粒子狂欢',
  desc: '大量粒子效果，模拟技能特效密集场景',
  mode: 'fixed',
  duration: 5,
  warmup: 1,
  setup: () => {
    clearAllPools();
    ensurePlayer();
    for (let i = 0; i < 200; i++) {
      spawnParticle(Math.random() * rSt().width, Math.random() * rSt().height);
    }
  },
  teardown: clearAllPools,
};

export const REAL_MID: BenchScenario = {
  id: 'real_mid',
  label: '真实中期战斗',
  desc: '保留敌人技能、玩家武器、命中、掉落和粒子，模拟中期实战',
  mode: 'simulation',
  duration: 6,
  warmup: 2,
  setup: () => {
    clearAllPools();
    ensurePlayer({ stage: 3, weapons: [{ id: 'moonRing', lv: 3 }, { id: 'crossbow', lv: 3 }, { id: 'frost', lv: 2 }] });
    const cx = rSt().width / 2, cy = rSt().height / 2;
    const types = ['grub', 'rat', 'charger', 'spitter'];
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.2;
      const dist = 140 + Math.random() * 230;
      spawnEnemyAt(types[i % types.length], cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
    }
  },
  teardown: clearAllPools,
};

export const REAL_LATE: BenchScenario = {
  id: 'real_late',
  label: '真实后期战斗',
  desc: '保留完整战斗衍生物，模拟后期高压割草场面',
  mode: 'simulation',
  duration: 6,
  warmup: 2,
  setup: () => {
    clearAllPools();
    ensurePlayer({ stage: 6, weapons: [
      { id: 'moonRing', lv: 5 },
      { id: 'crossbow', lv: 5 },
      { id: 'frost', lv: 4 },
      { id: 'storm', lv: 3 },
    ] });
    const cx = rSt().width / 2, cy = rSt().height / 2;
    const types = ['grub', 'rat', 'charger', 'spitter', 'bomber', 'wing'];
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2 + Math.random() * 0.25;
      const dist = 90 + Math.random() * 310;
      spawnEnemyAt(types[i % types.length], cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
    }
  },
  teardown: clearAllPools,
};

export const REAL_BOSS: BenchScenario = {
  id: 'real_boss',
  label: '真实 Boss 战',
  desc: '保留 Boss 技能、小怪、玩家武器和战斗特效的实战 Boss 场景',
  mode: 'simulation',
  duration: 6,
  warmup: 2,
  setup: () => {
    clearAllPools();
    ensurePlayer({ stage: 9, weapons: [{ id: 'moonRing', lv: 5 }, { id: 'crossbow', lv: 5 }, { id: 'beam', lv: 4 }] });
    const cx = rSt().width / 2, cy = rSt().height / 2;
    spawnBossAt('final', cx + 180, cy);
    const types = ['grub', 'rat', 'spitter'];
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const dist = 130 + Math.random() * 180;
      spawnEnemyAt(types[i % types.length], cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist);
    }
  },
  teardown: clearAllPools,
};

/** 所有场景列表 */
export const ALL_SCENARIOS: BenchScenario[] = [
  IDLE,
  LIGHT,
  MEDIUM,
  HEAVY,
  BOSS,
  PROJECTILE_STORM,
  PARTICLE_FEST,
  REAL_MID,
  REAL_LATE,
  REAL_BOSS,
];
