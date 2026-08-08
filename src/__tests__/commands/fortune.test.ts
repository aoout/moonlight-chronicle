/* =========================================================
   commands/fortune · 命运轮盘四种操作
   ---------------------------------------------------------
   随机拨动（+1 月契）/ 强化（2 月契，三类效果）/
   踢格替代（3 月契）/ 月轮（5 月契，清屏回血）
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  installPlayer, resetAllStores, bindWorld, spawnEnemies, makeEnemy, queueRandom,
} from '../_harness/index.js';
import {
  spinWheelTake, sieveTake, enhanceBlessingCmd, swapBlessingCmd, castMoonWheelCmd, currentMoonPacts,
} from '../../commands/fortune.js';
import { fortuneState } from '../../state/fortune.js';
import { statsState } from '../../state/stats.js';
import { playerState } from '../../state/player.js';
import { entityState } from '../../state/entities.js';
import {
  buildWheel, blessingById, ENHANCE_EPIC_GOLD, ENHANCE_EPIC_PACTS,
} from '../../domain/fortune_wheel.js';
import { BLESSINGS } from '../../config/blessings.js';
import type { WheelSlot } from '../../domain/fortune_wheel.js';
import { STATE, sm } from '../../engine/core/states.js';

beforeEach(() => {
  resetAllStores();
  installPlayer();
  sm.reset();
});

describe('操作 1 · 随机拨动', () => {
  it('无玩家时安全返回', () => {
    playerState.set('player', null);
    const r = spinWheelTake();
    expect(r.ok).toBe(false);
    expect(currentMoonPacts()).toBe(0);
  });

  it('传入非法落点下标时回退到随机转动', () => {
    statsState.set('levelQueue', 1);
    const slots = buildWheel(1);
    const r = spinWheelTake(slots, 999); /* 越界 → spinWheel 兜底 */
    expect(r.ok).toBe(true);
    expect(r.slot).toBeGreaterThanOrEqual(0);
  });

  it('轮盘出现未知祝福 id 时按空转处理，不抛错', () => {
    statsState.set('levelQueue', 1);
    const r = spinWheelTake([{ kind: 'blessing' as const, blessingId: 'no_such_blessing' }], 0);
    expect(r.ok).toBe(true);
    expect(r.kind).toBe('blank');
  });

  it('队列清空时：+1 月契、递减队列（切回 PLAYING 由面板关闭时执行）', () => {
    statsState.set('levelQueue', 1);
    const p = playerState.state.player!;
    const before = p.maxHp;
    const r = spinWheelTake();
    expect(r.ok).toBe(true);
    expect(r.spinPacts).toBe(1);
    expect(currentMoonPacts()).toBe(1);
    expect(statsState.get('levelQueue')).toBe(0);
    expect(sm.is(STATE.PLAYING)).toBe(false); // 世界冻结保持 LEVELUP，面板关闭才恢复
    /* 拨动必然获得祝福或蚀格补偿之一；若命中祝福，属性应变化 */
    void before;
  });

  it('命中蚀格：补偿金币，且队列照常递减', () => {
    statsState.set('levelQueue', 1);
    const goldBefore = statsState.get('gold');
    /* 构造一个必落蚀格的轮盘 */
    const slots = [
      { kind: 'blank' as const },
      { kind: 'blessing' as const, blessingId: 'b_hp' },
    ];
    const r = spinWheelTake(slots, 0); /* prevIdx=0 → 蚀格 */
    expect(r.kind).toBe('blank');
    expect(statsState.get('gold')).toBeGreaterThan(goldBefore);
    expect(statsState.get('levelQueue')).toBe(0);
  });

  it('队列有剩余时不切状态', () => {
    statsState.set('levelQueue', 2);
    const r = spinWheelTake();
    expect(r.hasMore).toBe(true);
    expect(sm.is(STATE.PLAYING)).toBe(false);
  });

  it('传入预构建轮盘与落点 → 结果与落点一致（动画与结果同源）', () => {
    statsState.set('levelQueue', 1);
    const slots = buildWheel(1);
    /* 找到轮盘上第一个祝福格的 index */
    const bidx = slots.findIndex(s => s.kind === 'blessing');
    const r = spinWheelTake(slots, bidx);
    expect(r.kind).toBe('blessing');
    expect(r.id).toBe(slots[bidx].blessingId);
  });
});

describe('操作 2 · 强化', () => {
  it('未知祝福 id 失败', () => {
    fortuneState.set('moonPacts', 10);
    expect(enhanceBlessingCmd('no_such_blessing').ok).toBe(false);
  });

  it('花 2 月契打印记；余额不足失败', () => {
    const p = playerState.state.player!;
    const slots = buildWheel(1);
    const bid = slots.find(s => s.kind === 'blessing')!.blessingId!;

    expect(enhanceBlessingCmd(bid).ok).toBe(false); /* 无月契 */

    /* 先攒月契 */
    statsState.set('levelQueue', 1);
    spinWheelTake();
    expect(currentMoonPacts()).toBe(1);
    /* 手工补到 2 */
    fortuneState.set('moonPacts', 2);

    const r = enhanceBlessingCmd(bid);
    expect(r.ok).toBe(true);
    expect(currentMoonPacts()).toBe(0);
    expect(fortuneState.get('enhanced')[bid]).toBe(true);
    void p;
  });

  it('同一种祝福只能强化一次', () => {
    const slots = buildWheel(1);
    const bid = slots.find(s => s.kind === 'blessing')!.blessingId!;
    fortuneState.set('moonPacts', 10);
    expect(enhanceBlessingCmd(bid).ok).toBe(true);
    expect(enhanceBlessingCmd(bid).ok).toBe(false);
  });

  it('common 强化：被获得时效果翻倍（apply 两次）', () => {
    /* 构造轮盘：唯一祝福格是 common 月髓（+12 生命） */
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_hp' },
      { kind: 'blank' as const },
    ];
    fortuneState.set('moonPacts', 10);
    expect(enhanceBlessingCmd('b_hp').ok).toBe(true);

    const p = playerState.state.player!;
    const before = p.maxHp;
    statsState.set('levelQueue', 1);
    const r = spinWheelTake(slots, 0);
    expect(r.id).toBe('b_hp');
    expect(p.maxHp).toBe(before + 24); /* 12×2 */
  });

  it('common 强化：已持有的旧加成不翻倍，仅之后新获得的翻倍（用户裁定）', () => {
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_hp' },
      { kind: 'blank' as const },
    ];
    const p = playerState.state.player!;
    const before = p.maxHp;
    /* 强化前先获得一份月髓（+12，旧加成） */
    statsState.set('levelQueue', 2);
    spinWheelTake(slots, 0);
    expect(p.maxHp).toBe(before + 12);

    /* 强化 → 旧份数不变 */
    fortuneState.set('moonPacts', 2);
    const r = enhanceBlessingCmd('b_hp');
    expect(r.ok).toBe(true);
    expect(p.maxHp).toBe(before + 12);

    /* 强化后再获得一份 → 新获得的翻倍（+24） */
    spinWheelTake(slots, 0);
    expect(p.maxHp).toBe(before + 12 + 24);
  });

  it('epic 强化：被轮盘选中时 +1 月契 +20 金币', () => {
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_critdmg' }, /* epic */
      { kind: 'blank' as const },
    ];
    fortuneState.set('moonPacts', 10);
    expect(enhanceBlessingCmd('b_critdmg').ok).toBe(true);

    const pactsBefore = currentMoonPacts();
    const goldBefore = statsState.get('gold');
    statsState.set('levelQueue', 1);
    const r = spinWheelTake(slots, 0);
    expect(r.id).toBe('b_critdmg');
    expect(currentMoonPacts()).toBe(pactsBefore + ENHANCE_EPIC_PACTS + 1); /* 强化奖励 + 拨动附赠 */
    expect(statsState.get('gold')).toBe(goldBefore + ENHANCE_EPIC_GOLD);
  });

  it('legend 强化：被轮盘选中时三连抽，且连抽不递归（不再触发强化效果）', () => {
    /* 轮盘 = 强化 legend + 祝福 + 蚀格；连抽 rng 全命中 b_atk */
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_moonwall' }, /* legend */
      { kind: 'blessing' as const, blessingId: 'b_atk' },
      { kind: 'blank' as const },
    ];
    fortuneState.set('moonPacts', 10);
    expect(enhanceBlessingCmd('b_moonwall').ok).toBe(true);

    const p = playerState.state.player!;
    const atkBefore = p.atk;
    statsState.set('levelQueue', 1);
    /* 主转用 prevIdx=0（不消耗 rng）；连抽 3 次各调一次 rng → 全落 b_atk（权重区间 3/23~17/23） */
    queueRandom(0.5, 0.5, 0.5);
    const r = spinWheelTake(slots, 0);
    expect(r.id).toBe('b_moonwall');
    expect(r.chainNames).toHaveLength(3);
    expect(r.chainNames).toEqual(['锋芒', '锋芒', '锋芒']);
    expect(p.atk).toBe(atkBefore + 3 * 2); /* 三次连抽各 +2 */
    /* 强化 legend 只被获得一次（不递归）——以 levelQueue 只减 1 为证 */
    expect(statsState.get('levelQueue')).toBe(0);
  });
});

describe('操作 3 · 踢格替代', () => {
  it('花 3 月契：踢掉格子，轮盘外祝福降临并立即生效，完成升级', () => {
    const slots = buildWheel(1);
    const kick = slots.find(s => s.kind === 'blessing')!.blessingId!;
    const onWheel = slots.filter(s => s.kind === 'blessing').map(s => s.blessingId!);
    fortuneState.set('moonPacts', 5);
    statsState.set('levelQueue', 1);

    const r = swapBlessingCmd(kick, slots);
    expect(r.ok).toBe(true);
    expect(r.granted!.kind).toBe('blessing');
    expect(onWheel).not.toContain(r.granted!.id); /* 来自轮盘外 */
    expect(currentMoonPacts()).toBe(2);
    expect(statsState.get('levelQueue')).toBe(0);
    expect(r.hasMore).toBe(false);
    expect(r.slots!.some(s => s.blessingId === r.granted!.id)).toBe(true); /* 新祝福上盘 */
  });

  it('踢蚀格：蚀格被消灭，替代祝福占用空位', () => {
    const slots = buildWheel(1);
    fortuneState.set('moonPacts', 3);
    statsState.set('levelQueue', 1);
    const r = swapBlessingCmd('blank', slots);
    expect(r.ok).toBe(true);
    expect(r.slots!.some(s => s.kind === 'blank')).toBe(false);
  });

  it('余额不足 / 不在盘上的格子：失败且不扣月契', () => {
    const slots = buildWheel(1);
    /* 余额不足 */
    expect(swapBlessingCmd(slots.find(s => s.kind === 'blessing')!.blessingId!, slots).ok).toBe(false);
    /* 不在盘上的祝福：从池外挑一个必不在盘上的 id */
    fortuneState.set('moonPacts', 5);
    const onWheel = slots.filter(s => s.kind === 'blessing').map(s => s.blessingId!);
    const outside = BLESSINGS.find(b => !onWheel.includes(b.id))!.id;
    const rKick = swapBlessingCmd(outside, slots);
    expect(rKick.ok).toBe(false);
    expect(rKick.reason).toBe('kick');
    expect(currentMoonPacts()).toBe(5); /* 未扣 */
    void rKick;
  });

  it('无玩家时安全返回', () => {
    playerState.set('player', null);
    const slots = buildWheel(1);
    expect(swapBlessingCmd(slots.find(s => s.kind === 'blessing')!.blessingId!, slots).ok).toBe(false);
  });

  it('祝福池为空（全部祝福都在盘上）时失败', () => {
    const p = playerState.state.player!;
    void p;
    const allIds = BLESSINGS.map(b => b.id);
    /* 构造 11 祝福 + 1 蚀格，让 substitute 池最小化：直接用一个 12 祝福槽构造非法场景
       —— 传 18 个全 id，onWheel 覆盖全池时替代失败 */
    fortuneState.set('moonPacts', 5);
    statsState.set('levelQueue', 1);
    const slots: WheelSlot[] = allIds.map(id => ({ kind: 'blessing' as const, blessingId: id }));
    const r = swapBlessingCmd('b_hp', slots);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('pool');
  });
});

describe('操作 4 · 月轮', () => {
  it('花 5 月契：对全场造成 10×攻击力固定伤害，并回复生命至 80%', () => {
    bindWorld();
    installPlayer({ atk: 100, maxHp: 200, hp: 40 }); /* 20% —— 应回满到 160 */
    const p = playerState.state.player!;
    const e1 = makeEnemy({ hp: 500, maxHp: 500 });
    const e2 = makeEnemy({ hp: 800, maxHp: 800 });
    spawnEnemies(e1, e2);

    fortuneState.set('moonPacts', 5);
    statsState.set('levelQueue', 1);
    const r = castMoonWheelCmd();
    expect(r.ok).toBe(true);
    expect(r.dmg).toBe(1000); /* effAtk 100 × 10 */
    expect(e1.dead).toBe(1);  /* 500 - 1000 ≤ 0 → 死亡（hp 保持负值，以 dead 为准） */
    expect(e2.dead).toBe(1);
    expect(p.hp).toBe(160);   /* 回血至 80% 上限 */
    expect(currentMoonPacts()).toBe(0);
    expect(statsState.get('levelQueue')).toBe(0);
  });

  it('生命高于 80% 时不回退（只补不回）', () => {
    installPlayer({ atk: 10, maxHp: 200, hp: 190 }); /* 95% > 80% */
    const p = playerState.state.player!;
    fortuneState.set('moonPacts', 5);
    statsState.set('levelQueue', 1);
    castMoonWheelCmd();
    expect(p.hp).toBe(190);
  });

  it('余额不足失败且不减队列', () => {
    installPlayer({ atk: 10 });
    statsState.set('levelQueue', 1);
    const r = castMoonWheelCmd();
    expect(r.ok).toBe(false);
    expect(statsState.get('levelQueue')).toBe(1);
  });

  it('月轮伤害为固定伤害（secret 语义）：不暴击、不吃增伤', () => {
    bindWorld();
    installPlayer({ atk: 50, maxHp: 100, hp: 10 });
    const p = playerState.state.player!;
    p.critRate = 1;   /* 必爆若生效会 ×critDmg —— 固定伤害应无视 */
    p.critDmg = 2;
    const e = makeEnemy({ hp: 1000, maxHp: 1000 });
    spawnEnemies(e);
    fortuneState.set('moonPacts', 5);
    statsState.set('levelQueue', 1);
    const r = castMoonWheelCmd();
    expect(r.dmg).toBe(500); /* 50×10，未 ×2 */
    expect(e.hp).toBe(500);
  });
});

/* =========================================================
   操作 5 · 命运筛选（免费，落点三选一，无保底月契）
   ========================================================= */
describe('操作 5 · 命运筛选', () => {
  it('三选一：选落点/左邻/右邻均获得对应祝福，完成升级', () => {
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_hp' },
      { kind: 'blessing' as const, blessingId: 'b_atk' },
      { kind: 'blessing' as const, blessingId: 'b_spd' },
      { kind: 'blessing' as const, blessingId: 'b_crit' },
      { kind: 'blank' as const },
    ];
    const p = playerState.state.player!;
    const hpBefore = p.maxHp;
    const atkBefore = p.atk;
    const spdBefore = p.speed;
    statsState.set('levelQueue', 3);

    /* 落点在 index2 → 候选 [1, 2, 3] */
    const r1 = sieveTake(slots, 2, 0); /* 选左邻 index1 → b_atk */
    expect(r1.ok).toBe(true);
    expect(r1.id).toBe('b_atk');
    expect(p.atk).toBe(atkBefore + 2);

    const r2 = sieveTake(slots, 2, 1); /* 选落点 index2 → b_spd */
    expect(r2.id).toBe('b_spd');
    expect(p.speed).toBe(spdBefore + 12);

    const r3 = sieveTake(slots, 2, 2); /* 选右邻 index3 → b_crit */
    expect(r3.id).toBe('b_crit');
    expect(p.critRate).toBeGreaterThan(0);
    void hpBefore;
    expect(statsState.get('levelQueue')).toBe(0);
  });

  it('不获得保底月契（与随机拨动 +1 的关键差异）', () => {
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_hp' },
      { kind: 'blessing' as const, blessingId: 'b_atk' },
      { kind: 'blessing' as const, blessingId: 'b_spd' },
      { kind: 'blank' as const },
    ];
    statsState.set('levelQueue', 1);
    const r = sieveTake(slots, 1, 0);
    expect(r.ok).toBe(true);
    expect(r.spinPacts).toBe(0);
    expect(currentMoonPacts()).toBe(0); /* 无收入 */
  });

  it('选择蚀格候选：补偿金币，且不给月契', () => {
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_hp' },
      { kind: 'blank' as const },
      { kind: 'blessing' as const, blessingId: 'b_atk' },
      { kind: 'blank' as const },
    ];
    const goldBefore = statsState.get('gold');
    statsState.set('levelQueue', 1);
    const r = sieveTake(slots, 1, 1); /* 落点 index1 = 蚀格，位置 1 = 落点 */
    expect(r.kind).toBe('blank');
    expect(statsState.get('gold')).toBeGreaterThan(goldBefore);
    expect(currentMoonPacts()).toBe(0);
  });

  it('越权候选（不在三格内）失败且不减队列', () => {
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_hp' },
      { kind: 'blessing' as const, blessingId: 'b_atk' },
      { kind: 'blessing' as const, blessingId: 'b_spd' },
      { kind: 'blank' as const },
    ];
    statsState.set('levelQueue', 1);
    const r = sieveTake(slots, 1, 3); /* 候选位置越界（只有 0/1/2） */
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('candidate');
    expect(statsState.get('levelQueue')).toBe(1);
  });

  it('三选一选中已强化的 common：效果翻倍（apply 两次）', () => {
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_hp' },
      { kind: 'blessing' as const, blessingId: 'b_atk' },
      { kind: 'blessing' as const, blessingId: 'b_spd' },
      { kind: 'blank' as const },
    ];
    fortuneState.set('moonPacts', 2);
    expect(enhanceBlessingCmd('b_hp').ok).toBe(true);
    const p = playerState.state.player!;
    const before = p.maxHp;
    statsState.set('levelQueue', 1);
    const r = sieveTake(slots, 0, 1); /* 候选 [2,0,1]，选落点 index0 = b_hp */
    expect(r.id).toBe('b_hp');
    expect(p.maxHp).toBe(before + 24); /* 新获得，翻倍 */
  });
});
