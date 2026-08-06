/* =========================================================
   蚀月远征 · 数据层：武器库
   从 JSON 加载武器数据，通过公式解析器计算伤害
   ========================================================= */
import { ICONS } from '../assets/icons.js';
import { compileFormula } from './parser.js';
import { validateEntries, validateAndWarn } from './validate.js';
import weaponsData from './weapons.json';
import loreData from './lore.json';
import upgradeCost from './upgrade_cost.json';
import type { WeaponDef, Player, LoreFragment } from '../types/core.d.ts';

const WEAPONS: Record<string, WeaponDef> = {};

// 图标键名 → SVG 映射
const ICON_MAP = ICONS;

// 校验武器数据（不同类型武器字段差异较大，多数为可选）
validateAndWarn(validateEntries(weaponsData, {
  id: { type: 'string', desc: '武器标识' },
  name: { type: 'string', desc: '武器名称' },
  icon: { type: 'string', desc: '图标键名' },
  desc: { type: 'string', desc: '描述' },
  formula: { type: 'string', desc: '显示公式' },
  formulaDmg: { type: 'string', optional: true, desc: '伤害公式' },
  cd: { type: 'number', optional: true, desc: '冷却时间' },
  pierce: { type: 'number', optional: true, desc: '穿透次数' },
  range: { type: 'number', optional: true, desc: '射程' },
  speed: { type: 'number', optional: true, desc: '弹速' },
  color: { type: 'string', desc: '主题色' },
  fire: { type: 'object', optional: true, desc: '开火配置' },
}, 'weapons.json'), 'weapons.json');

for (const [key, data] of Object.entries(weaponsData)) {
  const def: Record<string, any> = { ...data };
  // 合并碎片化文案（lore.json 按武器 id 关联；缺省则无）
  const lore = (loreData as any)?.weapons?.[key] as LoreFragment[] | undefined;
  if (lore && lore.length) def.lore = lore;
  // 解析图标字符串
  if (typeof def.icon === 'string') {
    def.icon = ICON_MAP[def.icon] || def.icon;
  }
  // 预编译 dmg 公式：解析一次，闭包求值。
  // depth（月蚀深度）属运行时状态，由调用方（domain 层）注入，配置层不反向读取 state。
  const formula = def.formulaDmg as string | undefined;
  const compiledDmg = formula ? compileFormula(formula) : null;
  if (compiledDmg) {
    def.dmg = (p: Player, lv: number, depth = 0) => compiledDmg({ ...p, level: lv, depth });
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
