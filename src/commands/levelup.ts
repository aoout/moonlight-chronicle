/* =========================================================
   蚀月远征 · 命令模式：升级祝福操作
   封装祝福施加 + 队列递减 + 属性重算
   ========================================================= */
import { STATE, sm } from '../core/states.js';
import { statsState } from '../state/stats.js';
import { playerState } from '../state/player.js';
import { computeDerived } from '../domain/player.js';

interface BlessingResult {
  ok: boolean;
  hasMore: boolean;
}

/** 施加祝福并处理升级队列 */
export function applyBlessing(blessing: any): BlessingResult {
  const p = playerState.state.player;
  if (!p) return { ok: false, hasMore: false };
  blessing.apply(p);
  statsState.set('levelQueue', statsState.get('levelQueue') - 1);
  computeDerived(p);
  const hasMore = statsState.get('levelQueue') > 0;
  if (!hasMore) sm.transition(STATE.PLAYING);
  return { ok: true, hasMore };
}
