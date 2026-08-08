/* =========================================================
   蚀月远征 · 数据层：升级祝福
   从 JSON 加载祝福数据，apply 函数保持为 JS
   ========================================================= */
import { ICONS } from '../assets/icons.js';
import { validateEntries, validateAndWarn } from './validate.js';
import blessingsData from './blessings.json';
import type { BlessingDef, Player } from '../types/core.d.ts';

const BLESSINGS: BlessingDef[] = [];

const ICON_MAP = ICONS;

const APPLY_FN: Record<string, (p: Player) => void> = {
  b_hp:       p => { p.maxHp += 12; p.hp += 12; },
  b_atk:      p => { p.atk += 2; },
  b_spd:      p => { p.speed += 12; },
  b_crit:     p => { p.critRate += 0.03; },
  b_armor:    p => { p.armor += 1.5; },
  b_atkspd:   p => { p.atkSpd += 0.08; },
  b_regen:    p => { p.regen += 0.4; },
  b_luck:     p => { p.luck += 0.15; },
  b_critdmg:  p => { p.critDmg += 0.30; },
  b_lifesteal: p => { p.lifesteal += 0.04; },
  b_proj:     p => { p.projCount += 1; },
  b_area:     p => { p.area += 0.1; },
  b_cdr:      p => { p.cdr += 0.04; },
  b_xp:       p => { p.xpGain += 0.15; },
  b_hp2:      p => { p.maxHp = Math.round(p.maxHp * 1.1); },
  b_atk2:     p => { p.atk = Math.round(p.atk * 1.08); },
  b_legend:   p => { p.luck += 0.3; p.atkSpd += 0.18; },
  b_moonwall: p => { p.maxHp += 18; p.hp += 18; p.armor += 2; },
  b_gold:     p => { p.goldGain += 0.2; },
};

// 校验祝福数据
validateAndWarn(validateEntries(blessingsData, {
  id: { type: 'string', desc: '祝福标识' },
  name: { type: 'string', desc: '祝福名称' },
  icon: { type: 'string', desc: '图标键名' },
  tier: { type: 'string', desc: '等级' },
  weight: { type: 'number', desc: '权重' },
  desc: { type: 'string', desc: '描述' },
}, 'blessings.json'), 'blessings.json');

for (const data of Object.values(blessingsData)) {
  const blessing: Record<string, any> = { ...data };
  if (typeof blessing.icon === 'string') {
    blessing.icon = ICON_MAP[blessing.icon] || blessing.icon;
  }
  blessing.apply = APPLY_FN[blessing.id] || (() => {});
  BLESSINGS.push(blessing as BlessingDef);
}

export { BLESSINGS };

/**
 * 幸运对祝福权重的修正（luck 重构后的唯一消费点）：
 * - common 不变
 * - epic ×(1 + luck)
 * - legend ×(1 + luck×2)
 * 理由：命运祝福权重基数最低（1），需要更长的杠杆才能被「福运」感知；
 * 非凡用线性即可。[PLACEHOLDER · 验证：luck=1.3 时 epic 权重 ×1.3、legend ×1.6，
 * 观察「每局 legend 期望数」是否仍低于 1.5，防止稀有度通胀]
 */
export function luckWeight(weight: number, tier: string, luck: number): number {
  const l = Math.max(0, luck || 1);
  if (tier === 'legend') return weight * (1 + l * 2);
  if (tier === 'epic') return weight * (1 + l);
  return weight;
}

/** 按权重抽取 n 个祝福；可选排除项 + 幸运修正（config 层保持纯函数，不读 state） */
export function pickBlessings(n: number, opts?: { excludeIds?: string[]; luck?: number }): BlessingDef[] {
  const ex = (opts && opts.excludeIds) || [];
  const luck = (opts && opts.luck) || 1;
  const pool = BLESSINGS.filter(b => !ex.includes(b.id));
  const chosen: BlessingDef[] = [];
  while (chosen.length < n && pool.length) {
    const total = pool.reduce((s, b) => s + luckWeight(b.weight, b.tier, luck), 0);
    let r = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= luckWeight(pool[i].weight, pool[i].tier, luck);
      if (r <= 0) { idx = i; break; }
    }
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}
