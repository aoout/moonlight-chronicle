/* =========================================================
   domain/combat · 战斗管线
   ---------------------------------------------------------
   这是全项目最核心也最容易出回归的一块：伤害结算、暴击、护盾、
   闪避、反伤、掉落、死亡流转全在这里。

   概率分支全部用 queueRandom 钉死 —— 「跑一万次看比例」不是测试，
   是抽奖；我们要的是「闪避判定命中时必须走闪避分支」这种确定断言。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  damageEnemy, killEnemy, hurtPlayer, healPlayer, meleeHit, spawnDrop, boomExplosion,
} from '../../domain/combat.js';
import {
  installPlayer, makeEnemy, makeDummy, makeBoss, spawnEnemies, bindWorld,
  enterPlaying, captureEvent, queueRandom,
} from '../_harness/index.js';
import { buildSpatialGrid } from '../../engine/spatial/SpatialSystem.js';
import { entityState } from '../../state/entities.js';
import { statsState } from '../../state/stats.js';
import { stageState } from '../../state/stage.js';
import { STATE, sm } from '../../engine/core/states.js';
import type { Player } from '../../types/core.d.ts';

const runStats = () => statsState.state.runStats;
const itemStat = (p: Player, id: string) => p.effects.itemStats?.[id];

/** 不暴击、不闪避、不触发任何概率词条 —— 随机全部给「不命中」的值 */
const NO_LUCK = 0.999;
function noProc(times = 8): void {
  queueRandom(...new Array(times).fill(NO_LUCK));
}

beforeEach(() => {
  bindWorld();
  enterPlaying();
});

/* =========================================================
   damageEnemy · 伤害结算
   ========================================================= */

describe('damageEnemy · 前置条件', () => {
  it('已死亡的敌人不再吃伤害', () => {
    installPlayer();
    const e = makeEnemy({ hp: 0 });
    damageEnemy(e, 100, false);
    expect(e.hp).toBe(0);
  });

  it('无玩家时安全返回', () => {
    const e = makeDummy();
    expect(() => damageEnemy(e, 100, false)).not.toThrow();
    expect(e.hp).toBe(1e9);
  });
});

describe('damageEnemy · 数值管线', () => {
  it('普通伤害按原值扣血并四舍五入', () => {
    installPlayer();
    const e = makeDummy();
    damageEnemy(e, 49.6, false);
    expect(1e9 - e.hp).toBe(50);
  });

  it('伤害保底 1，不会出现 0 或负数扣血', () => {
    installPlayer();
    const e = makeDummy();
    damageEnemy(e, 0.01, false);
    expect(1e9 - e.hp).toBe(1);
  });

  it('暴击按 critDmg 倍率放大', () => {
    installPlayer({ critDmg: 3 });
    const e = makeDummy();
    damageEnemy(e, 100, true);
    expect(1e9 - e.hp).toBe(300);
  });

  it('lowHpDmg 只在残血（≤30% 上限）时生效', () => {
    const p = installPlayer({ maxHp: 100, lowHpDmg: 1 });

    p.hp = 50;                       // 健康
    const healthy = makeDummy();
    damageEnemy(healthy, 100, false);
    expect(1e9 - healthy.hp).toBe(100);

    p.hp = 30;                       // 残血
    const desperate = makeDummy();
    damageEnemy(desperate, 100, false);
    expect(1e9 - desperate.hp).toBe(200);
  });

  it('fullHpCrit 在满血时按加法叠加暴击率，掷中即暴击', () => {
    installPlayer({ critDmg: 2, effCrit: 0, fullHpCrit: 0.5 });
    const e = makeDummy();

    queueRandom(0);                  // 满血暴击判定必中
    damageEnemy(e, 100, false);

    expect(1e9 - e.hp).toBe(200);
  });

  it('fullHpCrit 掷不中时保持普通伤害', () => {
    installPlayer({ critDmg: 2, effCrit: 0, fullHpCrit: 0.5 });
    const e = makeDummy();

    queueRandom(NO_LUCK);
    damageEnemy(e, 100, false);

    expect(1e9 - e.hp).toBe(100);
  });

  it('moonCrit（将熄之勇）必定暴击且暴伤额外 ×1.5，用后即焚', () => {
    const p = installPlayer({ critDmg: 2 });
    p.effects.moonCrit = 1;

    const first = makeDummy();
    damageEnemy(first, 100, false);
    expect(1e9 - first.hp).toBe(300);        // 100 * 2 * 1.5
    expect(p.effects.moonCrit).toBe(0);

    const second = makeDummy();
    damageEnemy(second, 100, false);
    expect(1e9 - second.hp).toBe(100);       // 蓄力已消耗
  });

  it('horde 按场上敌人数每 10 个叠一层，最多 10 层', () => {
    const p = installPlayer();
    p.effects.horde = 0.1;

    spawnEnemies(...Array.from({ length: 30 }, () => makeEnemy()));
    const e = makeDummy();
    damageEnemy(e, 100, false);
    expect(1e9 - e.hp).toBe(130);            // 3 层 → ×1.3

    spawnEnemies(...Array.from({ length: 200 }, () => makeEnemy()));
    const capped = makeDummy();
    damageEnemy(capped, 100, false);
    expect(1e9 - capped.hp).toBe(200);       // 封顶 10 层 → ×2
  });

  it('lifesteal 按最终伤害比例回血', () => {
    const p = installPlayer({ maxHp: 200, lifesteal: 0.1 });
    p.hp = 100;

    damageEnemy(makeDummy(), 100, false);

    expect(p.hp).toBe(110);
  });

  it('moonWane 把 12% 伤害转成护盾，上限 30', () => {
    const p = installPlayer();
    p.effects.moonWane = 1;

    damageEnemy(makeDummy(), 100, false);
    expect(p.effects.shield).toBeCloseTo(12);

    damageEnemy(makeDummy(), 10000, false);
    expect(p.effects.shield).toBe(30);       // 截顶
  });
});

describe('damageEnemy · 伤害归属统计', () => {
  it('武器伤害进 wDmg，道具伤害进 itemStats（两者互斥，合计 100%）', () => {
    const p = installPlayer();

    damageEnemy(makeDummy(), 50, false, 'proj', 'moonRing');
    damageEnemy(makeDummy(), 30, false, 'proj', 'starfall');
    damageEnemy(makeDummy(), 20, false, 'proj', 'duo');
    damageEnemy(makeDummy(), 10, false, 'boom');

    expect(runStats().wDmg).toEqual({ moonRing: 50 });
    expect(itemStat(p, 'starfall')!.stageDmg).toBe(30);
    expect(itemStat(p, 'duo')!.stageDmg).toBe(20);
    expect(itemStat(p, 'boom')!.stageDmg).toBe(10);
  });

  it('同一武器多次命中累加', () => {
    installPlayer();
    damageEnemy(makeDummy(), 10, false, 'proj', 'moonRing');
    damageEnemy(makeDummy(), 15, false, 'proj', 'moonRing');
    expect(runStats().wDmg.moonRing).toBe(25);
  });

  it('totalDmg 汇总所有来源', () => {
    installPlayer();
    damageEnemy(makeDummy(), 60, false, 'proj', 'moonRing');
    damageEnemy(makeDummy(), 40, false, 'proj', 'starfall');
    expect(runStats().totalDmg).toBe(100);
  });

  it('thorns 来源计入道具统计而非武器', () => {
    const p = installPlayer();
    damageEnemy(makeDummy(), 25, false, 'thorns');

    expect(runStats().wDmg).toEqual({});
    expect(itemStat(p, 'thorns')!.stageDmg).toBe(25);
  });

  it('dmg 与 stageDmg 双轨记录（后者用于单夜结算）', () => {
    const p = installPlayer();
    damageEnemy(makeDummy(), 25, false, 'boom');
    const s = itemStat(p, 'boom')!;
    expect(s.dmg).toBe(25);
    expect(s.stageDmg).toBe(25);
  });
});

describe('damageEnemy · 范围衍生伤害', () => {
  it('splash 溅射对周围敌人造成 60% 伤害且不递归自触发', () => {
    const p = installPlayer();
    p.effects.splash = 1;                    // 必定触发

    const main = makeDummy({ x: 0, y: 0 });
    const near = makeDummy({ x: 30, y: 0 });
    const far = makeDummy({ x: 500, y: 0 });
    spawnEnemies(main, near, far);
    buildSpatialGrid();

    queueRandom(0);                          // splash 判定必中
    damageEnemy(main, 100, false);

    expect(1e9 - main.hp).toBe(100);
    expect(1e9 - near.hp).toBeCloseTo(60);
    expect(far.hp).toBe(1e9);
  });

  it('critBoom 暴击光爆对周围造成 50% 伤害', () => {
    const p = installPlayer({ critDmg: 1 });
    p.effects.critBoom = 1;

    const main = makeDummy({ x: 0, y: 0 });
    const near = makeDummy({ x: 40, y: 0 });
    spawnEnemies(main, near);
    buildSpatialGrid();

    damageEnemy(main, 100, true);

    expect(1e9 - near.hp).toBeCloseTo(50);
  });

  it('splash 自身产生的伤害不会再次触发 splash（srcType 守卫）', () => {
    const p = installPlayer();
    p.effects.splash = 1;

    const a = makeDummy({ x: 0, y: 0 });
    const b = makeDummy({ x: 20, y: 0 });
    spawnEnemies(a, b);
    buildSpatialGrid();

    expect(() => damageEnemy(a, 100, false, 'splash')).not.toThrow();
    expect(b.hp).toBe(1e9);                  // 没有二次溅射
  });
});

describe('damageEnemy · 事件与击杀衔接', () => {
  it('命中广播 combat:hit，负载带上最终伤害与暴击标记', () => {
    installPlayer({ critDmg: 2 });
    const log = captureEvent<{ damage: number; crit: boolean; srcW?: string }>('combat:hit');

    damageEnemy(makeDummy(), 50, true, 'proj', 'moonRing');

    expect(log.last).toMatchObject({ damage: 100, crit: true, srcW: 'moonRing' });
  });

  it('打空血量即触发击杀并广播 enemy:killed', () => {
    installPlayer();
    const log = captureEvent<{ type: string; boss: boolean }>('enemy:killed');
    const e = makeEnemy({ hp: 10, type: 'rat' });

    damageEnemy(e, 999, false);

    expect(e.dead).toBe(1);
    expect(log.last).toMatchObject({ type: 'rat', boss: false });
  });

  it('未致死时不广播击杀', () => {
    installPlayer();
    const log = captureEvent('enemy:killed');
    damageEnemy(makeEnemy({ hp: 100 }), 10, false);
    expect(log.count).toBe(0);
  });
});

/* =========================================================
   killEnemy · 击杀结算
   ========================================================= */

describe('killEnemy', () => {
  it('重复击杀同一敌人只结算一次', () => {
    installPlayer();
    const e = makeEnemy();

    killEnemy(e);
    killEnemy(e);

    expect(statsState.state.kills).toBe(1);
  });

  it('掉落经验与金币各一份', () => {
    installPlayer();
    const before = entityState.state.drops.length;

    killEnemy(makeEnemy({ type: 'grub' }));

    const spawned = entityState.state.drops.slice(before);
    expect(spawned.map((d: any) => d.kind).sort()).toEqual(['gold', 'xp']);
  });

  it('onKillHp 每次击杀回血且不越顶', () => {
    const p = installPlayer({ maxHp: 100, onKillHp: 30 });
    p.hp = 50;

    killEnemy(makeEnemy());
    expect(p.hp).toBe(80);

    killEnemy(makeEnemy());
    expect(p.hp).toBe(100);
  });

  it('moonKill 每三杀蓄一次必爆', () => {
    const p = installPlayer();
    p.effects.moonKill = 1;

    killEnemy(makeEnemy());
    killEnemy(makeEnemy());
    expect(p.effects.moonCrit ?? 0).toBe(0);

    killEnemy(makeEnemy());
    expect(p.effects.moonCrit).toBe(1);
    expect(p.effects.moonKillCount).toBe(0);
  });

  it('devour 额外掉一份经验', () => {
    const p = installPlayer();
    p.effects.devour = 5;
    const before = entityState.state.drops.length;

    killEnemy(makeEnemy());

    const xpDrops = entityState.state.drops.slice(before).filter((d: any) => d.kind === 'xp');
    expect(xpDrops).toHaveLength(2);
  });

  it('hunt 刷新计时并叠层，最多 8 层', () => {
    const p = installPlayer();
    p.effects.hunt = 1;

    for (let i = 0; i < 12; i++) killEnemy(makeEnemy());

    expect(p.effects.huntStacks).toBe(8);
    expect(p.effects.huntTimer).toBe(3);
  });

  it('击杀 Boss 累加 bossKills、清空关卡 Boss 并广播', () => {
    installPlayer();
    const boss = makeBoss({ type: 'behemoth' });
    stageState.set('boss', boss);
    const log = captureEvent<{ type: string }>('boss:killed');

    killEnemy(boss);

    expect(runStats().bossKills).toBe(1);
    expect(stageState.state.boss).toBeNull();
    expect(log.last).toMatchObject({ type: 'behemoth' });
  });

  it('无玩家时只记击杀数，不做后续结算', () => {
    const e = makeEnemy();
    expect(() => killEnemy(e)).not.toThrow();
    expect(statsState.state.kills).toBe(1);
    expect(entityState.state.drops).toHaveLength(0);
  });
});

/* =========================================================
   hurtPlayer · 玩家受伤
   ========================================================= */

describe('hurtPlayer · 免伤前置', () => {
  it('无敌帧内完全免伤', () => {
    const p = installPlayer({ maxHp: 100 });
    p.invuln = 0.5;

    hurtPlayer(makeEnemy(), 50);

    expect(p.hp).toBe(100);
  });

  it('非战斗状态不结算伤害', () => {
    const p = installPlayer({ maxHp: 100 });
    sm.reset();                              // 回到 menu

    hurtPlayer(makeEnemy(), 50);

    expect(p.hp).toBe(100);
  });

  it('隐匿（cloakTimer）期间不可被命中', () => {
    const p = installPlayer({ maxHp: 100 });
    p.effects.cloakTimer = 1;

    hurtPlayer(makeEnemy(), 50);

    expect(p.hp).toBe(100);
  });

  it('闪避判定命中则完全免伤', () => {
    const p = installPlayer({ maxHp: 100, dodge: 0.5 });

    queueRandom(0);                          // 必定闪避
    hurtPlayer(makeEnemy(), 50);

    expect(p.hp).toBe(100);
  });

  it('闪避判定未中则正常吃伤害', () => {
    const p = installPlayer({ maxHp: 100, dodge: 0.5, armor: 0 });

    queueRandom(NO_LUCK);
    hurtPlayer(makeEnemy(), 50);

    expect(p.hp).toBe(50);
  });

  it('cloak 词条在闪避成功后附赠 0.8s 无敌', () => {
    const p = installPlayer({ dodge: 0.5 });
    p.effects.cloak = 1;

    queueRandom(0);
    hurtPlayer(makeEnemy(), 50);

    expect(p.invuln).toBeCloseTo(0.8);
    expect(p.effects.cloakTimer).toBeCloseTo(0.8);
  });
});

describe('hurtPlayer · 减伤与护盾', () => {
  it('护甲按 0.8 系数减伤', () => {
    const p = installPlayer({ maxHp: 100, armor: 25, dodge: 0 });

    noProc();
    hurtPlayer(makeEnemy(), 50);

    expect(p.hp).toBe(100 - (50 - 25 * 0.8));
  });

  it('护甲再高也至少吃 1 点伤害', () => {
    const p = installPlayer({ maxHp: 100, armor: 9999, dodge: 0 });

    noProc();
    hurtPlayer(makeEnemy(), 10);

    expect(p.hp).toBe(99);
  });

  it('护盾优先吸收，吸满则完全免伤', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.effects.shield = 100;

    noProc();
    hurtPlayer(makeEnemy(), 40);

    expect(p.hp).toBe(100);
    expect(p.effects.shield).toBe(60);
  });

  it('护盾不足时只抵消一部分，剩余照常掉血', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.effects.shield = 10;

    noProc();
    hurtPlayer(makeEnemy(), 40);

    expect(p.effects.shield).toBe(0);
    expect(p.hp).toBe(70);
  });

  it('moonWax 受击生成 5% 最大生命护盾并进入 8 秒 CD', () => {
    const p = installPlayer({ maxHp: 200, armor: 0, dodge: 0 });
    p.effects.moonWax = 1;

    noProc();
    hurtPlayer(makeEnemy(), 10);

    expect(p.effects.shield).toBe(10);
    expect(p.effects.moonHurtCd).toBe(8);
  });
});

describe('hurtPlayer · 保命词条', () => {
  it('oath（守月之约）挡下致命伤，留 1 点血并消耗一层', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.hp = 20;
    p.effects.oath = 2;

    noProc();
    hurtPlayer(makeEnemy(), 500);

    expect(p.hp).toBe(1);
    expect(p.effects.oath).toBe(1);
  });

  /* ⚠️ 已知生产缺陷（本用例把现状钉死，改动前先看这段说明）
     combat.ts 的 oath 分支写了 `p.invuln = Math.max(p.invuln, 1)`，
     意图是保命后给 1 秒无敌喘息。但该分支**没有 early return**，
     函数结尾的 `p.invuln = 0.45` 会无条件覆盖掉它 —— 这行意图直接失效。

     对比：nearDeath 分支设完 invuln 就 return，它的 3 秒无敌是生效的。

     这属于数值/手感层面的行为变更，不在「完善测试」的授权范围内，
     故此处只锁定现状。要修就是把 oath 分支也改成 early return，
     届时把下面的期望改回 1。 */
  it('oath 保命后的无敌帧被结尾赋值覆盖，实际只有 0.45s（现状锁定）', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.hp = 20;
    p.effects.oath = 1;

    noProc();
    hurtPlayer(makeEnemy(), 500);

    expect(p.invuln).toBeCloseTo(0.45);
  });

  it('nearDeath（濒死月魄）在跌破 25% 时回血并给 3 秒无敌，只触发一次', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.hp = 40;
    p.effects.nearDeath = 1;

    noProc();
    hurtPlayer(makeEnemy(), 30);

    expect(p.effects.nearDeath).toBe(0);
    expect(p.hp).toBe(70);                   // 40 + 100*0.3
    expect(p.invuln).toBeGreaterThanOrEqual(3);
  });
});

describe('hurtPlayer · 反伤与死亡', () => {
  it('thorns 按受到伤害的比例反弹给攻击者', () => {
    installPlayer({ maxHp: 1000, armor: 0, dodge: 0, thorns: 0.5 });
    const attacker = makeDummy();

    noProc();
    hurtPlayer(attacker, 40);

    expect(1e9 - attacker.hp).toBe(20);
  });

  it('反伤计入 thorns 道具统计', () => {
    const p = installPlayer({ maxHp: 1000, armor: 0, dodge: 0, thorns: 1 });

    noProc();
    hurtPlayer(makeDummy(), 30);

    expect(itemStat(p, 'thorns')!.stageDmg).toBe(30);
  });

  it('血量归零则广播 player:died 并推进到 OVER', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    const log = captureEvent('player:died');

    noProc();
    hurtPlayer(makeEnemy(), 999);

    expect(p.hp).toBe(0);
    expect(log.count).toBe(1);
    expect(sm.current).toBe(STATE.OVER);
  });

  it('受击后进入 0.45s 无敌，连续两次攻击只吃一次', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });

    noProc();
    hurtPlayer(makeEnemy(), 20);
    expect(p.hp).toBe(80);

    noProc();
    hurtPlayer(makeEnemy(), 20);
    expect(p.hp).toBe(80);                   // 被无敌帧挡下
  });
});

/* =========================================================
   healPlayer / meleeHit / spawnDrop
   ========================================================= */

describe('healPlayer', () => {
  it('回血不越过上限', () => {
    const p = installPlayer({ maxHp: 100 });
    p.hp = 90;
    healPlayer(50);
    expect(p.hp).toBe(100);
  });

  it('已死亡时不回血', () => {
    const p = installPlayer({ maxHp: 100 });
    p.hp = 0;
    healPlayer(50);
    expect(p.hp).toBe(0);
  });

  it('回血广播 player:heal', () => {
    const p = installPlayer({ maxHp: 100 });
    p.hp = 50;
    const log = captureEvent<{ amount: number; hp: number }>('player:heal');

    healPlayer(20);

    expect(log.last).toMatchObject({ amount: 20, hp: 70 });
  });
});

describe('meleeHit', () => {
  it('玩家在攻击范围内则受伤', () => {
    const p = installPlayer({ maxHp: 100, armor: 0, dodge: 0 });
    p.x = 0; p.y = 0;

    noProc();
    meleeHit(0, 0, 30, 20);

    expect(p.hp).toBeLessThan(100);
  });

  it('玩家在范围外则毫发无损', () => {
    const p = installPlayer({ maxHp: 100 });
    p.x = 1000; p.y = 1000;

    meleeHit(0, 0, 30, 20);

    expect(p.hp).toBe(100);
  });

  it('mul 倍率放大近战伤害', () => {
    /* createPlayer 用的是 BASE_STATS.hp，覆写 maxHp 不会同步抬 hp，
       所以基准血量要显式给，否则「掉了多少血」算出来是错的 */
    const p = installPlayer({ maxHp: 1000, hp: 1000, armor: 0, dodge: 0 });
    p.x = 0; p.y = 0;

    noProc();
    meleeHit(0, 0, 30, 20, { mul: 3 });

    expect(1000 - p.hp).toBe(60);
  });
});

describe('spawnDrop / boomExplosion', () => {
  it('spawnDrop 把掉落物放进世界', () => {
    installPlayer();
    spawnDrop(12, 34, 'gold', 7);

    const d: any = entityState.state.drops.at(-1);
    /* take 期望是 0 而不是 false：EntityPool 底层用数值列存字段，
       布尔进池即被规约成 0/1。这不是笔误，是池化存储的既定行为。 */
    expect(d).toMatchObject({ x: 12, y: 34, kind: 'gold', amount: 7, take: 0 });
  });

  it('boomExplosion 只炸小怪，跳过 Boss', () => {
    const p = installPlayer({ atk: 100, boom: 1, area: 1 });
    const minion = makeDummy({ x: 10, y: 0 });
    const boss = makeBoss({ x: 20, y: 0, hp: 1e9, maxHp: 1e9 });
    spawnEnemies(minion, boss);
    buildSpatialGrid();

    boomExplosion(0, 0, p);

    expect(minion.hp).toBeLessThan(1e9);
    expect(boss.hp).toBe(1e9);
  });
});
