/* =========================================================
   蚀月远征 · Headless 压测：场景定义
   ---------------------------------------------------------
   为什么要重做一套场景，而不直接用 infra/debug/bench/scenarios？

   实测发现原有场景测不到"后期"：
     · fixed 模式把伤害和技能全关了，敌人永远不死，
       负载确实稳定 —— 但稳定在一个游戏里不存在的状态；
     · simulation 模式放开战斗后，玩家几秒内把敌人清空，
       REAL_LATE 跑到采样阶段场上只剩 11~27 只，
       测出来的"后期战斗"比中期还轻。

   真实后期的特征是**持续高压**：敌人源源不断涌入，玩家不停清场，
   场上实体数在高位动态平衡。所以这里引入 sustain 模式：
   每帧把敌人补足到目标水位，让负载稳定在"后期最坏情况"，
   同时保留完整的战斗、掉落与特效链路。
   ========================================================= */

/* ---------- 确定性随机 ----------
   场景布局若用 Math.random()，两次跑分的实体分布就不一样，
   于是「快了 3%」里混进了不可控的场景差异 —— 回归门禁会被自己的
   噪声反复误报。这里用固定种子的 mulberry32，
   每个场景 setup 前重置，保证同一场景每次跑的初始局面逐帧一致。
   注意：游戏内部的 RNG 自有种子机制，这里只管压测夹具。 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEED = 0x5eed1e;
let rnd = mulberry32(SEED);
/** 重置夹具随机源，使场景可复现 */
export function resetFixtureRng() { rnd = mulberry32(SEED); }

/**
 * 构建场景集合。
 * @param {object} m 已通过 Vite SSR 加载的游戏模块集合
 */
export function buildScenarios(m) {
  const {
    ENEMIES, BOSSES, world, entityFactories,
    eSt, rSt, playerState, statsState, gameState, stageState,
    PROJECTILE_POOL, PARTICLE_POOL,
  } = m;

  const { Position, Health, Renderable, Combat, Timer, Status, Enemy, Velocity } = entityFactories;

  /* ---------- 实体构造工具 ---------- */

  function spawnEnemyAt(type, x, y, hpMul = 1) {
    const def = ENEMIES[type];
    if (!def) return null;
    const e = world.add('enemies', {
      ...Position(x, y),
      ...Health(def.hp * hpMul),
      ...Renderable(def.color, def.size),
      ...Combat(def.dmg),
      ...Timer(rnd() * 6.28, 0),
      ...Status(0, 0, 0, 0),
      ...Enemy(type, false),
      ...Velocity(0, 0),
      spd: def.spd, wob: 0.6 + rnd() * 0.8,
      stateT: 0, dead: 0, state: 'chase',
      split: def.split || 0, splitHp: def.splitHp || 0,
      dash: def.dash || 0, projSpd: def.projSpd || 0, projDmg: def.projDmg || 0,
      ranged: def.ranged || false,
    });
    e.maxHp = e.hp;
    return e;
  }

  function spawnBossAt(type, x, y) {
    const def = BOSSES[type];
    if (!def) return null;
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
      skills: def.skills || ['wave'],
    });
    e.maxHp = e.hp;
    return e;
  }

  function spawnProjectile(x, y, vx, vy, noHit = true) {
    const p = PROJECTILE_POOL.add();
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.r = 4; p.dmg = 10; p.t = 0; p.life = 60; p.dead = 0;
    p.speed = 200; p.range = 400; p.width = 4; p.owner = 0;
    if (noHit) p.benchNoHit = true;
    p.color = '#ffd700';
    eSt().projectiles.push(p);
  }

  function spawnParticle(x, y) {
    const p = PARTICLE_POOL.add();
    p.x = x; p.y = y;
    p.vx = (rnd() - 0.5) * 100;
    p.vy = (rnd() - 0.5) * 100;
    p.t = 0; p.max = 30 + rnd() * 30;
    p.life = 1; p.size = 2 + rnd() * 3; p.dead = 0;
    p.color = '#ffd700'; p.spark = true;
    eSt().particles.push(p);
  }

  function clearAll() {
    world.resetAll();
    const es = eSt();
    es.enemies.length = 0;
    es.projectiles.length = 0;
    es.particles.length = 0;
    es.drops.length = 0;
    es.phantoms.length = 0;
  }

  /** 安装一个不会死、不会升级的压测专用玩家 */
  function ensurePlayer(opts = {}) {
    const dummy = {
      x: rSt().width / 2, y: rSt().height / 2,
      r: 20, hp: 999999, maxHp: 999999, invuln: 999999,
      facing: 0, spd: 180, speed: 180,
      dmg: 10, dmgMul: 1, atk: opts.atk ?? 18, atkSpd: 1.15,
      effAtk: opts.atk ?? 18, effCrit: 0.08, effSpeed: 180, effGold: 1, effAtkSpd: 1.15,
      range: 300, pierce: 0, size: 20, area: 1, duration: 1, cdr: 0, projCount: 0,
      crit: 0, critRate: 0, critDmg: 1.5,
      armor: 0, dodge: 0, regen: 0, lifeSteal: 0, lifesteal: 0,
      xpGain: 0, goldGain: 1, luck: 1,
      weapons: opts.weapons || [],
      effects: { weapons: [], items: [], itemStats: {} },
    };
    playerState.patch({ player: dummy, weaponCd: {}, weaponCdFull: {} });
    statsState.patch({ xp: 0, level: 1, levelQueue: 0 });
    gameState.patch({ levelUpOpen: false, shopOpen: false });
    stageState.patch({
      stage: opts.stage || 1, stageTime: 0, stageMax: 999999,
      paused: false, spawnAcc: 0, boss: null,
    });
  }

  /** 环形铺开一批敌人 */
  function ring(count, types, minR, maxR, hpMul = 1) {
    const cx = rSt().width / 2, cy = rSt().height / 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rnd() * 0.25;
      const d = minR + rnd() * (maxR - minR);
      spawnEnemyAt(types[i % types.length], cx + Math.cos(a) * d, cy + Math.sin(a) * d, hpMul);
    }
  }

  /**
   * sustain 钩子：每帧把敌人补足到目标水位。
   * 从屏幕边缘补员，贴合真实生成逻辑（敌人从场外涌入）。
   */
  function makeSustain(target, types, hpMul) {
    return () => {
      const list = eSt().enemies;
      let alive = 0;
      for (let i = 0; i < list.length; i++) if (!list[i].dead) alive++;
      let need = target - alive;
      if (need <= 0) return;
      // 单帧补员上限，避免清场瞬间一次性灌入造成人为尖峰
      if (need > 8) need = 8;
      const w = rSt().width, h = rSt().height, mg = 30;
      for (let i = 0; i < need; i++) {
        const side = (rnd() * 4) | 0;
        let x, y;
        if (side === 0) { x = rnd() * (w + mg * 2) - mg; y = -mg; }
        else if (side === 1) { x = rnd() * (w + mg * 2) - mg; y = h + mg; }
        else if (side === 2) { x = -mg; y = rnd() * (h + mg * 2) - mg; }
        else { x = w + mg; y = rnd() * (h + mg * 2) - mg; }
        spawnEnemyAt(types[(rnd() * types.length) | 0], x, y, hpMul);
      }
    };
  }

  const T_BASIC = ['grub', 'rat'];
  const T_MIXED = ['grub', 'rat', 'charger', 'spitter'];
  const T_LATE = ['grub', 'rat', 'charger', 'spitter', 'bomber', 'wing'];

  const LATE_WEAPONS = [
    { id: 'moonRing', lv: 5 },
    { id: 'crossbow', lv: 5 },
    { id: 'frost', lv: 4 },
    { id: 'storm', lv: 3 },
  ];

  /* ---------- 场景表 ---------- */

  /** @type {Array<object>} */
  const scenarios = [
    {
      id: 'idle',
      label: '空闲',
      desc: '无实体，仅背景与玩家 —— 测渲染底噪',
      mode: 'fixed',
      tags: ['baseline'],
      frames: 400,
      warmup: 80,
      setup: () => { clearAll(); ensurePlayer(); },
      teardown: clearAll,
    },
    {
      id: 'mid_fixed',
      label: '中期·固定',
      desc: '30 敌固定负载，用于对比优化的纯增量效果',
      mode: 'fixed',
      tags: ['fixed'],
      frames: 400,
      warmup: 100,
      setup: () => {
        clearAll(); ensurePlayer();
        ring(30, T_MIXED, 120, 300);
      },
      teardown: clearAll,
    },
    {
      id: 'heavy_fixed',
      label: '高负载·固定',
      desc: '80 敌 + 40 弹固定负载，稳定实体数便于回归对比',
      mode: 'fixed',
      tags: ['fixed'],
      frames: 400,
      warmup: 100,
      setup: () => {
        clearAll(); ensurePlayer();
        ring(80, T_LATE, 80, 330);
        for (let i = 0; i < 40; i++) {
          spawnProjectile(
            rnd() * rSt().width, rnd() * rSt().height,
            (rnd() - 0.5) * 200, (rnd() - 0.5) * 200,
          );
        }
      },
      teardown: clearAll,
    },
    {
      id: 'particle_fest',
      label: '粒子狂欢',
      desc: '200 粒子，隔离测量粒子系统与粒子渲染',
      mode: 'fixed',
      tags: ['fixed'],
      frames: 400,
      warmup: 80,
      setup: () => {
        clearAll(); ensurePlayer();
        for (let i = 0; i < 200; i++) {
          spawnParticle(rnd() * rSt().width, rnd() * rSt().height);
        }
      },
      teardown: clearAll,
    },

    /* ===== 持续高压：真正的后期负载 ===== */
    {
      id: 'late_80',
      label: '后期·80水位',
      desc: '维持 80 敌的持续战斗，满武器、完整掉落与特效链路',
      mode: 'sustain',
      tags: ['late', 'sustain'],
      frames: 500,
      warmup: 150,
      setup: () => {
        clearAll();
        ensurePlayer({ stage: 12, atk: 40, weapons: LATE_WEAPONS });
        ring(80, T_LATE, 100, 340, 3);
      },
      sustain: makeSustain(80, T_LATE, 3),
      teardown: clearAll,
    },
    {
      id: 'late_150',
      label: '后期·150水位',
      desc: '维持 150 敌 —— 20 关满生成率下的现实高压',
      mode: 'sustain',
      tags: ['late', 'sustain'],
      frames: 500,
      warmup: 150,
      setup: () => {
        clearAll();
        ensurePlayer({ stage: 18, atk: 60, weapons: LATE_WEAPONS });
        ring(150, T_LATE, 80, 380, 4);
      },
      sustain: makeSustain(150, T_LATE, 4),
      teardown: clearAll,
    },
    {
      id: 'late_250',
      label: '后期·250水位',
      desc: '维持 250 敌的极端压力，用于探测崩溃点与扩展性',
      mode: 'sustain',
      tags: ['late', 'sustain', 'stress'],
      frames: 400,
      warmup: 120,
      setup: () => {
        clearAll();
        ensurePlayer({ stage: 20, atk: 80, weapons: LATE_WEAPONS });
        ring(250, T_LATE, 60, 420, 5);
      },
      sustain: makeSustain(250, T_LATE, 5),
      teardown: clearAll,
    },
    {
      id: 'late_boss',
      label: '后期·Boss+群怪',
      desc: 'Boss 技能全开 + 维持 60 小怪，最复杂的混合负载',
      mode: 'sustain',
      tags: ['late', 'sustain', 'boss'],
      frames: 450,
      warmup: 150,
      setup: () => {
        clearAll();
        ensurePlayer({ stage: 20, atk: 60, weapons: LATE_WEAPONS });
        const cx = rSt().width / 2, cy = rSt().height / 2;
        spawnBossAt('final', cx + 180, cy);
        ring(60, T_MIXED, 120, 340, 4);
      },
      sustain: makeSustain(61, T_MIXED, 4),
      teardown: clearAll,
    },
    {
      id: 'drop_flood',
      label: '掉落堆积',
      desc: '玩家静止不拾取，掉落物持续累积 —— 复现长时间挂机的退化',
      mode: 'sustain',
      tags: ['late', 'sustain', 'edge'],
      frames: 450,
      warmup: 100,
      setup: () => {
        clearAll();
        // 玩家移到角落，远离掉落物，让掉落自然堆积
        ensurePlayer({ stage: 16, atk: 70, weapons: LATE_WEAPONS });
        const p = m.pSt().player;
        p.x = 40; p.y = 40;
        ring(100, T_LATE, 200, 420, 2);
      },
      sustain: makeSustain(100, T_LATE, 2),
      teardown: clearAll,
    },
  ];

  return scenarios;
}
