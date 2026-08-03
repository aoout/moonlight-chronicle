/* =========================================================
   蚀月远征 · 核心类型定义
   ========================================================= */

/* ---------- 玩家运行时效果（道具/祝福/诅咒触发的状态） ---------- */
export interface ItemStats {
  /** 总伤害（获得以来） */
  dmg: number;
  /** 当前夜晚的伤害 */
  stageDmg: number;
  /** 上一夜的伤害 */
  lastStageDmg: number;
  /** 额外金币总数（金币流星等） */
  extraGold: number;
  /** 当前夜晚的额外金币 */
  stageExtraGold: number;
  /** 上一夜的额外金币 */
  lastStageExtraGold: number;
}

export interface PlayerEffects {
  priceMul?: number;
  enemyHpMul?: number;
  enemyDmgMul?: number;
  shieldMax?: number;
  shield?: number;
  shieldTimer?: number;
  nearDeath?: number;
  hunt?: number;
  huntTimer?: number;
  huntStacks?: number;
  duoShoot?: number;
  frostAura?: number;
  goldMeteor?: number;
  splash?: number;
  critBoom?: number;
  devour?: number;
  cloak?: number;
  cloakTimer?: number;
  starfall?: number;
  starTimer?: number;
  tideRegen?: number;
  regenBuff?: number;
  oath?: number;
  horde?: number;
  echoSlow?: number;
  echoTimer?: number;
  coinHeal?: number;
  curseTimer?: number;
  boughtItems?: Record<string, number>;
  /* 时停激活层 */
  tsActive?: number;
  /* 环舞之刃运行时状态 */
  orbits?: Array<{ x: number; y: number; a: number }>;
  orbitHits?: Record<string, number>;
  /* 风暴之眼运行时状态 */
  stormCores?: Array<{ x: number; y: number; a: number }>;
  stormFireT?: Record<string, number>;
  /* 道具统计（伤害/金币等） */
  itemStats?: Record<string, ItemStats>;
}

/* ---------- 玩家 ---------- */
export interface Player {
  x: number; y: number;
  r: number; facing: number; invuln: number; level: number;
  weapons: WeaponInstance[];
  animT: number;
  /* 基础属性 (BASE_STATS) */
  maxHp: number; hp: number; armor: number; speed: number; atk: number;
  atkSpd: number; critRate: number; critDmg: number; lifesteal: number;
  regen: number; projCount: number; area: number; duration: number;
  luck: number; xpGain: number; goldGain: number; dodge: number;
  cdr: number; magnet: number; thorns: number;
  /* 转模属性 */
  speedToCrit: number; armorToAtk: number; hpToAtk: number;
  atkToSpd: number; critToAtk: number;
  /* 特殊效果 */
  onKillHp: number; lowHpDmg: number; fullHpCrit: number;
  chainLightning: number; pierce: number; boom: number;
  autoPick: number; scaleLevel: number; scaleStage: number;
  luckToGold: number; timeStop: number; echo: number;
  /* 派生属性（由 computeDerived 计算） */
  effAtk: number; effCrit: number; effSpeed: number;
  effGold: number; effAtkSpd: number;
  /* 运行时速度向量 */
  vx: number; vy: number;
  /* 道具/祝福/诅咒运行时效果（独立对象，避免 Player 上帝类型） */
  effects: PlayerEffects;
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
  cores?: number;
  slow?: number;
  homing?: boolean;
  fire?: WeaponFireConfig;
}

export interface WeaponFireConfig {
  targeting?: string;
  pattern?: string;
  spread?: number;
  count?: ((p: Player) => number) | number | string;
  range?: number;
  lv?: number;
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
  dur?: number;
  width?: number;
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
  split?: number;
  splitHp?: number;
  dash?: number;
  projSpd?: number;
  projDmg?: number;
  ranged?: boolean;
}

export interface EnemyInstance {
  /* schema 字段（E_SCHEMA） */
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number; dmg: number; spd: number; size: number;
  flash: number; t: number; wob: number;
  slow: number; auraSlow: number; dead: number;
  stateT: number; skillT: number; skillP: number;
  skillA: number; skillB: number;
  bleed: number; stun: number;
  attT: number; attCd: number;
  /* 非 schema 字段（视图动态属性） */
  color?: string;
  name?: string;
  type?: string;
  exp?: number;
  gold?: number;
  hit?: Set<string>;
  boss?: boolean;
  state?: string;
  shape?: string;
  split?: number;
  splitHp?: number;
  dash?: number;
  projSpd?: number;
  projDmg?: number;
  ranged?: boolean;
  skills?: string[];
  life?: number;
  max?: number;
  /* 环舞之刃命中节流 */
  _orbitT?: number;
  /* 视图基础设施 */
  _meta?: Record<string, any>;
  _idx?: number;
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
  attCd?: number;
}

/* ---------- 投射物 ---------- */
export interface Projectile {
  /* schema 字段（P_SCHEMA） */
  x: number; y: number; vx: number; vy: number;
  r: number; dmg: number; t: number; life: number; pierce: number;
  speed: number; range: number; width: number; maxR: number;
  delay: number; spin: number; dir: number;
  owner: number; ret: number; hitPlayer: number;
  meteor: number; aoe: number; beam: number; boomerang: number;
  homing: number; trail: number; acid: number; ground: number;
  breath: number; slow: number; enemy: number; dead: number;
  /* 非 schema 字段（视图动态属性） */
  color?: string;
  wId?: string;
  hit?: Set<EnemyInstance>;
  target?: EnemyInstance;
  dur?: number;
  chain?: number;
  chainCount?: number;
  chainFall?: number;
  chainRange?: number;
  size?: number;
  max?: number;
  /* 视图基础设施 */
  _meta?: Record<string, any>;
  _idx?: number;
}

/* ---------- 掉落物 ---------- */
export interface Drop {
  /* schema 字段（D_SCHEMA） */
  x: number; y: number; vx: number; vy: number;
  t: number; amount: number; take: number;
  /* 非 schema 字段（视图动态属性） */
  kind?: string;
  color?: string;
  /* 视图基础设施 */
  _meta?: Record<string, any>;
  _idx?: number;
}

/* ---------- 残像 ---------- */
export interface Phantom {
  /* schema 字段（PH_SCHEMA） */
  x: number; y: number; t: number; max: number;
  dmg: number; fireT: number; lv: number;
  /* 非 schema 字段（视图动态属性） */
  life?: number;
  /* 视图基础设施 */
  _meta?: Record<string, any>;
  _idx?: number;
}

/* ---------- 粒子 ---------- */
export interface Particle {
  /* schema 字段（PA_SCHEMA） */
  x: number; y: number; vx: number; vy: number;
  t: number; max: number; life: number; size: number;
  r0: number; r1: number; lw: number; rot: number;
  vr: number; ang: number; len: number; w: number;
  x1: number; y1: number; x2: number; y2: number;
  chain: number; ring: number; spark: number; star: number;
  shard: number; streak: number; glow: number;
  timestop: number; echo: number; dead: number;
  /* 非 schema 字段（视图动态属性） */
  color?: string;
  dmg?: number;
  /* 视图基础设施 */
  _meta?: Record<string, any>;
  _idx?: number;
}

/* ---------- 道具 ---------- */
export interface ShopItemDef {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  price: number;
  desc: string;
  max?: number;
  tag?: string;
  apply: (p: Player) => void;
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
}

/* ---------- 诅咒 ---------- */
export interface CurseDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  apply: (p: Player) => void;
}

/* ---------- 关卡 ---------- */
export interface LevelDef {
  name: string;
  tag: string;
  color: string;
  desc: string;
  enemies?: string[];
  elite?: string[];
}

/* ---------- 运行统计 ---------- */
export interface RunStats {
  totalDmg: number;
  bossKills: number;
  win: boolean;
  wDmg: Record<string, number>;
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
  SHOP_WEAPON_OFFERS: number;
  PICKUP_RADIUS: number;
  MIRROR_DECAY: number;
}
