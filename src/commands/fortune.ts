/* =========================================================
   蚀月远征 · 命令模式：命运轮盘操作
   升级面板的四种操作（全部在 commands 层收口，UI 不直接改 state）：
   1. 随机拨动：转动轮盘取祝福（或蚀格补偿），附赠 1 月契，完成本次升级
   2. 强化：花 2 月契给轮盘上某祝福打上「强化印记」（每种只能一次）
      - common：本局该祝福效果翻倍（apply 两次）
      - epic  ：每次被轮盘选中，+1 月契 +20 金币
      - legend：每次被轮盘选中，随机连转 3 次获得祝福（纯抽取，防递归）
   3. 踢格：花 3 月契踢掉一个格子，从轮盘外的祝福里定向请一位
      直接获得其效果，完成本次升级
   4. 月轮：花 5 月契，对全场造成 10×攻击力固定伤害，回复生命至上限 80%，
      完成本次升级（不获得祝福）
   ========================================================= */
import {
  blessingById, buildWheel, spinWheel, substituteBlessing, wheelBlessingIds, sieveCandidates,
  BLANK_GOLD, ENHANCE_COST, SWAP_COST, MOON_WHEEL_COST, SPIN_PACT_REWARD,
  ENHANCE_EPIC_PACTS, ENHANCE_EPIC_GOLD, ENHANCE_LEGEND_SPINS,
  MOON_WHEEL_ATK_MULT, MOON_WHEEL_HEAL_RATIO,
} from '../domain/fortune_wheel.js';
import { resolvePick } from './levelup.js';
import { fortuneState, addMoonPacts, spendMoonPacts, markEnhanced, isEnhanced } from '../state/fortune.js';
import { damageEnemy, healPlayer } from '../domain/combat.js';
import { addGold } from '../domain/player.js';
import { eSt, pSt } from '../state/accessors.js';
import type { Player } from '../types/core.d.ts';
import type { WheelSlot } from '../domain/fortune_wheel.js';

/* ---------- 结果类型 ---------- */
export interface WheelGrant {
  kind: 'blessing' | 'blank';
  id?: string;
  name?: string;
  gold?: number;          // 蚀格补偿 / epic 强化奖励
  pacts?: number;         // epic 强化奖励 / 拨动附赠
  chainNames?: string[];  // legend 强化三连抽命中的祝福名
}

export interface WheelTakeResult extends WheelGrant {
  ok: boolean;
  hasMore: boolean;
  slot?: number;
  spinPacts: number;
  reason?: string;
}

export interface FortuneResult {
  ok: boolean;
  reason?: string;
}

/* ---------- 施加祝福（统一入口）
   common 强化 = 效果翻倍：只对强化后「新获得」的份数生效（apply 两次），
   已持有的旧加成不补差、不重算（用户裁定 2026-08-08）。 ---------- */
function applyWheelBlessing(p: Player, id: string): void {
  const b = blessingById(id);
  if (!b) return;
  b.apply(p);
  if (isEnhanced(id) && b.tier === 'common') b.apply(p);
}

/* ---------- 结果结算：命中格子 → 祝福 apply + 强化触发 / 蚀格补偿 ---------- */
function grantWheel(p: Player, slots: WheelSlot[], idx: number): WheelGrant {
  const slot = slots[idx];
  if (!slot || slot.kind === 'blank') {
    addGold(BLANK_GOLD);
    return { kind: 'blank', gold: BLANK_GOLD };
  }
  const b = blessingById(slot.blessingId!);
  if (!b) return { kind: 'blank' };

  applyWheelBlessing(p, b.id);

  const g: WheelGrant = { kind: 'blessing', id: b.id, name: b.name };
  if (isEnhanced(b.id)) {
    if (b.tier === 'epic') {
      g.pacts = ENHANCE_EPIC_PACTS;
      g.gold = ENHANCE_EPIC_GOLD;
      addMoonPacts(g.pacts);
      addGold(g.gold);
    } else if (b.tier === 'legend') {
      /* 三连抽：纯抽取——不触发 epic/legend 强化效果（防资源自循环），
         但 common 翻倍与持有计数照常生效（「本局效果翻倍」对任何获得路径都成立） */
      const names: string[] = [];
      for (let i = 0; i < ENHANCE_LEGEND_SPINS; i++) {
        const j = spinWheel(slots, p.luck);
        const s = slots[j];
        if (s && s.kind === 'blessing' && s.blessingId) {
          applyWheelBlessing(p, s.blessingId);
          names.push(blessingById(s.blessingId)?.name || '?');
        }
      }
      g.chainNames = names;
    }
  }
  return g;
}

/* ========== 操作 1 · 随机拨动（免费，附赠 1 月契，完成本次升级） ==========
   UI 动画需要先知道落点：调用方传入预构建轮盘与预计算落点，
   保证「指针停在哪 = 实际获得什么」的单一随机源。 */
export function spinWheelTake(prevSlots?: WheelSlot[], prevIdx?: number): WheelTakeResult {
  const p = pSt().player;
  if (!p) return { ok: false, hasMore: false, kind: 'blank', spinPacts: 0 };
  const slots = prevSlots || buildWheel(p.luck);
  const idx = prevIdx !== undefined && prevIdx >= 0 && prevIdx < slots.length
    ? prevIdx
    : spinWheel(slots, p.luck);
  const granted = grantWheel(p, slots, idx);
  addMoonPacts(SPIN_PACT_REWARD);
  const r = resolvePick(p);
  return { ok: r.ok, hasMore: r.hasMore, slot: idx, spinPacts: SPIN_PACT_REWARD, ...granted };
}

/* ========== 操作 5 · 命运筛选（免费，落点三选一，完成本次升级） ==========
   照常转轮盘；落点 + 左右相邻共 3 格为候选，玩家三选一。
   choice = 候选位置（0=左邻 / 1=落点 / 2=右邻），内部映射到轮盘下标。
   代价 = 放弃随机拨动的保底 +1 月契（spinPacts 恒 0）。 */
export function sieveTake(prevSlots: WheelSlot[], prevIdx: number, choice: number): WheelTakeResult {
  const p = pSt().player;
  if (!p) return { ok: false, hasMore: false, kind: 'blank', spinPacts: 0, reason: 'player' };
  // 命运筛选依赖调用方提供的同一轮盘与落点（指针停在哪 = 三选一围绕哪）。
  // prevSlots 缺失时不能退化为自建轮盘：旧 prevIdx 会错位指向新轮盘的格子。
  if (!prevSlots || prevSlots.length === 0) {
    return { ok: false, hasMore: false, kind: 'blank', spinPacts: 0, reason: 'wheel' };
  }
  const slots = prevSlots;
  const idx = prevIdx >= 0 && prevIdx < slots.length ? prevIdx : spinWheel(slots, p.luck);
  const cands = sieveCandidates(slots, idx);
  if (choice < 0 || choice >= cands.length) {
    return { ok: false, hasMore: false, kind: 'blank', spinPacts: 0, reason: 'candidate' };
  }
  const chosenIdx = cands[choice];
  const granted = grantWheel(p, slots, chosenIdx);
  const r = resolvePick(p);
  return { ok: r.ok, hasMore: r.hasMore, slot: chosenIdx, spinPacts: 0, ...granted };
}

/* ========== 操作 2 · 强化（2 月契，纯投资，不完成升级） ==========
   common 强化 = 之后新获得的该祝福效果翻倍（已持有的不变）。 */
export function enhanceBlessingCmd(id: string): FortuneResult & { name?: string } {
  const p = pSt().player;
  if (!p) return { ok: false, reason: 'player' };
  const b = blessingById(id);
  if (!b) return { ok: false, reason: 'unknown' };
  if (isEnhanced(id)) return { ok: false, reason: 'enhanced' };
  if (!spendMoonPacts(ENHANCE_COST)) return { ok: false, reason: 'pacts' };
  markEnhanced(id);
  return { ok: true, name: b.name };
}

/* ========== 操作 3 · 踢格替代（3 月契，定向请祝福，完成本次升级） ========== */
export function swapBlessingCmd(kickId: string, slots: WheelSlot[]): FortuneResult & { slots?: WheelSlot[]; granted?: WheelGrant; hasMore: boolean } {
  const p = pSt().player;
  if (!p) return { ok: false, reason: 'player', hasMore: false };
  const onWheel = wheelBlessingIds(slots);
  if (kickId !== 'blank' && !onWheel.includes(kickId)) return { ok: false, reason: 'kick', hasMore: false };
  if (!spendMoonPacts(SWAP_COST)) return { ok: false, reason: 'pacts', hasMore: false };

  const next = substituteBlessing(onWheel, p.luck);
  if (!next) return { ok: false, reason: 'pool', hasMore: false };

  /* 替换格子：踢祝福格 → 新祝福顶替；踢蚀格 → 新祝福占用空位（蚀格被消灭） */
  const idx = slots.findIndex(s => (kickId === 'blank' ? s.kind === 'blank' : s.blessingId === kickId));
  const nextSlots = slots.slice();
  if (idx >= 0) nextSlots[idx] = { kind: 'blessing', blessingId: next };

  /* 直接获得新祝福效果（本次升级的收获），并完成升级 */
  const b = blessingById(next);
  if (b) applyWheelBlessing(p, next);
  const r = resolvePick(p);

  return {
    ok: r.ok && !!b,
    hasMore: r.hasMore,
    slots: nextSlots,
    granted: b ? { kind: 'blessing', id: b.id, name: b.name } : { kind: 'blank' },
  };
}

/* ========== 操作 4 · 月轮（5 月契，清屏 + 回血，完成本次升级） ========== */
export function castMoonWheelCmd(): FortuneResult & { dmg?: number; hasMore: boolean } {
  const p = pSt().player;
  if (!p) return { ok: false, reason: 'player', hasMore: false };
  if (!spendMoonPacts(MOON_WHEEL_COST)) return { ok: false, reason: 'pacts', hasMore: false };

  const dmg = Math.round(p.effAtk * MOON_WHEEL_ATK_MULT);
  /* secret=true：固定伤害，跳过暴击/增伤/吸血/溅射/护盾生成（与秘宝同语义） */
  for (const e of [...eSt().enemies]) {
    if (!e.dead) damageEnemy(e, dmg, false, 'moonWheel', undefined, true);
  }
  const target = p.maxHp * MOON_WHEEL_HEAL_RATIO;
  if (p.hp < target) healPlayer(target - p.hp);
  const r = resolvePick(p);
  return { ok: true, dmg, hasMore: r.hasMore };
}

/* ---------- 便捷导出（供 UI 读取） ---------- */
export { buildWheel, spinWheel, ENHANCE_COST, SWAP_COST, MOON_WHEEL_COST, SPIN_PACT_REWARD, BLANK_GOLD };

export function currentMoonPacts(): number {
  return fortuneState.get('moonPacts');
}
