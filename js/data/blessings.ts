/* =========================================================
   蚀月远征 · 数据层：升级祝福
   从 JSON 加载祝福数据，apply 函数保持为 JS
   ========================================================= */
import { ICONS } from '../icons.js';
import blessingsData from './blessings.json';
import type { BlessingDef, Player } from '../types/core.d.ts';

const BLESSINGS: BlessingDef[] = [];

const ICON_MAP: Record<string, string> = ICONS as Record<string, string>;

const APPLY_FN: Record<string, (p: Player) => void> = {
  b_hp:       p => { p.maxHp += 12; p.hp += 12; },
  b_atk:      p => { p.atk += 2; },
  b_spd:      p => { p.speed += 5; },
  b_crit:     p => { p.critRate += 0.03; },
  b_armor:    p => { p.armor += 1.5; },
  b_atkspd:   p => { p.atkSpd += 0.08; },
  b_regen:    p => { p.regen += 0.4; },
  b_luck:     p => { p.luck += 0.15; },
  b_critdmg:  p => { p.critDmg += 0.25; },
  b_lifesteal: p => { p.lifesteal += 0.04; },
  b_proj:     p => { p.projCount += 1; },
  b_area:     p => { p.area += 0.1; },
  b_cdr:      p => { p.cdr += 0.04; },
  b_xp:       p => { p.xpGain += 0.15; },
  b_hp2:      p => { p.maxHp = Math.round(p.maxHp * 1.1); },
  b_atk2:     p => { p.atk = Math.round(p.atk * 1.08); },
  b_legend:   p => { p.luck += 0.3; p.atkSpd += 0.1; },
  b_gold:     p => { p.goldGain += 0.2; },
};

for (const data of Object.values(blessingsData)) {
  const blessing: any = { ...data };
  if (typeof blessing.icon === 'string') {
    blessing.icon = ICON_MAP[blessing.icon] || blessing.icon;
  }
  blessing.apply = APPLY_FN[blessing.id] || (() => {});
  BLESSINGS.push(blessing as BlessingDef);
}

export { BLESSINGS };

export function pickBlessings(n: number, excludeIds?: string[]): BlessingDef[] {
  const ex = excludeIds || [];
  const pool = BLESSINGS.filter(b => !ex.includes(b.id));
  const chosen: BlessingDef[] = [];
  while (chosen.length < n && pool.length) {
    const total = pool.reduce((s, b) => s + b.weight, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) { r -= pool[i].weight; if (r <= 0) { idx = i; break; } }
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}
