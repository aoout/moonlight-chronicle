/* =========================================================
   蚀月远征 · 领域模块：蚀潮索价（诅咒抽取与抉择）
   深度 ≥1 开局：蚀潮从全部诅咒中索求 3 契，守月人自选 1 契
   （深度 ≥5 双契）。未抽中且已精通（累计通关 ≥5）的诅咒
   以「蚀之回响」偿还——反向减半的恩惠，自动生效。
   ========================================================= */
import { CURSES } from '../config/index.js';
import { RNG } from '../engine/util/utils.js';
import type { CurseDef, Player } from '../types/core.d.ts';

/** 每次抽卡展示的诅咒数量 */
export const CURSE_OPTIONS = 3;
/** 深度 ≥5 时需选择两个诅咒 */
export const DOUBLE_CURSE_DEPTH = 5;

/** 当前深度需选择的诅咒数量（深度 ≥5 → 2，否则 1） */
export function cursePickCount(depth: number): number {
  return depth >= DOUBLE_CURSE_DEPTH ? 2 : 1;
}

/** 从全部诅咒中抽取 3 张（不重复） */
export function drawCurseOptions(): CurseDef[] {
  const pool = [...CURSES];
  const out: CurseDef[] = [];
  while (out.length < CURSE_OPTIONS && pool.length) {
    out.push(pool.splice(Math.floor(RNG() * pool.length), 1)[0]);
  }
  return out;
}

/** 蚀之回响：未抽中且已精通的诅咒（masteredIds 由调用方从账本注入，domain 保持纯逻辑） */
export function curseGraces(options: CurseDef[], masteredIds: Set<string>): CurseDef[] {
  const drawn = new Set(options.map(c => c.id));
  return CURSES.filter(c => !drawn.has(c.id) && masteredIds.has(c.id));
}

/** 立契：应用选中的诅咒（惩罚）+ 蚀之回响（恩惠） */
export function resolveCurses(p: Player, picked: CurseDef[], options: CurseDef[], masteredIds: Set<string>): void {
  for (const c of picked) c.apply(p);
  for (const c of curseGraces(options, masteredIds)) c.grace?.(p);
}
