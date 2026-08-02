// @ts-check
/* =========================================================
   蚀月远征 · 数据层：敌人图鉴
   从 JSON 加载敌人数据
   ========================================================= */
import { ICONS } from '../icons.js';
import enemiesData from './enemies.json';

/** @type {Record<string, import('../types/core.d.ts').EnemyDef>} */
const ENEMIES = {};

const ICON_MAP = /** @type {Record<string, string>} */ (ICONS);

for (const [key, data] of Object.entries(enemiesData)) {
  const def = { ...data };
  if (typeof def.icon === 'string') {
    def.icon = ICON_MAP[def.icon] || def.icon;
  }
  ENEMIES[key] = def;
}

export { ENEMIES };

/** @param {number} level */
export function levelEnemyScale(level) {
  return { hp: 1 + level * 0.25, dmg: 1 + level * 0.08 };
}