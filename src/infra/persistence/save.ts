/* =========================================================
   蚀月远征 · 存档系统：月光烙记（局内进度） + 解锁进度
   ========================================================= */
import { STATE, sm } from '../../engine/core/states.js';
import { stageState } from '../../state/stage.js';
import { statsState } from '../../state/stats.js';
import { playerState } from '../../state/player.js';
import { gameState } from '../../state/flow.js';
import { CURSES, LEVELS } from '../../config/index.js';
import { isDevMode } from '../../engine/env.js';

import { gSt, sSt, pSt, gmSt } from '../../state/accessors.js';
import { fSt } from '../../state/fortune.js';

/* ---------- 解锁进度存档（localStorage） ---------- */
const SAVE_KEY = 'eclipse_cycle_save';
function loadUnlocked(): number {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); return Math.max(0, s.unlocked || 0); } catch (e) { return 0; }
}
export function persistUnlocked(): void {
  if (isDevMode()) return;  // 开发者模式：解锁进度只读覆盖，不持久化
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ unlocked: gSt().unlocked })); } catch (e) {}
}
// 开发者模式：深度全解锁（只读覆盖，不持久化）
stageState.set('unlocked', isDevMode() ? LEVELS.length - 1 : loadUnlocked());

/* ---------- 月光烙记：局内进度存档（每夜开始自动烙下，可追忆重进） ---------- */
const RUN_SAVE_KEY = 'eclipse_run_save_v1';

export function saveRun(): void {
  if (isDevMode()) return;  // god 模式：不写正式存档（与 persistUnlocked 保护一致）
  try {
    const p = pSt().player;
    const data = {
      v: 1,
      stage: gSt().stage,
      depth: gSt().depth,
      curseId: gSt().curse ? gSt().curse!.id : null,
      curseIds: gSt().curses.map(c => c.id),
      gold: sSt().gold,
      kills: sSt().kills,
      time: gSt().time,
      xp: sSt().xp,
      xpNeeded: sSt().xpNeeded,
      runStats: sSt().runStats,
      player: p,
      // 月契经济随档：追忆月痕续局时恢复（无此字段的旧档回退为开局初始值）
      fortune: { moonPacts: fSt().moonPacts, enhanced: fSt().enhanced },
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

export function clearRun(): void {
  try { localStorage.removeItem(RUN_SAVE_KEY); } catch (e) {}
}
