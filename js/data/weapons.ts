/* =========================================================
   蚀月远征 · 数据层：武器库
   从 JSON 加载武器数据，通过公式解析器计算伤害
   ========================================================= */
import { ICONS } from '../ui/icons.js';
import { evalFormula } from './parser.js';
import weaponsData from './weapons.json';
import upgradeCost from './upgrade_cost.json';
import type { WeaponDef } from '../types/core.d.ts';

const WEAPONS: Record<string, WeaponDef> = {};

// 图标键名 → SVG 映射
const ICON_MAP: Record<string, string> = ICONS as Record<string, string>;

for (const [key, data] of Object.entries(weaponsData)) {
  const def: any = { ...data };
  // 解析图标字符串
  if (typeof def.icon === 'string') {
    def.icon = ICON_MAP[def.icon] || def.icon;
  }
  // 生成 dmg 函数：使用公式解析器
  const formula: string | undefined = def.formulaDmg;
  if (formula) {
    def.dmg = (p: any, lv: number) => evalFormula(formula, { ...p, level: lv });
  }
  // cd 从常量转为函数
  if (typeof def.cd === 'number') {
    const cdVal = def.cd;
    def.cd = () => cdVal;
  }
  // pierce: -1 表示无限穿透
  if (def.pierce === -1) {
    def.pierce = Infinity;
  }
  WEAPONS[key] = def as WeaponDef;
}

export { WEAPONS };

export const WEAPON_UPGRADE_COST: number[] = upgradeCost;
