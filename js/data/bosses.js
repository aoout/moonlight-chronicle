// @ts-check
/* =========================================================
   蚀月远征 · 数据层：Boss / Boss 节点池
   从 JSON 加载 Boss 数据
   ========================================================= */
import { ICONS } from '../icons.js';
import bossesData from './bosses.json';

/** @type {Record<string, import('../types/core.d.ts').BossDef>} */
const BOSSES = {};

const ICON_MAP = /** @type {Record<string, string>} */ (ICONS);

for (const [key, data] of Object.entries(bossesData)) {
  const def = { ...data };
  if (typeof def.icon === 'string') {
    def.icon = ICON_MAP[def.icon] || def.icon;
  }
  BOSSES[key] = def;
}

export { BOSSES };

/** @type {Record<number, string[]>} */
export const BOSS_POOLS = {
  6: ['behemoth', 'tideMother', 'erodeChariot'],
  12: ['lord', 'moonWraith', 'moonSwordsman'],
  18: ['dragon', 'stormOwl', 'abyssMother'],
  20: ['final'],
};