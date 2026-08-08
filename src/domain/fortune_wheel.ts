/* =========================================================
   蚀月远征 · 领域模块：命运轮盘（纯逻辑）
   蚀月轮盘 = 11 个祝福格 + 1 个蚀格（空白），共 12 格。
   格子面积 = 权重占比（幸运修正后的权重），指针随机落点即结果。

   本模块不读任何 state —— 纯函数，方便单测与纸面模拟。
   ========================================================= */
import { BLESSINGS, luckWeight, pickBlessings } from '../config/blessings.js';
import type { BlessingDef } from '../types/core.d.ts';

/* ---------- 轮盘常数（全部带 rationale，未测标 [PLACEHOLDER]） ---------- */
export const WHEEL_SLOT_COUNT = 12;        // 轮盘总格数（11 祝福 + 1 蚀格）
export const WHEEL_BLESSING_COUNT = 11;    // 祝福格数量
export const BLANK_WEIGHT = 6;             // 蚀格权重：略低于 common 最低权重（7），
                                           // 使蚀格概率 ≈ 5%，比任何单个祝福都稀 — 空转不常见但存在感足够
                                           // [PLACEHOLDER · 验证：空转率应落在 4%-8%，过低则蚀格无感，过高则升级体验挫败]
export const BLANK_GOLD = 10;              // 蚀格补偿金币 [PLACEHOLDER]

/* ---------- 月契经济 ---------- */
export const ENHANCE_COST = 2;             // 强化一次（2 月契）
export const SWAP_COST = 3;                // 踢格替代（3 月契）
export const MOON_WHEEL_COST = 5;          // 发动月轮（5 月契）
export const SPIN_PACT_REWARD = 1;         // 随机拨动附赠 1 月契（唯一稳定产出）

/* ---------- 强化效果 ---------- */
export const ENHANCE_EPIC_PACTS = 1;       // epic 强化：每次被轮盘选中 +1 月契
export const ENHANCE_EPIC_GOLD = 20;       // epic 强化：每次被轮盘选中 +20 金币
export const ENHANCE_LEGEND_SPINS = 3;     // legend 强化：每次被轮盘选中连转 3 次
                                           // （连转 3 次为纯抽取，不再触发任何强化效果——防无限递归）

/* ---------- 月轮 ---------- */
export const MOON_WHEEL_ATK_MULT = 10;     // 月轮：对全场造成 10×攻击力 固定伤害（不暴击/不增伤）
export const MOON_WHEEL_HEAL_RATIO = 0.8;  // 月轮：回复生命至上限的 80%（低于则回满，高于不动）

/* ---------- 类型 ---------- */
export interface WheelSlot {
  kind: 'blessing' | 'blank';
  blessingId?: string;
}

export function blessingById(id: string): BlessingDef | undefined {
  return BLESSINGS.find(b => b.id === id);
}

/** 某格在「幸运修正后」的权重（决定扇区面积与落点概率） */
export function slotWeight(slot: WheelSlot, luck: number): number {
  if (slot.kind === 'blank') return BLANK_WEIGHT;
  const b = blessingById(slot.blessingId!);
  if (!b) return 0;
  return luckWeight(b.weight, b.tier, luck);
}

/**
 * 构建轮盘：从祝福池按权重（luck 修正）抽 11 个 + 1 个蚀格。
 * excludeIds：可选排除（后续轮盘升级池等扩展用）。
 */
export function buildWheel(luck: number, excludeIds?: string[]): WheelSlot[] {
  const picks = pickBlessings(WHEEL_BLESSING_COUNT, { excludeIds, luck });
  const slots: WheelSlot[] = picks.map(b => ({ kind: 'blessing', blessingId: b.id }));
  slots.push({ kind: 'blank' });
  return slots;
}

/**
 * 指针落点：按各格权重随机（rng 可注入，测试用）。
 * 返回命中槽位下标；空池返回 -1。
 */
export function spinWheel(slots: WheelSlot[], luck: number, rng: () => number = Math.random): number {
  const total = slots.reduce((s, x) => s + slotWeight(x, luck), 0);
  if (total <= 0) return -1;
  let r = rng() * total;
  for (let i = 0; i < slots.length; i++) {
    r -= slotWeight(slots[i], luck);
    if (r <= 0) return i;
  }
  return slots.length - 1;
}

/**
 * 踢格替代：从「本轮未出现在轮盘上」的祝福里按权重（luck 修正）挑一个。
 * 返回被替代祝福的 id；池空返回 null。
 */
export function substituteBlessing(onWheelIds: string[], luck: number, rng: () => number = Math.random): string | null {
  const pool = BLESSINGS.filter(b => !onWheelIds.includes(b.id));
  if (!pool.length) return null;
  const total = pool.reduce((s, b) => s + luckWeight(b.weight, b.tier, luck), 0);
  let r = rng() * total;
  let idx = 0;
  for (let i = 0; i < pool.length; i++) {
    r -= luckWeight(pool[i].weight, pool[i].tier, luck);
    if (r <= 0) { idx = i; break; }
  }
  return pool[idx].id;
}

/** 轮盘上非蚀格的祝福 id 集合（踢格/替代用） */
export function wheelBlessingIds(slots: WheelSlot[]): string[] {
  const ids: string[] = [];
  for (const s of slots) if (s.kind === 'blessing' && s.blessingId) ids.push(s.blessingId);
  return ids;
}

/* ---------- 命运筛选（落点三选一） ----------
   照常转轮盘，指针落点 + 左右相邻共 3 格作为候选，玩家三选一。
   成本 = 放弃随机拨动的保底 +1 月契（不花月契、无月契收入）。
   取舍：要定向（三选一）还是要货币（1 月契），每次升级一个决策。 */

/** 落点的三格候选（环绕）：[左邻, 落点, 右邻] */
export function sieveCandidates(slots: WheelSlot[], idx: number): number[] {
  const n = slots.length;
  if (n <= 0) return [];
  return [((idx - 1) % n + n) % n, idx, (idx + 1) % n];
}

/* ---------- 强化显示 ----------
   common 强化 = 效果翻倍：详情浮层要展示翻倍后的数值。
   纯函数方便单测；common 祝福的 desc 都是线性加值（+12 / +8% / +1.5 / +0.4/s），
   数值 ×2 即语义正确的翻倍。 */

/** 把 desc 里的数值全部 ×2（保留 +/- 前缀与小数，整数去掉 .0） */
export function doubleDescNums(desc: string): string {
  return String(desc).replace(/(\+?)(\d+(?:\.\d+)?)/g, (m, sign: string, num: string) => {
    const v = parseFloat(num) * 2;
    const fmt = Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
    return (sign || '') + fmt;
  });
}

/** 强化效果的一句话说明（详情浮层 / 强化反馈共用） */
export function enhanceNoteFor(tier: string): string {
  if (tier === 'common') return '效果翻倍 · 仅对之后新获得的生效';
  if (tier === 'epic') return '每次被轮盘选中 · 月契 +1 · 金币 +20';
  if (tier === 'legend') return '每次被轮盘选中 · 三连抽';
  return '';
}
