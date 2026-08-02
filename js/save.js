/* =========================================================
   蚀月远征 · 存档系统：月光烙记（局内进度） + 解锁进度
   ========================================================= */
import { G, STATE, sm } from './state.js';
import { CURSES } from './data/index.js';
import { computeDerived } from './player_fn.js';
import { startStage } from './game.js';

/* ---------- 解锁进度存档（localStorage） ---------- */
const SAVE_KEY = 'eclipse_cycle_save';
function loadUnlocked() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); return Math.max(0, s.unlocked || 0); } catch (e) { return 0; }
}
export function persistUnlocked() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ unlocked: G.unlocked })); } catch (e) {}
}
G.unlocked = loadUnlocked();

/* ---------- 月光烙记：局内进度存档（每夜开始自动烙下，可追忆重进） ---------- */
const RUN_SAVE_KEY = 'eclipse_run_save_v1';

export function saveRun() {
  try {
    const p = G.player;
    const data = {
      v: 1,
      stage: G.stage,
      depth: G.depth,
      curseId: G.curse ? G.curse.id : null,
      gold: G.gold,
      kills: G.kills,
      time: G.time,
      xp: G.xp,
      xpNeeded: G.xpNeeded,
      runStats: G.runStats,
      player: p,
    };
    localStorage.setItem(RUN_SAVE_KEY, JSON.stringify(data));
  } catch (e) { /* 存档失败静默 */ }
}

export function loadRunMeta() {
  try {
    const raw = localStorage.getItem(RUN_SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export function loadRun() {
  const d = loadRunMeta();
  if (!d || !d.player) return false;
  try {
    G.player = d.player;
    G.stage = d.stage;
    G.depth = d.depth;
    G.gold = d.gold;
    G.kills = d.kills;
    G.time = d.time;
    G.xp = d.xp;
    G.xpNeeded = d.xpNeeded;
    G.runStats = d.runStats || { totalDmg: 0, bossKills: 0, win: false, wDmg: {} };
    G.curse = d.curseId ? (CURSES.find(c => c.id === d.curseId) || null) : null;
    // 重置会话状态（防残留）
    G.levelQueue = 0;
    G.levelUpOpen = false;
    G.shopOpen = false;
    G.paused = false;
    G.weaponCd = {};
    G.weaponCdFull = {};
    G._resumeState = STATE.PLAYING;
    computeDerived(G.player);
    startStage(G.stage);
    sm.transition(STATE.PLAYING);
    return true;
  } catch (e) { return false; }
}

export function clearRun() {
  try { localStorage.removeItem(RUN_SAVE_KEY); } catch (e) {}
}