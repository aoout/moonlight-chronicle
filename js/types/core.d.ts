/* =========================================================
   蚀月远征 · 核心类型定义
   ========================================================= */

/* ---------- 玩家 ---------- */
export interface Player {
  x: number; y: number;
  r: number; facing: number; invuln: number; level: number;
  weapons: WeaponInstance[];
  animT: number;
  // 基础属性 (BASE_STATS)
  maxHp: number; hp: number; armor: number; speed: number; atk: number;
  atkSpd: number; critRate: number; critDmg: number; lifesteal: number;
  regen: number; projCount: number; area: number; duration: number;
  luck: number; xpGain: number; goldGain: number; dodge: number;
  cdr: number; magnet: number; thorns: number;
  // 转模属性
  speedToCrit: number; armorToAtk: number; hpToAtk: number;
  atkToSpd: number; critToAtk: number;
  // 特殊效果
  onKillHp: number; lowHpDmg: number; fullHpCrit: number;
  chainLightning: number; pierce: number; boom: number;
  autoPick: number; scaleLevel: number; scaleStage: number;
  luckToGold: number; timeStop: number; echo: number;
  // 派生属性（由 computeDerived 计算）
  effAtk: number; effCrit: number; effSpeed: number;
  effGold: number; effAtkSpd: number;
  // 运行时
  [key: string]: any;
}

/* ---------- 武器 ---------- */
export interface WeaponInstance {
  id: string;
  lv: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  icon: string;
  tag: string;
  desc: string;
  formula: string;
  formulaDmg?: string;
  dmg: (p: Player, lv: number) => number;
  cd?: (p?: Player) => number;
  pierce?: number;
  range?: number;
  speed?: number;
  color: string;
  aoe?: number;
  proj?: number;
  count?: number;
  tick?: number;
  radius?: number;
  blades?: number;
  slow?: number;
  homing?: boolean;
  fire?: WeaponFireConfig;
}

export interface WeaponFireConfig {
  targeting?: string;
  pattern?: string;
  spread?: number;
  count?: ((p: Player) => number) | number | string;
  projectile?: ProjectileConfig;
}

export interface ProjectileConfig {
  type?: string;
  speed?: number;
  range?: number;
  radius?: number;
  pierce?: number;
  color?: string;
  owner?: boolean;
  life?: number;
  trail?: boolean;
  delay?: number;
  aoe?: number;
  slow?: number;
  chain?: number;
  chainFall?: number;
  chainRange?: number;
  [key: string]: any;
}

/* ---------- 敌人 ---------- */
export interface EnemyDef {
  name: string;
  icon: string;
  hp: number;
  spd: number;
  size: number;
  dmg: number;
  gold?: number;
  xp?: number;
  color: string;
  flash?: string;
  move?: string;
  desc: string;
  [key: string]: any;
}

export interface EnemyInstance {
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; dmg: number; spd: number; size: number;
  flash: number; t: number; wob: number;
  slow: number; auraSlow: number; dead: number;
  stateT: number; skillT: number; skillP: number;
  skillA: number; skillB: number;
  bleed: number; stun: number;
  attT: number; attCd: number;
  color?: string; name?: string; type?: string; exp?: number;
  gold?: number; hit?: Set<string>;
  _meta?: any; _idx?: number;
  [key: string]: any;
}

/* ---------- Boss ---------- */
export interface BossDef {
  name: string;
  hp: number;
  spd: number;
  size: number;
  dmg: number;
  gold: number;
  xp: number;
  color: string;
  icon: string;
  desc: string;
  skills: string[];
  [key: string]: any;
}

/* ---------- 投射物 ---------- */
export interface Projectile {
  x: number; y: number; vx: number; vy: number;
  r: number; dmg: number; t: number; life: number; pierce: number;
  speed: number; range: number; width: number; maxR: number;
  delay: number; spin: number; dir: number;
  owner: number; ret: number; hitPlayer: number;
  meteor: number; aoe: number; beam: number; boomerang: number;
  homing: number; trail: number; acid: number; ground: number;
  breath: number; slow: number; enemy: number; dead: number;
  color?: string; wId?: string; hit?: Set<string>;
  _meta?: any; _idx?: number;
  [key: string]: any;
}

/* ---------- 掉落物 ---------- */
export interface Drop {
  x: number; y: number; vx: number; vy: number;
  t: number; amount: number; take: number;
  type?: string; color?: string;
  _meta?: any; _idx?: number;
  [key: string]: any;
}

/* ---------- 残像 ---------- */
export interface Phantom {
  x: number; y: number; t: number; max: number;
  dmg: number; fireT: number; lv: number;
  _meta?: any; _idx?: number;
  [key: string]: any;
}

/* ---------- 粒子 ---------- */
export interface Particle {
  x: number; y: number; vx: number; vy: number;
  t: number; max: number; life: number; size: number;
  r0: number; r1: number; lw: number; rot: number;
  vr: number; ang: number; len: number; w: number;
  x1: number; y1: number; x2: number; y2: number;
  chain: number; ring: number; spark: number; star: number;
  shard: number; streak: number; glow: number;
  timestop: number; echo: number; dead: number;
  color?: string; dmg?: number;
  _meta?: any; _idx?: number;
  [key: string]: any;
}

/* ---------- 道具 ---------- */
export interface ShopItemDef {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  price: number;
  desc: string;
  repeat?: boolean;
  tag?: string;
  apply: (p: Player) => void;
  [key: string]: any;
}

/* ---------- 祝福 ---------- */
export interface BlessingDef {
  id: string;
  name: string;
  icon: string;
  tier: string;
  weight: number;
  desc: string;
  apply: (p: Player) => void;
  [key: string]: any;
}

/* ---------- 诅咒 ---------- */
export interface CurseDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  apply: (p: Player) => void;
  [key: string]: any;
}

/* ---------- 关卡 ---------- */
export interface LevelDef {
  name: string;
  tag: string;
  color: string;
  desc: string;
  enemies?: string[];
  elite?: string[];
  [key: string]: any;
}

/* ---------- 运行统计 ---------- */
export interface RunStats {
  totalDmg: number;
  bossKills: number;
  win: boolean;
  wDmg: Record<string, number>;
  [key: string]: any;
}

/* ---------- 全局状态 G ---------- */
export interface GState {
  state: string;
  // 玩家切片
  player: Player | null;
  weaponCd: Record<string, number>;
  weaponCdFull: Record<string, number>;
  // 关卡切片
  stage: number;
  stageTime: number;
  stageMax: number;
  stageName: string;
  time: number;
  spawnAcc: number;
  boss: any | null;
  depth: number;
  curse: CurseDef | null;
  unlocked: number;
  paused: boolean;
  // 统计切片
  kills: number;
  gold: number;
  xp: number;
  xpNeeded: number;
  level: number;
  levelQueue: number;
  runStats: RunStats;
  // 渲染切片
  shake: number;
  hitFlash: number;
  timestopTimer: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  ctxBg: CanvasRenderingContext2D | null;
  // 输入切片
  keys: Record<string, boolean>;
  // 实体切片
  enemies: EnemyInstance[];
  projectiles: Projectile[];
  drops: Drop[];
  particles: Particle[];
  phantoms: Phantom[];
  // 运行时动态属性
  stageMax: number;
  xpNeeded: number;
  levelUpOpen: boolean;
  shopOpen: boolean;
  _resumeState: string;
  [key: string]: any;
}

/* ---------- 实体池类型 ---------- */
export declare class EntityPool {
  count: number;
  constructor(maxSize: number, schema: string[]);
  add(): any;
  addWith(data: Record<string, any>): any;
  setFields(idx: number, values: Record<string, any>): void;
  get(idx: number, field: string): number;
  set(idx: number, field: string, val: number): void;
  view(idx: number): any;
  compact(arr: any[], isDeadFn: (e: any) => boolean): void;
  reset(): void;
}

/* ---------- 配置常量 ---------- */
export interface Config {
  STAGES: number;
  STAGE_TIME: number;
  MAX_WEAPONS: number;
  LEVEL_UP_CHOICES: number;
  BOSS_STAGES: number[];
  FINAL_STAGE: number;
  XP_PER_LEVEL: number;
  XP_GROWTH: number;
  [key: string]: any;
}