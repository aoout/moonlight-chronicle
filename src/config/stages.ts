/* =========================================================
   蚀月远征 · 数据层：关卡配置 / 诅咒 / 关卡函数
   本模块负责关卡静态数据；曲线公式从 JSON 加载并预编译
   ========================================================= */
import { PALETTE } from '../assets/palette.js';
import { ICONS } from '../assets/icons.js';
import { compileFormula } from './parser.js';
import stageCurves from './stage_curves.json';
import type { Config, LevelDef, CurseDef } from '../types/core.d.ts';

export const CONFIG: Config = {
  STAGES: 20, STAGE_TIME: 30, MAX_WEAPONS: 5,
  BOSS_STAGES: [6, 12, 18], FINAL_STAGE: 20,
  SHOP_WEAPON_OFFERS: 2, LEVEL_UP_CHOICES: 3,
  XP_PER_LEVEL: 8, XP_GROWTH: 1.22, PICKUP_RADIUS: 46,
  MIRROR_DECAY: 0.92,
};

export const LEVELS: LevelDef[] = [
  { name:'初潮',   tag:'新月之蚀', color:'#f4e3c0', desc:'蚀月初醒，潮汐尚浅。守月人的第一场远征。' },
  { name:'弦月',   tag:'蚀牙初现', color:PALETTE.gold, desc:'月光被蚀去一角，蚀潮开始低语。' },
  { name:'上弦',   tag:'月晕渐暗', color:'#e0b26a', desc:'蚀影爬上月面，夜风带着锈味。' },
  { name:'盈凸',   tag:'蚀影侵月', color:'#d99a55', desc:'月海泛起暗红，潮噬之物躁动。' },
  { name:'满月',   tag:'潮汐狂涌', color:'#d07a4a', desc:'满月之夜，蚀潮倾泻而下。' },
  { name:'亏凸',   tag:'蚀脉扩散', color:'#c25a45', desc:'蚀的脉络爬满月背，现实开始扭曲。' },
  { name:'下弦',   tag:'血色月光', color:'#a83a3a', desc:'月光染血，集市货价虚高，诅咒渐浓。' },
  { name:'残月',   tag:'蚀潮倒灌', color:'#8a2a35', desc:'蚀潮倒流，月华结晶难以凝聚。' },
  { name:'蛾眉',   tag:'月光将熄', color:'#5e1f2c', desc:'月光将熄，唯有最坚韧的守月人可渡。' },
  { name:'终蚀',   tag:'蚀月临空', color:'#3d1020', desc:'蚀月临空，终焉之蚀吞噬一切光明。' },
];

export const CURSES: CurseDef[] = [
  { id:'curse_price',   name:'蚀雾弥漫', icon:ICONS.coin,   desc:'集市货价 +30%',          apply:p=>{ p.effects.priceMul = 1.3; } },
  { id:'curse_xp',      name:'月华黯淡', icon:ICONS.spark,  desc:'经验获取 -25%',          apply:p=>{ p.xpGain *= 0.75; } },
  { id:'curse_gold',    name:'财源枯竭', icon:ICONS.gem,    desc:'金币获取 -25%',          apply:p=>{ p.goldGain *= 0.75; } },
  { id:'curse_hp',      name:'蚀毒侵蚀', icon:ICONS.heart,  desc:'生命上限 -15%',          apply:p=>{ p.maxHp = Math.round(p.maxHp * 0.85); p.hp = p.maxHp; } },
  { id:'curse_atk',     name:'月刃钝蚀', icon:ICONS.sword,  desc:'攻击力 -15%',            apply:p=>{ p.atk = Math.round(p.atk * 0.85); } },
  { id:'curse_spd',     name:'月尘滞重', icon:ICONS.arrow,  desc:'移速 -12%',              apply:p=>{ p.speed = Math.round(p.speed * 0.88); } },
  { id:'curse_regen',   name:'月华干涸', icon:ICONS.plus,   desc:'生命恢复 -50%',          apply:p=>{ p.regen *= 0.5; } },
  { id:'curse_crit',    name:'月运晦暗', icon:ICONS.diamond,desc:'暴击率 -20%',            apply:p=>{ p.critRate *= 0.8; } },
  { id:'curse_ehp',     name:'蚀潮沸腾', icon:ICONS.triUp,  desc:'敌人生命 +25%',          apply:p=>{ p.effects.enemyHpMul = 1.25; } },
  { id:'curse_edmg',    name:'蚀牙锋利', icon:ICONS.flame,  desc:'敌人伤害 +15%',          apply:p=>{ p.effects.enemyDmgMul = 1.15; } },
];

export const STAGE_NAMES: string[] = [
  '雾蚀之原','泣月荒原','碎镜林','灰潮滩涂','朽骨矿脉','蚀潮裂隙',
  '沉眠古墓','星落之谷','影蔓沼泽','断月关隘','黑潮河口','君主祭坛',
  '深渊回廊','万噬之口','雷蚀山脊','月光碎岛','终夜高塔','魔龙之巅',
  '蚀月之庭','终焉虚空',
];

/* ========== 关卡曲线（数据驱动） ========== */

/** 预编译曲线公式 */
const CURVES = {
  inflationRate: compileFormula(stageCurves.inflationRate),
  stageSpawnRate: compileFormula(stageCurves.stageSpawnRate),
  enemyHpScale: compileFormula(stageCurves.enemyHpScale),
  enemyDmgScale: compileFormula(stageCurves.enemyDmgScale),
};

export function stageEnemyPool(stage: number): string[] {
  const pool = ['grub','rat'];
  if (stage>=2) pool.push('armored');
  if (stage>=3) pool.push('wing');
  if (stage>=4) pool.push('charger');
  if (stage>=5) pool.push('spitter');
  if (stage>=7) pool.push('splitter');
  if (stage>=9) pool.push('shadow');
  if (stage>=11) pool.push('bomber');
  if (stage>=13) pool.push('giant');
  return pool;
}

export function inflationRate(stage: number): number {
  return CURVES.inflationRate({ stage });
}

export function stageSpawnRate(stage: number): number {
  return CURVES.stageSpawnRate({ stage });
}

export function enemyScale(stage: number): { hp: number; dmg: number } {
  const hp = CURVES.enemyHpScale({ stage });
  const dmg = CURVES.enemyDmgScale({ stage });
  return { hp, dmg };
}