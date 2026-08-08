/* =========================================================
   蚀月远征 · 状态切片：命运（月契 / 强化印记）
   月契 = 轮盘经济的资源（run 级，每局重置）；
   强化印记 = 本局已强化过的祝福（每种只能强化一次）。
   common 强化「效果翻倍」只对强化后新获得的生效（用户裁定，
   2026-08-08）：已持有的旧加成不补差、不重算。
   ========================================================= */
import { Store } from '../engine/core/store.js';

export interface FortuneState {
  /** 月契余额 */
  moonPacts: number;
  /** 已强化祝福：{ [blessingId]: true }——每种只能强化一次 */
  enhanced: Record<string, boolean>;
}

const INITIAL: FortuneState = {
  moonPacts: 0,
  enhanced: {},
};

export const fortuneState = new Store<FortuneState>(INITIAL);

/** 便捷访问 */
export const fSt = () => fortuneState.state;

/** 追加月契（负数即扣除，余额不为负） */
export function addMoonPacts(n: number): number {
  const next = Math.max(0, fortuneState.get('moonPacts') + n);
  fortuneState.set('moonPacts', next);
  return next;
}

/** 尝试扣除月契；余额不足返回 false */
export function spendMoonPacts(n: number): boolean {
  if (fortuneState.get('moonPacts') < n) return false;
  fortuneState.set('moonPacts', fortuneState.get('moonPacts') - n);
  return true;
}

/** 该祝福是否已被强化 */
export function isEnhanced(id: string): boolean {
  return !!fortuneState.get('enhanced')[id];
}

/** 标记强化；已强化返回 false（每种只能一次） */
export function markEnhanced(id: string): boolean {
  const en = fortuneState.get('enhanced');
  if (en[id]) return false;
  const next = { ...en, [id]: true };
  fortuneState.set('enhanced', next);
  return true;
}
