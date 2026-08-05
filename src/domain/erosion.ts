/* =========================================================
   蚀月远征 · 月蚀侵蚀机制
   商店中出现的武器有概率被侵蚀，概率随月蚀深度加深而增加。
   被侵蚀武器伤害额外 +月蚀深度×(x+y×L)（加法，非乘法）。
   侵蚀加成系数 (x, y) 按武器攻击方式独立配置（见 weapons.json
   的 erosion 字段），避免不同攻击方式强度失衡。
   ========================================================= */
import { RNG } from '../utils.js';
import { WEAPONS } from '../data/index.js';
import { stageState } from '../state/stage.js';
import type { Player, WeaponInstance } from '../types/core.d.ts';

/** 侵蚀概率：深度 1 → 3%，深度 9 → 12%，线性插值（深度 0 外推 ≈1.9%） */
export function erosionChance(depth: number): number {
  return Math.max(0, Math.min(0.12, 0.03 + ((depth - 1) / 8) * 0.09));
}

/** 掷骰判定当前深度的商店武器是否被侵蚀 */
export function rollErosion(depth: number): boolean {
  return RNG() < erosionChance(depth);
}

/** 侵蚀加成数值：月蚀深度×(x+y×L)，未侵蚀 / 未配置系数时为 0 */
export function erosionBonus(w: WeaponInstance): number {
  if (!w.eroded) return 0;
  const def = WEAPONS[w.id];
  if (!def || !def.erosion) return 0;
  const depth = stageState.state.depth || 0;
  return depth * (def.erosion.x + def.erosion.y * w.lv);
}

/** 武器实际伤害（含侵蚀加成，加法叠加） */
export function weaponDmg(w: WeaponInstance, p: Player): number {
  const def = WEAPONS[w.id];
  if (!def) return 0;
  return def.dmg(p, w.lv) + erosionBonus(w);
}
