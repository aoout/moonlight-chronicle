/* =========================================================
   蚀月远征 · 数据类型定义（数据层）
   仅包含纯类型定义，不再声明运行时值。
   运行时值的类型由各 .ts 文件通过 typeof 推导。
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