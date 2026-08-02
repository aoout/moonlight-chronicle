/* =========================================================
   蚀月远征 · 数据类型定义（数据层）
   ========================================================= */
import type {
  Player, WeaponDef, EnemyDef, BossDef,
  ShopItemDef, BlessingDef, CurseDef, LevelDef, Config,
} from './core.d.ts';

/* ---------- 属性定义 ---------- */
export interface StatDef {
  name: string;
  icon: string;
  color: string;
  fmt: (v: number) => string | number;
}

/* ---------- 武器库 ---------- */
export const WEAPONS: Record<string, WeaponDef>;
export const WEAPON_UPGRADE_COST: number[];

/* ---------- 敌人图鉴 ---------- */
export const ENEMIES: Record<string, EnemyDef>;
export function levelEnemyScale(level: number): { hp: number; dmg: number };

/* ---------- Boss ---------- */
export const BOSSES: Record<string, BossDef>;
export const BOSS_POOLS: Record<number, string[]>;

/* ---------- 商店道具 ---------- */
export const SHOP_ITEMS: ShopItemDef[];

/* ---------- 祝福 ---------- */
export const BLESSINGS: BlessingDef[];
export function pickBlessings(n: number, excludeIds?: string[]): BlessingDef[];

/* ---------- 关卡 ---------- */
export const LEVELS: LevelDef[];
export const CURSES: CurseDef[];
export const STAGE_NAMES: string[];
export function stageEnemyPool(stage: number): string[];
export function inflationRate(stage: number): number;
export function stageSpawnRate(stage: number): number;
export function enemyScale(stage: number): { hp: number; dmg: number };

/* ---------- 配置 ---------- */
export const CONFIG: Config;

/* ---------- 属性系统 ---------- */
export const STATS: Record<string, StatDef>;
export const STAT_ORDER: string[];
export const BASE_STATS: Record<string, number>;