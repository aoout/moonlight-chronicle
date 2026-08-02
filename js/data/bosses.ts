/* =========================================================
   蚀月远征 · 数据层：Boss / Boss 节点池
   从 JSON 加载 Boss 数据
   ========================================================= */
import { ICONS } from '../ui/icons.js';
import bossesData from './bosses.json';
import type { BossDef } from '../types/core.d.ts';

const BOSSES: Record<string, BossDef> = {};

const ICON_MAP: Record<string, string> = ICONS as Record<string, string>;

for (const [key, data] of Object.entries(bossesData)) {
  const def: any = { ...data };
  if (typeof def.icon === 'string') {
    def.icon = ICON_MAP[def.icon] || def.icon;
  }
  BOSSES[key] = def;
}

export { BOSSES };

export const BOSS_POOLS: Record<number, string[]> = {
  6: ['behemoth', 'tideMother', 'erodeChariot'],
  12: ['lord', 'moonWraith', 'moonSwordsman'],
  18: ['dragon', 'stormOwl', 'abyssMother'],
  20: ['final'],
};
