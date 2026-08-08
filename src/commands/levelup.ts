/* =========================================================
   蚀月远征 · 命令模式：升级祝福操作
   封装祝福施加 + 队列递减 + 属性重算
   resolvePick 为收尾公共逻辑，供三选一与命运轮盘复用
   ========================================================= */
import { STATE, sm } from '../engine/core/states.js';
import { statsState } from '../state/stats.js';
import { playerState } from '../state/player.js';
import { computeDerived } from '../domain/player.js';
import type { Player } from '../types/core.d.ts';

export interface BlessingResult {
  ok: boolean;
  hasMore: boolean;
}

/** 收尾公共逻辑：递减升级队列 + 重算派生属性 + 队列清空后切回 PLAYING */
export function resolvePick(p: Player): BlessingResult {
  if (!p) return { ok: false, hasMore: false };
  statsState.set('levelQueue', statsState.get('levelQueue') - 1);
  computeDerived(p);
  const hasMore = statsState.get('levelQueue') > 0;
  if (!hasMore) sm.transition(STATE.PLAYING);
  return { ok: true, hasMore };
}

/** 施加祝福并处理升级队列 */
export function applyBlessing(blessing: any): BlessingResult {
  const p = playerState.state.player;
  if (!p) return { ok: false, hasMore: false };
  blessing.apply(p);
  return resolvePick(p);
}
