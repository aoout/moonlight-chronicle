/* =========================================================
   蚀月远征 · 数据层：敌人图鉴
   从 JSON 加载敌人数据
   ========================================================= */
import { ICONS } from '../assets/icons.js';
import { validateEntries, validateAndWarn } from './validate.js';
import enemiesData from './enemies.json';
import type { EnemyDef } from '../types/core.d.ts';

const ENEMIES: Record<string, EnemyDef> = {};

const ICON_MAP = ICONS;

// 校验敌人数据
validateAndWarn(validateEntries(enemiesData, {
  name: { type: 'string', desc: '敌人名称' },
  icon: { type: 'string', desc: '图标键名' },
  hp: { type: 'number', desc: '生命值' },
  spd: { type: 'number', desc: '速度' },
  size: { type: 'number', desc: '体型' },
  dmg: { type: 'number', desc: '伤害' },
  gold: { type: 'number', optional: true, desc: '金币' },
  xp: { type: 'number', optional: true, desc: '经验' },
  r: { type: 'number', desc: '掉落率' },
  color: { type: 'string', desc: '颜色' },
  desc: { type: 'string', desc: '描述' },
}, 'enemies.json'), 'enemies.json');

for (const [key, data] of Object.entries(enemiesData)) {
  const def: Record<string, any> = { ...data };
  if (typeof def.icon === 'string') {
    def.icon = ICON_MAP[def.icon] || def.icon;
  }
  ENEMIES[key] = def as EnemyDef;
}

export { ENEMIES };

export function levelEnemyScale(level: number): { hp: number; dmg: number } {
  return { hp: 1 + level * 0.25, dmg: 1 + level * 0.08 };
}
