// @ts-check
/* =========================================================
   蚀月远征 · 流程层：关卡 / 主循环 / 更新
   ========================================================= */
import { G, STATE, sm, entityState } from './state.js';
import { EventBus } from './core/event_bus.js';
import { computeDerived, addWeapon, createPlayer, xpNeeded } from './player_fn.js';
import { pick } from './utils.js';
import { CONFIG, STAGE_NAMES, BOSS_POOLS, CURSES } from './data/index.js';
import { spawnBoss, spawnEnemy } from './enemies.js';
import { render } from './render/index.js';
import { createSystemManager } from './systems/index.js';
import { openShop } from './ui/shop.js';
import { openLevelUp, openResult } from './ui.js';
import { uiTick } from './ui/hud.js';

/* ---------- 关卡流程 ---------- */

/**
 * @param {number} n
 */
export function startStage(n) {
  G.stage = n;
  G.stageTime = 0;
  G.stageMax = CONFIG.STAGE_TIME;
  G.stageName = STAGE_NAMES[n - 1] || ('第 ' + n + ' 夜');
  // 每回合重置武器伤害统计（占比反映当前回合输出构成；totalDmg 保留全程）
  G.runStats.wDmg = {};
  // 使用 World 重置实体池（同时清空 G 列表和 EntityPool）
  getSysMan().getWorld().resetAll();
  G.spawnAcc = 0;
  G.boss = null;
  const p = G.player;
  if (!p) return;
  p.x = G.width / 2;
  p.y = G.height / 2;
  p.invuln = 1.2;
  p.hp = Math.min(p.maxHp, p.hp);
  computeDerived(p);
  if (CONFIG.BOSS_STAGES.includes(n) || n === CONFIG.FINAL_STAGE) {
    const type = pick(BOSS_POOLS[n] || ['final']);   // 节点 Boss 池随机
    spawnBoss(type);
    for (let i = 0; i < 4; i++) spawnEnemy(pick(['grub', 'rat']), { hpMul: 0.6 });
  }
  EventBus.emit('stage:start', { stage: n, name: G.stageName, boss: G.boss !== null });
}

export function startRun() {
  sm.transition(STATE.PLAYING);
  G.stage = 1;
  G.level = 1;
  G.xp = 0;
  G.xpNeeded = xpNeeded(1);
  G.kills = 0;
  G.gold = 0;
  G.time = 0;
  G.weaponCd = {};
  G.weaponCdFull = {};
  G.runStats = { totalDmg: 0, bossKills: 0, win: false, wDmg: {} };
  G.levelQueue = 0;
  G._resumeState = STATE.PLAYING;
  G.levelUpOpen = false;
  G.shopOpen = false;
  G.paused = false;
  // 蚀月深度 ≥1：随机施加一个蚀之诅咒
  G.curse = G.depth >= 1 ? pick(CURSES) : null;
  G.player = createPlayer();
  const p = G.player;
  if (G.curse && p) G.curse.apply(p);
  addWeapon('moonRing');
  startStage(1);
  EventBus.emit('game:runStart', { depth: G.depth, curse: G.curse });
}

/* ---------- ECS System Manager（惰性初始化，避免模块循环依赖 TDZ） ---------- */
/** @type {import('./core/system_manager.js').SystemManager|null} */
let _sysMan = null;
function getSysMan() {
  if (!_sysMan) {
    _sysMan = createSystemManager();
    // 初始化 World：绑定实体列表（G.enemies, G.projectiles 等来自 entityState 切片）
    _sysMan.initWorld(entityState);
  }
  return _sysMan;
}

/* ---------- 主更新（薄调度层） ---------- */

/**
 * @param {number} dt
 */
export function update(dt) {
  G.time += dt;
  getSysMan().update(dt);
}

/* ---------- 固定时间步长 + 累积器 ---------- */
const FIXED_DT = 1 / 60;          // 固定步长 ≈16.67ms
const MAX_STEPS = 4;               // 单帧最大逻辑步数（防螺旋死锁）
let _accum = 0;
let _lastT = 0;
/**
 * @param {number} ts
 */
export function gameLoop(ts) {
  requestAnimationFrame(gameLoop);
  if (_lastT === 0) { _lastT = ts; return; }  // 首帧初始化基线
  let frameDt = (ts - _lastT) / 1000;
  _lastT = ts;
  // 超大 dt 保护（切标签页、休眠唤醒），防 ts 倒退
  frameDt = Math.max(0, Math.min(0.2, frameDt || FIXED_DT));

  // 战斗中推进模拟；其余状态（升级/商店/结算）完全暂停（不渲染）。
  if (sm.is(STATE.PLAYING) && !G.paused) {
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

  // 界面切换与战斗解耦：通过事件/状态机驱动
  if (sm.is(STATE.LEVELUP) && !G.levelUpOpen) {
    G.levelUpOpen = true;
    try { openLevelUp(); }
    catch (err) { G.levelUpOpen = false; console.error('升级界面打开失败，重试:', err); }
  } else if (sm.is(STATE.OVER) || sm.is(STATE.WIN)) {
    const won = sm.is(STATE.WIN);
    EventBus.emit('game:runEnd', { win: won, stage: G.stage, kills: G.kills, gold: G.gold });
    openResult(won);
    sm.transition(STATE.RESULT);
  } else if (sm.is(STATE.SHOP) && !G.shopOpen) {
    G.shopOpen = true;
    openShop();
  }
}