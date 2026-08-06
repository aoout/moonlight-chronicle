/* =========================================================
   蚀月远征 · 命令：一局游戏的生命周期
   开局 / 开夜 / 从月光烙记续局。
   放在 commands 层而非 app 层：这些是「意图」，
   由 UI、状态机钩子共同调用；app 只保留主循环这一组装根。
   ========================================================= */
import { STATE, sm } from '../engine/core/states.js';
import { EventBus } from '../engine/core/event_bus.js';
import { pick } from '../engine/util/utils.js';
import { isDevMode } from '../engine/env.js';
import { CONFIG, STAGE_NAMES, BOSS_POOLS, CURSES } from '../config/index.js';
import { stageState } from '../state/stage.js';
import { statsState } from '../state/stats.js';
import { playerState } from '../state/player.js';
import { gameState } from '../state/flow.js';
import { pSt, sSt, gSt, rSt } from '../state/accessors.js';
import { computeDerived, createPlayer, xpNeeded, addWeapon } from '../domain/player.js';
import { spawnBoss, spawnEnemy } from '../domain/spawn.js';
import { initAchievements, achSessionStart } from '../systems/AchievementSystem.js';
import { getSysMan } from '../systems/index.js';
import { loadRunMeta } from '../infra/persistence/save.js';

/* ---------- 开始一夜 ---------- */
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

/* ---------- 开始一局 ---------- */
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

/* ---------- 从月光烙记续局 ----------
   持久化层只提供原始存档数据；把它水合回运行时状态、
   再推进状态机，是应用层的职责。 */
export function resumeRun(): boolean {
  const d = loadRunMeta();
  if (!d || !d.player) return false;
  try {
    playerState.set('player', d.player);
    stageState.set('stage', d.stage);
    stageState.set('depth', d.depth);
    statsState.set('gold', d.gold);
    statsState.set('kills', d.kills);
    stageState.set('time', d.time);
    statsState.set('xp', d.xp);
    statsState.set('xpNeeded', d.xpNeeded);
    statsState.set('level', d.player.level);
    statsState.set('runStats', d.runStats || { totalDmg: 0, bossKills: 0, win: false, wDmg: {} });
    stageState.set('curse', d.curseId ? (CURSES.find(c => c.id === d.curseId) || null) : null);
    // 重置会话状态（防残留）
    statsState.set('levelQueue', 0);
    gameState.set('levelUpOpen', false);
    gameState.set('shopOpen', false);
    stageState.set('paused', false);
    playerState.set('weaponCd', {});
    playerState.set('weaponCdFull', {});
    gameState.set('_resumeState', STATE.PLAYING);
    const p = pSt().player;
    if (!p) return false;
    computeDerived(p);
  } catch (e) { return false; }

  startStage(gSt().stage);
  sm.transition(STATE.PLAYING);
  return true;
}
