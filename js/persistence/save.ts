/* =========================================================
   蚀月远征 · 存档系统：月光烙记（局内进度） + 解锁进度
   ========================================================= */
import { STATE, sm } from '../state.js';
import { stageState } from '../state/stage.js';
import { statsState } from '../state/stats.js';
import { playerState } from '../state/player.js';
import { gameState } from '../state/game.js';
import { CURSES } from '../data/index.js';
import { PlayerSystem } from '../systems/PlayerSystem.js';
import { startStage } from '../game.js';

const gSt = () => stageState.state;
const sSt = () => statsState.state;
const pSt = () => playerState.state;
const gmSt = () => gameState.state;

/* ---------- 解锁进度存档（localStorage） ---------- */
const SAVE_KEY = 'eclipse_cycle_save';
function loadUnlocked(): number {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); return Math.max(0, s.unlocked || 0); } catch (e) { return 0; }
}
export function persistUnlocked(): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ unlocked: gSt().unlocked })); } catch (e) {}
}
gSt().unlocked = loadUnlocked();

/* ---------- 月光烙记：局内进度存档（每夜开始自动烙下，可追忆重进） ---------- */
const RUN_SAVE_KEY = 'eclipse_run_save_v1';

export function saveRun(): void {
  try {
    const p = pSt().player;
    const data = {
      v: 1,
      stage: gSt().stage,
      depth: gSt().depth,
      curseId: gSt().curse ? gSt().curse!.id : null,
      gold: sSt().gold,
      kills: sSt().kills,
      time: gSt().time,
      xp: sSt().xp,
      xpNeeded: sSt().xpNeeded,
      runStats: sSt().runStats,
      player: p,
    };
    localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* 存档失败静默 */ }
}

export function loadRunMeta(): any {
  try {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function loadRun(): boolean {
  const d = loadRunMeta();
  if (!d || !d.player) return false;
  try {
    pSt().player = d.player;
    gSt().stage = d.stage;
    gSt().depth = d.depth;
    sSt().gold = d.gold;
    sSt().kills = d.kills;
    gSt().time = d.time;
    sSt().xp = d.xp;
    sSt().xpNeeded = d.xpNeeded;
    sSt().runStats = d.runStats || { totalDmg: 0, bossKills: 0, win: false, wDmg: {} };
    gSt().curse = d.curseId ? (CURSES.find(c => c.id === d.curseId) || null) : null;
    // 重置会话状态（防残留）
    sSt().levelQueue = 0;
    gmSt().levelUpOpen = false;
    gmSt().shopOpen = false;
    gSt().paused = false;
    pSt().weaponCd = {};
    pSt().weaponCdFull = {};
    gmSt()._resumeState = STATE.PLAYING;
    const p = pSt().player; if (!p) return false;
    PlayerSystem.computeDerived(p);
    startStage(gSt().stage);
    sm.transition(STATE.PLAYING);
    return true;
  } catch (e) { return false; }
}

export function clearRun(): void {
  try { localStorage.removeItem(RUN_SAVE_KEY); } catch (e) {}
}
