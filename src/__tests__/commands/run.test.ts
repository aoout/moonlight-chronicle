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
import { startRun, startStage, resumeRun } from '../../commands/run.js';
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

  it('深度 ≥1 时随机施加一个蚀之诅咒并登记到 stageState', () => {
    expect(CURSES.length).toBeGreaterThan(0);
    stageState.set('depth', 1); // 注意：gSt() === stageState
    startRun();
    expect(gSt().curse).not.toBeNull();
    expect(gSt().curse!.id).toBeTruthy();
  });

  it('开发者模式走第 0 夜商店整备路径（不进第一夜）', () => {
    enableDevMode();
    startRun();
    expect(sm.is(STATE.SHOP)).toBe(true);
    expect(gSt().stage).toBe(0);
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
