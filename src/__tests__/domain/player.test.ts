/* =========================================================
   domain/player · 玩家领域逻辑
   ---------------------------------------------------------
   全部用 createPlayer() 造真身，不再手搓 `any` 字面量——
   BASE_STATS 加字段时测试会跟着走，不会悄悄测一个不存在的形状。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeDerived, createPlayer, xpNeeded,
  addWeapon, upgradeWeapon, removeWeapon, addGold, gainXp,
} from '../../domain/player.js';
import { makePlayer, installPlayer, enterPlaying, captureEvent } from '../_harness/index.js';
import { STATE, sm } from '../../engine/core/states.js';
import { playerState } from '../../state/player.js';
import { statsState } from '../../state/stats.js';
import { stageState } from '../../state/stage.js';
import { renderState } from '../../state/render.js';
import { CONFIG } from '../../config/index.js';

/* ========== 经验曲线 ========== */

describe('xpNeeded', () => {
  it('1 级需求等于配置基数', () => {
    expect(xpNeeded(1)).toBe(CONFIG.XP_PER_LEVEL);
  });

  it('按配置的几何增长逐级抬升', () => {
    for (let lv = 1; lv <= 12; lv++) {
      const expected = Math.round(CONFIG.XP_PER_LEVEL * Math.pow(CONFIG.XP_GROWTH, lv - 1));
      expect(xpNeeded(lv)).toBe(expected);
    }
  });

  it('严格单调递增（不会出现升级反而更便宜）', () => {
    let prev = xpNeeded(1);
    for (let lv = 2; lv <= 40; lv++) {
      const cur = xpNeeded(lv);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });
});

/* ========== 派生属性 ========== */

describe('computeDerived', () => {
  it('无任何转模时派生值等于基础值', () => {
    const p = makePlayer({ atk: 10, armor: 5, maxHp: 100, critRate: 0.1, speed: 50, atkSpd: 1 });

    expect(p.effAtk).toBe(10);
    expect(p.effCrit).toBe(0.1);
    expect(p.effSpeed).toBe(50);
    expect(p.effGold).toBe(1);
    expect(p.effAtkSpd).toBeCloseTo(1);   // 攻速 = 基础攻速（暴击率联动已移除）
  });

  it('攻速不再受暴击率影响（负暴击不拖累攻速）', () => {
    const p = makePlayer({ atkSpd: 1.2, critRate: -0.05 });
    expect(p.effAtkSpd).toBeCloseTo(1.2);
    const q = makePlayer({ atkSpd: 1.2, critRate: 0.5 });
    expect(q.effAtkSpd).toBeCloseTo(1.2);
  });

  it('五路转模全部计入 effAtk', () => {
    const p = makePlayer({
      atk: 10, armor: 5, maxHp: 100, critRate: 0.1, level: 3,
      armorToAtk: 0.5,   // 5   * 0.5  = 2.5
      hpToAtk: 0.05,     // 100 * 0.05 = 5
      critToAtk: 1.0,    // 0.1 * 1.0  = 0.1
      scaleLevel: 2,     // 3   * 2    = 6
      scaleStage: 0,
    });

    expect(p.effAtk).toBeCloseTo(10 + 2.5 + 5 + 0.1 + 6);
  });

  it('scaleStage 按「当前夜数 - 1」计入，第 1 夜为零加成', () => {
    stageState.set('stage', 1);
    const p1 = makePlayer({ atk: 10, scaleStage: 7 });
    expect(p1.effAtk).toBe(10);

    stageState.set('stage', 5);
    computeDerived(p1);
    expect(p1.effAtk).toBe(10 + 4 * 7);
  });

  it('effCrit 硬顶 0.9（速度转暴击溢出也不破顶）', () => {
    const p = makePlayer({ critRate: 0.85, speed: 200, speedToCrit: 0.1 });
    // 0.85 + 200 * 0.1 / 100 = 1.05 → 截到 0.9
    expect(p.effCrit).toBe(0.9);
  });

  it('effCrit 未到顶时不被截断', () => {
    const p = makePlayer({ critRate: 0.5, speed: 100, speedToCrit: 0.1 });
    expect(p.effCrit).toBeCloseTo(0.6);
  });

  it('atkToSpd 把攻击转成移速', () => {
    const p = makePlayer({ atk: 40, speed: 200, atkToSpd: 0.5 });
    expect(p.effSpeed).toBe(200 + 40 * 0.5);
  });

  it('luck 重构后：幸运不再转化为金币（effGold = goldGain）', () => {
    const base = makePlayer({ luck: 1, goldGain: 1, luckToGold: 2 });
    expect(base.effGold).toBe(1);

    const lucky = makePlayer({ luck: 3, goldGain: 1, luckToGold: 2 });
    expect(lucky.effGold).toBe(1); /* luckToGold 保留字段但不再被消费 */
  });

  it('返回的是同一个对象（原地写回，调用方持有的引用会看到新值）', () => {
    const p = createPlayer();
    expect(computeDerived(p)).toBe(p);
  });
});

/* ========== 创建 ========== */

describe('createPlayer', () => {
  it('继承 BASE_STATS 且初始无武器', () => {
    const p = createPlayer();
    expect(p.maxHp).toBe(100);
    expect(p.hp).toBe(100);
    expect(p.level).toBe(1);
    expect(p.weapons).toEqual([]);
  });

  it('出生点落在画布中心', () => {
    renderState.set('width', 800);
    renderState.set('height', 600);
    const p = createPlayer();
    expect(p.x).toBe(400);
    expect(p.y).toBe(300);
  });

  it('每个玩家的 weapons / effects 都是独立对象（不共享 BASE_STATS 引用）', () => {
    const a = createPlayer();
    const b = createPlayer();
    a.weapons.push({ id: 'moonRing', lv: 1 });
    expect(b.weapons).toEqual([]);
    expect(a.effects).not.toBe(b.effects);
  });
});

/* ========== 武器增删改 ========== */

describe('addWeapon', () => {
  it('无玩家时安全返回 false', () => {
    playerState.set('player', null);
    expect(addWeapon('moonRing')).toBe(false);
  });

  it('成功装备并登记冷却槽', () => {
    installPlayer();
    expect(addWeapon('moonRing')).toBe(true);
    expect(playerState.state.player!.weapons).toEqual([{ id: 'moonRing', lv: 1 }]);
    expect(playerState.state.weaponCd.moonRing).toBe(0);
  });

  it('同一把武器不可重复装备', () => {
    installPlayer();
    expect(addWeapon('moonRing')).toBe(true);
    expect(addWeapon('moonRing')).toBe(false);
    expect(playerState.state.player!.weapons).toHaveLength(1);
  });

  it('装备数达上限后拒绝新武器', () => {
    installPlayer();
    const ids = ['moonRing', 'crossbow', 'orbit', 'storm', 'blade', 'extra'];
    const results = ids.map(id => addWeapon(id));

    expect(results.slice(0, CONFIG.MAX_WEAPONS).every(Boolean)).toBe(true);
    expect(results[CONFIG.MAX_WEAPONS]).toBe(false);
    expect(playerState.state.player!.weapons).toHaveLength(CONFIG.MAX_WEAPONS);
  });

  it('eroded 标记只在传入时写入，不污染普通武器', () => {
    installPlayer();
    addWeapon('moonRing');
    addWeapon('crossbow', { eroded: true });

    const [normal, eroded] = playerState.state.player!.weapons;
    expect(normal).not.toHaveProperty('eroded');
    expect(eroded).toMatchObject({ id: 'crossbow', eroded: true });
  });
});

describe('upgradeWeapon', () => {
  it('逐级抬升等级', () => {
    installPlayer();
    addWeapon('moonRing');
    expect(upgradeWeapon('moonRing')).toBe(true);
    expect(playerState.state.player!.weapons[0].lv).toBe(2);
  });

  it('10 级封顶，再升返回 false 且等级不变', () => {
    installPlayer();
    addWeapon('moonRing');
    for (let i = 0; i < 9; i++) expect(upgradeWeapon('moonRing')).toBe(true);
    expect(playerState.state.player!.weapons[0].lv).toBe(10);

    expect(upgradeWeapon('moonRing')).toBe(false);
    expect(playerState.state.player!.weapons[0].lv).toBe(10);
  });

  it('未装备的武器无法升级', () => {
    installPlayer();
    expect(upgradeWeapon('crossbow')).toBe(false);
  });
});

describe('removeWeapon', () => {
  it('移除武器同时清掉两张冷却表（防止卖了还在转 CD）', () => {
    installPlayer();
    addWeapon('moonRing');
    playerState.state.weaponCdFull.moonRing = 1.5;

    expect(removeWeapon('moonRing')).toBe(true);
    expect(playerState.state.player!.weapons).toEqual([]);
    expect(playerState.state.weaponCd).not.toHaveProperty('moonRing');
    expect(playerState.state.weaponCdFull).not.toHaveProperty('moonRing');
  });

  it('只移除目标，其它武器与冷却原封不动', () => {
    installPlayer();
    addWeapon('moonRing');
    addWeapon('crossbow');
    playerState.state.weaponCd.crossbow = 0.7;

    removeWeapon('moonRing');
    expect(playerState.state.player!.weapons.map(w => w.id)).toEqual(['crossbow']);
    expect(playerState.state.weaponCd.crossbow).toBe(0.7);
  });

  it('移除不存在的武器返回 false', () => {
    installPlayer();
    expect(removeWeapon('nope')).toBe(false);
  });
});

/* ========== 金币 ========== */

describe('addGold', () => {
  it('按 effGold 倍率结算并取整', () => {
    installPlayer({ goldGain: 1.5, luck: 1 });
    statsState.set('gold', 0);
    addGold(10);
    expect(statsState.state.gold).toBe(15);
  });

  it('倍率再低也保底 0.1（不会因为负面词条变成倒扣）', () => {
    installPlayer({ goldGain: -5, luck: 1 });
    statsState.set('gold', 100);
    addGold(10);
    expect(statsState.state.gold).toBe(101);   // 100 + round(10 * 0.1)
  });

  it('无玩家时不动金币', () => {
    playerState.set('player', null);
    statsState.set('gold', 42);
    addGold(10);
    expect(statsState.state.gold).toBe(42);
  });
});

/* ========== 经验与升级 ========== */

describe('gainXp', () => {
  // 升级会把状态机推进 LEVELUP，必须先处在「战斗中」才是合法路径
  beforeEach(() => { enterPlaying(); });

  it('未满一级时只累加经验', () => {
    installPlayer();
    gainXp(CONFIG.XP_PER_LEVEL - 1);
    expect(statsState.state.level).toBe(1);
    expect(statsState.state.xp).toBe(CONFIG.XP_PER_LEVEL - 1);
  });

  it('达到阈值即升级，溢出经验结转下一级', () => {
    installPlayer();
    gainXp(CONFIG.XP_PER_LEVEL + 3);

    expect(statsState.state.level).toBe(2);
    expect(statsState.state.xp).toBe(3);
    expect(statsState.state.xpNeeded).toBe(xpNeeded(2));
  });

  it('一次给够经验可连升多级，升级队列同步累加', () => {
    installPlayer();
    const need3 = xpNeeded(1) + xpNeeded(2) + xpNeeded(3);
    gainXp(need3);

    expect(statsState.state.level).toBe(4);
    expect(statsState.state.levelQueue).toBe(3);
  });

  it('xpGain 词条放大入账经验', () => {
    installPlayer({ xpGain: 3 });
    gainXp(2);
    expect(statsState.state.xp).toBe(6);
  });

  it('onLevelUpHp 在升级时回血且不越过上限', () => {
    installPlayer({ onLevelUpHp: 30, maxHp: 100 });
    const p = playerState.state.player!;
    p.hp = 80;

    gainXp(xpNeeded(1));
    expect(p.hp).toBe(100);   // 80 + 30 → 截到 100
  });

  it('无玩家时不产生任何经验变动', () => {
    playerState.set('player', null);
    gainXp(999);
    expect(statsState.state.xp).toBe(0);
    expect(statsState.state.level).toBe(1);
  });

  it('升级时进入 LEVELUP 并记下可返回的原状态', () => {
    installPlayer();
    gainXp(xpNeeded(1));

    expect(sm.current).toBe(STATE.LEVELUP);
  });

  it('连升多级只广播一次 levelup 事件，队列长度带在负载里', () => {
    installPlayer();
    const log = captureEvent<{ level: number; queue: number }>('player:levelup');

    gainXp(xpNeeded(1) + xpNeeded(2) + xpNeeded(3));

    expect(log.count).toBe(1);
    expect(log.last).toMatchObject({ level: 4, queue: 3 });
  });

  it('未升级时不广播 levelup', () => {
    installPlayer();
    const log = captureEvent('player:levelup');

    gainXp(1);
    expect(log.count).toBe(0);
  });
});
