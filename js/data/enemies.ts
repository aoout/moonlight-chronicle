/* =========================================================
   蚀月远征 · 数据层：敌人图鉴
   从 JSON 加载敌人数据
   ========================================================= */
import { ICONS } from '../icons.js';
import enemiesData from './enemies.json';
import type { EnemyDef } from '../types/core.d.ts';

const ENEMIES: Record<string, EnemyDef> = {};

const ICON_MAP: Record<string, string> = ICONS as Record<string, string>;

for (const [key, data] of Object.entries(enemiesData)) {
  const def: any = { ...data };
  if (typeof def.icon === 'string') {
    def.icon = ICON_MAP[def.icon] || def.icon;
  }
  ENEMIES[key] = def;
}

export { ENEMIES };

export function levelEnemyScale(level: number): { hp: number; dmg: number } {
  return { hp: 1 + level * 0.25, dmg: 1 + level * 0.08 };
}
