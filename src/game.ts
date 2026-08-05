/* =========================================================
   蚀月远征 · 流程层：关卡 / 主循环 / 更新
   ========================================================= */
import { initAchievements, achSessionStart } from './systems/AchievementSystem.js';
import { STATE, sm } from './core/states.js';
import { stageState } from './state/stage.js';
import { statsState } from './state/stats.js';
import { playerState } from './state/player.js';
import { renderState } from './state/render.js';
import { gameState } from './state/game.js';
import { pSt, sSt, gSt, rSt } from './state/accessors.js';
import { EventBus } from './core/event_bus.js';
import { computeDerived, createPlayer, xpNeeded, addWeapon } from './domain/player.js';
import { spawnBoss, spawnEnemy } from './domain/spawn.js';
import { pick } from './utils.js';
import { CONFIG, STAGE_NAMES, BOSS_POOLS, CURSES } from './data/index.js';
import { render } from './render/index.js';
import { getSysMan } from './systems/index.js';
import { uiTick } from './ui/hud.js';
import { pollGamepad } from './input/gamepad.js';
import { settingsState } from './state/settings.js';
import { isDevMode } from './debug/dev_mode.js';

/* ---------- 关卡流程 ---------- */

export function startStage(n: number): void {
  stageState.patch({
    stage: n,
    stageTime: 0,
    stageMax: CONFIG.STAGE_TIME,
    stageName: STAGE_NAMES[n - 1] || ('第 ' + n + ' 夜'),
    spawnAcc: 0,
    boss: null,
  });
  // 每回合重置武器伤害统计（占比反映当前回合输出构成；totalDmg 保留全程）
  statsState.set('runStats', { ...sSt().runStats, wDmg: {} });
  // 使用 World 重置实体池（同时清空 entityState 列表和 EntityPool）
  getSysMan().getWorld().resetAll();
  const p = pSt().player;
  if (!p) return;
  p.x = rSt().width / 2;
  p.y = rSt().height / 2;
  p.invuln = 1.2;
  p.hp = Math.min(p.maxHp, p.hp);
  computeDerived(p);
  /* 每夜重置：将上一夜的道具统计保存，重置当前夜统计 */
  if (p.effects.itemStats) {
    for (const key of Object.keys(p.effects.itemStats)) {
      const s = p.effects.itemStats[key]!;
      s.lastStageDmg = s.stageDmg;
      s.stageDmg = 0;
      s.lastStageExtraGold = s.stageExtraGold;
      s.stageExtraGold = 0;
    }
  }
  if (CONFIG.BOSS_STAGES.includes(n) || n === CONFIG.FINAL_STAGE) {
    const type = pick(BOSS_POOLS[n] || ['final']);   // 节点 Boss 池随机
    spawnBoss(type);
    for (let i = 0; i < 4; i++) spawnEnemy(pick(['grub', 'rat']), { hpMul: 0.6 });
  }
  EventBus.emit('stage:start', { stage: n, name: gSt().stageName, boss: gSt().boss !== null });
}

export function startRun(): void {
  initAchievements();
  sm.transition(STATE.PLAYING);
  stageState.set('stage', 1);
  statsState.patch({
    level: 1,
    xp: 0,
    kills: 0,
    gold: 0,
    levelQueue: 0,
    xpNeeded: xpNeeded(1),
    runStats: { totalDmg: 0, bossKills: 0, win: false, wDmg: {} },
  });
  stageState.patch({
    time: 0,
    paused: false,
  });
  playerState.patch({
    weaponCd: {},
    weaponCdFull: {},
  });
  gameState.set('_resumeState', STATE.PLAYING);
  gameState.set('levelUpOpen', false);
  gameState.set('shopOpen', false);
  achSessionStart(gSt().depth || 0);
  // 蚀月深度 ≥1：随机施加一个蚀之诅咒
  stageState.set('curse', gSt().depth >= 1 ? pick(CURSES) : null);
  playerState.set('player', createPlayer());
  const p = pSt().player;
  const curse = gSt().curse;
  if (curse && p) curse.apply(p);
  addWeapon('moonRing');
  if (p) computeDerived(p);
  if (isDevMode()) {
    // god 模式：进入第一夜前的「第 0 夜商店」整备（下一夜 → 第 1 夜）
    stageState.set('stage', 0);
    sm.transition(STATE.SHOP);
  } else {
    startStage(1);
  }
  EventBus.emit('game:runStart', { depth: gSt().depth, curse: gSt().curse });
}

/* ---------- 主更新（薄调度层） ---------- */

export function update(dt: number): void {
  stageState.set('time', gSt().time + dt);
  getSysMan().update(dt);
}

/* ---------- 固定时间步长 + 累积器 ---------- */
const FIXED_DT = 1 / 60;          // 固定步长 ≈16.67ms
const MAX_STEPS = 4;               // 单帧最大逻辑步数（防螺旋死锁）
let _accum = 0;
let _lastT = 0;
let _lastRenderT = 0;

export function gameLoop(ts: number): void {
  requestAnimationFrame(gameLoop);
  if (_lastT === 0) { _lastT = ts; _lastRenderT = ts; return; }  // 首帧初始化基线
  // 潮汐节律：近似帧率上限（30 / 60 / 0=无羁），含 1ms 容差。
  // 跳帧不推进 _lastT，累积器将在下一帧补足逻辑步数，模拟节奏不受限帧影响。
  const fpsLimit = settingsState.get('fpsLimit');
  if (fpsLimit > 0 && ts - _lastRenderT < 1000 / fpsLimit - 1) return;
  _lastRenderT = ts;
  let frameDt = (ts - _lastT) / 1000;
  _lastT = ts;
  // 超大 dt 保护（切标签页、休眠唤醒），防 ts 倒退
  frameDt = Math.max(0, Math.min(0.2, frameDt || FIXED_DT));

  // 手柄轮询：菜单 / 暂停 / 覆盖层中亦需响应，故置于战斗分支之外
  pollGamepad(ts, frameDt);

  // 战斗中推进模拟；其余状态（升级/商店/结算）完全暂停（不渲染）。
  if (sm.is(STATE.PLAYING) && !gSt().paused) {
    _accum += frameDt;
    let steps = 0;
    while (_accum >= FIXED_DT && steps < MAX_STEPS) {
      update(FIXED_DT);
      _accum -= FIXED_DT;
      steps++;
    }
    if (_accum >= FIXED_DT) _accum = 0;
    render();
    uiTick();
  } else {
    _accum = 0;  // 非战斗状态重置累积器，避免切回时追赶时间
  }

  // 界面切换由状态机钩子（state_hooks.ts）驱动，不再轮询
}
