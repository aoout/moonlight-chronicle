/* =========================================================
   蚀月远征 · 命令：一局游戏的生命周期
   开局 / 开夜 / 从月光烙记续局。
   放在 commands 层而非 app 层：这些是「意图」，
   由 UI、状态机钩子共同调用；app 只保留主循环这一组装根。
   ========================================================= */
import { EVENTS } from '../engine/core/events.js';
import { STATE, sm } from '../engine/core/states.js';
import { EventBus } from '../engine/core/event_bus.js';
import { pick } from '../engine/util/utils.js';
import { isDevMode } from '../engine/env.js';
import { CONFIG, STAGE_NAMES, BOSS_POOLS, CURSES } from '../config/index.js';
import { resolveCurses } from '../domain/curse_pick.js';
import { isCurseMastered } from '../infra/persistence/curse_records.js';
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
import type { CurseDef } from '../types/core.d.ts';

/* ---------- god 模式：本局目标起始夜 ----------
   仅开发者模式使用：玩家在远征之门任选第 1~20 夜作为起点。
   整备商店把 stage 摆到 target-1（"第 N-1 夜已渡"），
   点击出发（goNext 的 stage+1）即直达所选夜。
   非 god 模式恒为 1（参数被忽略，防止绕过解锁进度）。 */
let godStartStage = 1;

function clampStage(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(CONFIG.STAGES, Math.floor(n)));
}

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
  EventBus.emit(EVENTS.STAGE_START, { stage: n, name: gSt().stageName, boss: gSt().boss !== null });
}

/* ---------- 开始一局 ---------- */
export function startRun(atStage?: number): void {
  godStartStage = isDevMode() ? clampStage(atStage ?? 1) : 1;
  initAchievements();
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
  // 蚀之诅咒：开局由蚀潮索价（深度 ≥1），确认前为空
  stageState.set('curses', []);
  stageState.set('curse', null);
  playerState.set('player', createPlayer());
  const p = pSt().player;
  addWeapon('moonRing');
  if (p) computeDerived(p);
  if (gSt().depth >= 1) {
    // 深度 ≥1：先进蚀潮索价（诅咒抉择），确认后由 confirmCurses 推进
    sm.transition(STATE.CURSE);
  } else if (isDevMode()) {
    // god 模式：进入目标夜前的「第 N-1 夜商店」整备（下一夜 → 所选夜）
    stageState.set('stage', godStartStage - 1);
    sm.transition(STATE.SHOP);
  } else {
    sm.transition(STATE.PLAYING);
    startStage(1);
  }
  EventBus.emit(EVENTS.GAME_RUN_START, { depth: gSt().depth, curse: gSt().curse });
}

/* ---------- 蚀潮索价：立契（确认所选诅咒） ----------
   UI 在 CURSE 状态完成抉择后调用：应用选中诅咒（惩罚）与
   未抽中且精通的诅咒之蚀之回响（恩惠），再推进正式流程。 */
export function confirmCurses(picked: CurseDef[], options: CurseDef[]): boolean {
  const p = pSt().player;
  if (!p) return false;
  const masteredIds = new Set(CURSES.filter(c => isCurseMastered(c.id)).map(c => c.id));
  resolveCurses(p, picked, options, masteredIds);
  stageState.set('curses', picked);
  stageState.set('curse', picked[0] || null);
  if (p) computeDerived(p);
  if (isDevMode()) {
    stageState.set('stage', godStartStage - 1);
    sm.transition(STATE.SHOP);
  } else {
    sm.transition(STATE.PLAYING);
    startStage(1);
  }
  return true;
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
    // 诅咒恢复：优先 curseIds（新）；空数组或缺失时回退旧 curseId（单值兼容）
    const curseIds: string[] = (d.curseIds && d.curseIds.length)
      ? d.curseIds
      : (d.curseId ? [d.curseId] : []);
    const curses = curseIds
      .map(id => CURSES.find(c => c.id === id))
      .filter(Boolean) as CurseDef[];
    stageState.set('curses', curses);
    stageState.set('curse', curses[0] || null);
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
