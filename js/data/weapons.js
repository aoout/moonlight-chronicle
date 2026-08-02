// @ts-check
/* =========================================================
   蚀月远征 · 数据层：武器库
   从 JSON 加载武器数据，通过公式解析器计算伤害
   ========================================================= */
import { ICONS } from '../icons.js';
import { evalFormula } from './parser.js';
import weaponsData from './weapons.json';
import upgradeCost from './upgrade_cost.json';

/** @type {Record<string, import('../types/core.d.ts').WeaponDef>} */
const WEAPONS = {};

// 图标键名 → SVG 映射
const ICON_MAP = /** @type {Record<string, string>} */ (ICONS);

for (const [key, data] of Object.entries(weaponsData)) {
  /** @type {any} */
  const def = { ...data };
  // 解析图标字符串
  if (typeof def.icon === 'string') {
    def.icon = ICON_MAP[def.icon] || def.icon;
  }
  // 生成 dmg 函数：使用公式解析器
  const formula = /** @type {string|undefined} */ (def.formulaDmg);
  if (formula) {
    def.dmg = (/** @type {any} */ p, /** @type {number} */ lv) => evalFormula(formula, { ...p, level: lv });
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
  WEAPONS[key] = /** @type {import('../types/core.d.ts').WeaponDef} */ (def);
}

export { WEAPONS };

/** @type {number[]} */
export const WEAPON_UPGRADE_COST = upgradeCost;