/* =========================================================
   蚀月远征 · 命令模式：升级祝福操作
   封装祝福施加 + 队列递减 + 属性重算
   resolvePick 为收尾公共逻辑，供三选一与命运轮盘复用
   ========================================================= */
import { STATE, sm } from '../engine/core/states.js';
import { statsState } from '../state/stats.js';
import { playerState } from '../state/player.js';
import { computeDerived } from '../domain/player.js';
import type { Player, BlessingDef } from '../types/core.d.ts';

export interface BlessingResult {
  ok: boolean;
  hasMore: boolean;
}

/** 收尾公共逻辑：递减升级队列 + 重算派生属性。
    注意：不在此处切回 PLAYING —— 升级面板关闭前世界保持 LEVELUP 冻结，
    否则选完轮盘、结果展示的 1.4s 里怪物会继续行动（玩家措手不及）。
    切回由 resumeAfterLevelUp()（升级面板关闭时）执行。 */
export function resolvePick(p: Player): BlessingResult {
  if (!p) return { ok: false, hasMore: false };
  statsState.set('levelQueue', statsState.get('levelQueue') - 1);
  computeDerived(p);
  const hasMore = statsState.get('levelQueue') > 0;
  return { ok: true, hasMore };
}

/** 升级面板关闭时调用：队列已清空且仍在 LEVELUP → 切回 PLAYING（世界恢复行动） */
export function resumeAfterLevelUp(): void {
  if (statsState.get('levelQueue') <= 0 && sm.is(STATE.LEVELUP)) sm.transition(STATE.PLAYING);
}

/** 施加祝福并处理升级队列 */
export function applyBlessing(blessing: BlessingDef): BlessingResult {
  const p = playerState.state.player;
  if (!p) return { ok: false, hasMore: false };
  blessing.apply(p);
  return resolvePick(p);
}
