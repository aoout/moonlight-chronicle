/* =========================================================
   commands/run · 一局游戏的生命周期
   ---------------------------------------------------------
   开局 / 开夜 / 从月光烙记续局。

   这里走的是真实链路：真实的 state store、真实的 World、
   真实的 SystemManager（由 getSysMan 惰性创建）。
   不 mock 任何东西 —— run 命令的 bug 往往就藏在「状态没摆对」
   这种最朴素的地方，mock 反而会把它们盖住。

   注意：gSt() 即 stageState（历史重命名遗留的别名），深度 / 诅咒 /
   关卡时间都活在 stageState 上，不是 gameState。

   重要：Store.get state 返回浅拷贝，标量字段必须用 .set() 改，
   直接 `sSt().gold = x` 只改到副本上，是无效写入（绿灯是假的）。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { startRun, startStage, resumeRun, confirmCurses } from '../../commands/run.js';
import { saveRun } from '../../infra/persistence/save.js';
import { STATE, sm } from '../../engine/core/states.js';
import { CONFIG, CURSES } from '../../config/index.js';
import { pSt, sSt, gSt, rSt } from '../../state/accessors.js';
import { entityState } from '../../state/entities.js';
import { statsState } from '../../state/stats.js';
import { stageState } from '../../state/stage.js';
import { renderState } from '../../state/render.js';
import { bindWorld, installPlayer, enableDevMode, captureEvent, resetAllStores } from '../_harness/index.js';

const bossStage = CONFIG.BOSS_STAGES[0];

beforeEach(() => {
  // setup.ts 已经 resetAllStores + sm.reset；这里把 World 重新绑到
  // 本用例刚生成的实体列表，并铺上画布尺寸，让「玩家放回场地中心」这类
  // 断言是真实的（否则 width/height 为 0，x = 0/2 永远成立，绿灯是假的）。
  bindWorld();
  renderState.set('width', 1280);
  renderState.set('height', 720);
});

/* ========== 开始一局 ========== */

describe('startRun', () => {
  it('推进到 PLAYING 并初始化一局标准进度（深度 0 无诅咒）', () => {
    startRun();
    expect(sm.is(STATE.PLAYING)).toBe(true);
    expect(gSt().stage).toBe(1);
    expect(pSt().player).toBeTruthy();
    expect(pSt().player!.weapons.some(w => w.id === 'moonRing')).toBe(true);
    expect(sSt().level).toBe(1);
    expect(sSt().gold).toBe(0);
    expect(sSt().kills).toBe(0);
    expect(gSt().curse).toBeNull();
  });

  it('发出 game:runStart 事件，携带当前深度', () => {
    const log = captureEvent('game:runStart');
    startRun();
    expect(log.count).toBe(1);
    expect(log.last.depth).toBe(0);
  });

  it('深度 ≥1 时先进蚀潮索价（CURSE 状态），诅咒待立契', () => {
    expect(CURSES.length).toBeGreaterThan(0);
    stageState.set('depth', 1); // 注意：gSt() === stageState
    startRun();
    expect(sm.is(STATE.CURSE)).toBe(true);
    expect(gSt().curse).toBeNull();    // 尚未立契
    expect(gSt().curses).toEqual([]);
  });

  it('开发者模式走第 0 夜商店整备路径（不进第一夜）', () => {
    enableDevMode();
    stageState.set('depth', 0); // 深度 0 不触发蚀潮索价
    startRun();
    expect(sm.is(STATE.SHOP)).toBe(true);
    expect(gSt().stage).toBe(0);
  });
});

/* ========== god 模式：任选起始夜 ========== */

describe('god 模式起始夜选择', () => {
  it('god 模式 startRun(7) 整备到第 6 夜商店（下一夜 → 第 7 夜）', () => {
    enableDevMode();
    stageState.set('depth', 0);
    startRun(7);
    expect(sm.is(STATE.SHOP)).toBe(true);
    expect(gSt().stage).toBe(6);
  });

  it('god 模式直达第 20 夜前的整备（终焉），且整备出发即落夜名', () => {
    enableDevMode();
    stageState.set('depth', 0);
    startRun(20);
    expect(sm.is(STATE.SHOP)).toBe(true);
    expect(gSt().stage).toBe(19);
    // 模拟商店「出发」（scheduler goNext 的核心两行）
    installPlayer();
    stageState.set('stage', gSt().stage + 1);
    startStage(gSt().stage);
    expect(gSt().stage).toBe(20);
    expect(gSt().stageName).toBe('终焉虚空');
    expect(gSt().boss).not.toBeNull(); // 终焉夜出 Boss
  });

  it('god 模式越界参数收敛到合法夜区间（0 → 第 1 夜，99 → 第 20 夜）', () => {
    enableDevMode();
    stageState.set('depth', 0);
    startRun(0);
    expect(sm.is(STATE.SHOP)).toBe(true);
    expect(gSt().stage).toBe(0); // 第 1 夜的整备 = 第 0 夜
    sm.reset(); // 回到 MENU，允许再次开夜（SHOP 只能转 PLAYING）
    startRun(99);
    expect(gSt().stage).toBe(19); // 第 20 夜的整备 = 第 19 夜
  });

  it('非 god 模式 startRun(7) 忽略起始夜参数，仍从第 1 夜开始', () => {
    stageState.set('depth', 0);
    startRun(7);
    expect(sm.is(STATE.PLAYING)).toBe(true);
    expect(gSt().stage).toBe(1);
  });

  it('god 模式深度 ≥1：立契后整备商店直达所选夜（不丢目标）', () => {
    enableDevMode();
    stageState.set('depth', 1);
    startRun(12);
    expect(sm.is(STATE.CURSE)).toBe(true); // 仍先过蚀潮索价
    const picked = [CURSES[0]];
    const options = [...picked, CURSES[1], CURSES[2]];
    expect(confirmCurses(picked, options)).toBe(true);
    expect(sm.is(STATE.SHOP)).toBe(true);
    expect(gSt().stage).toBe(11); // 第 12 夜的整备 = 第 11 夜
  });
});

/* ========== 开始一夜 ========== */

describe('startStage', () => {
  it('重置关卡状态，把玩家放回场地中心并给 1.2s 无敌', () => {
    installPlayer();
    startStage(1);
    expect(gSt().stage).toBe(1);
    expect(gSt().stageTime).toBe(0);
    expect(gSt().boss).toBeNull();
    const p = pSt().player!;
    expect(p.x).toBeCloseTo(640); // width / 2
    expect(p.y).toBeCloseTo(360); // height / 2
    expect(p.invuln).toBe(1.2);
  });

  it('发出 stage:start 事件，携带夜号与是否 Boss 夜', () => {
    installPlayer();
    const log = captureEvent('stage:start');
    startStage(1);
    expect(log.count).toBe(1);
    expect(log.last.stage).toBe(1);
    expect(log.last.boss).toBe(false);
  });

  it('Boss 夜生成 1 个 Boss + 4 个小怪，并登记到 stageState.boss', () => {
    installPlayer();
    startStage(bossStage);
    expect(gSt().boss).not.toBeNull();
    expect(gSt().boss!.boss).toBe(true);
    const enemies = entityState.state.enemies;
    expect(enemies.length).toBe(5);
    expect(enemies.filter(e => e.boss).length).toBe(1);
  });

  it('非 Boss 夜清空上一夜残留的实体', () => {
    installPlayer();
    startStage(bossStage);
    expect(entityState.state.enemies.length).toBe(5); // 上一夜有怪
    startStage(1); // 切到普通夜
    expect(entityState.state.enemies.length).toBe(0);
    expect(gSt().boss).toBeNull();
  });

  it('没有玩家时安全返回，不掷骰子也不崩溃', () => {
    // 默认 playerState.player 为 null；startStage 读到空玩家后应早退
    expect(() => startStage(bossStage)).not.toThrow();
    expect(gSt().stage).toBe(bossStage);
  });
});

/* ========== 从月光烙记续局 ========== */

describe('resumeRun', () => {
  it('把月光烙记水合回运行时并切到 PLAYING', () => {
    // 摆出一局可识别的进度
    installPlayer();
    const p = pSt().player!;
    p.level = 7; p.hp = 500; p.maxHp = 500;
    statsState.set('gold', 123);
    statsState.set('kills', 9);
    statsState.set('xp', 40);
    statsState.set('xpNeeded', 100);
    statsState.set('level', 7);
    stageState.set('stage', 3);
    stageState.set('depth', 2);
    stageState.set('time', 55.5);
    const curse = CURSES[0];
    stageState.set('curse', curse);
    stageState.set('curses', [curse]);

    saveRun(); // 写入月光烙记

    // 模拟一个全新会话：所有 store 被清空
    resetAllStores();

    const ok = resumeRun();
    expect(ok).toBe(true);
    expect(pSt().player!.level).toBe(7);
    expect(pSt().player!.hp).toBe(500);
    expect(sSt().gold).toBe(123);
    expect(sSt().kills).toBe(9);
    expect(sSt().xp).toBe(40);
    expect(gSt().stage).toBe(3);
    expect(gSt().depth).toBe(2);
    expect(gSt().time).toBeCloseTo(55.5);
    expect(gSt().curse?.id).toBe(curse.id);
    expect(sm.is(STATE.PLAYING)).toBe(true);
  });

  it('没有存档时返回 false', () => {
    expect(resumeRun()).toBe(false);
  });

  it('存档损坏（非法 JSON）时返回 false', () => {
    localStorage.setItem('eclipse_run_save_v1', '{这不是合法json');
    expect(resumeRun()).toBe(false);
  });

  it('存档存在但缺少玩家字段时返回 false', () => {
    localStorage.setItem('eclipse_run_save_v1', JSON.stringify({ stage: 1, gold: 5 }));
    expect(resumeRun()).toBe(false);
  });
});

/* ========== 诅咒数值语义（固定值削弱，开局可感知） ========== */

describe('诅咒数值语义', () => {
  const curse = (id: string) => CURSES.find(c => c.id === id)!;

  it('月运晦暗：暴击率 -10pp（开局 5% → 负值，永不暴击）', () => {
    installPlayer();
    const p = pSt().player!;
    const before = p.critRate;
    curse('curse_crit').apply(p);
    expect(p.critRate).toBeCloseTo(before - 0.10);
  });

  it('月刃钝蚀：攻击力 -4（固定值）', () => {
    installPlayer();
    const p = pSt().player!;
    const before = p.atk;
    curse('curse_atk').apply(p);
    expect(p.atk).toBe(before - 4);
  });

  it('月尘滞重：移速 -40（固定值）', () => {
    installPlayer();
    const p = pSt().player!;
    const before = p.speed;
    curse('curse_spd').apply(p);
    expect(p.speed).toBe(before - 40);
  });

  it('月华干涸：生命恢复 -0.4/s（固定值，开局归零）', () => {
    installPlayer();
    const p = pSt().player!;
    const before = p.regen;
    curse('curse_regen').apply(p);
    expect(p.regen).toBeCloseTo(before - 0.4);
  });

  it('蚀毒侵蚀：生命上限 -40 并回满到新上限', () => {
    installPlayer();
    const p = pSt().player!;
    curse('curse_hp').apply(p);
    expect(p.maxHp).toBe(p.hp);
  });

  it('乘数型诅咒保持明确语义（价格/敌人不受基础值影响）', () => {
    installPlayer();
    const p = pSt().player!;
    curse('curse_price').apply(p);
    curse('curse_ehp').apply(p);
    curse('curse_edmg').apply(p);
    expect(p.effects.priceMul).toBe(1.3);
    expect(p.effects.enemyHpMul).toBe(1.25);
    expect(p.effects.enemyDmgMul).toBe(1.15);
  });
});

/* ========== 蚀潮索价：立契 ========== */

describe('confirmCurses（蚀潮索价立契）', () => {
  const curse = (id: string) => CURSES.find(c => c.id === id)!;

  it('立契：应用所选诅咒、登记到 stageState、推进到 PLAYING', () => {
    stageState.set('depth', 1);
    startRun();
    const p = pSt().player!;
    const atk0 = p.atk;
    const picked = [curse('curse_atk')];
    const options = [curse('curse_atk'), curse('curse_hp'), curse('curse_gold')];
    expect(confirmCurses(picked, options)).toBe(true);
    expect(sm.is(STATE.PLAYING)).toBe(true);
    expect(gSt().curses.map(c => c.id)).toEqual(['curse_atk']);
    expect(gSt().curse!.id).toBe('curse_atk');
    expect(p.atk).toBe(atk0 - 4);
  });

  it('深度 ≥5 时可立双契', () => {
    stageState.set('depth', 5);
    startRun();
    const picked = [curse('curse_atk'), curse('curse_crit')];
    const options = [...picked, curse('curse_hp')];
    confirmCurses(picked, options);
    expect(gSt().curses).toHaveLength(2);
    expect(gSt().curses.map(c => c.id).sort()).toEqual(['curse_atk', 'curse_crit']);
  });

  it('未抽中且已精通的诅咒给予蚀之回响（恩惠）', () => {
    stageState.set('depth', 1);
    startRun();
    localStorage.setItem('eclipse_curse_records_save', JSON.stringify({ curse_crit: 5 }));
    const p = pSt().player!;
    const crit0 = p.critRate;
    const options = [curse('curse_atk'), curse('curse_hp'), curse('curse_gold')]; // 未含 curse_crit
    confirmCurses([options[0]], options);
    expect(p.critRate).toBeCloseTo(crit0 + 0.05); // 蚀之回响：月运晦暗暴击 +5%
  });
});
