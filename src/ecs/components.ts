/* =========================================================
   蚀月远征 · ECS 组件定义
   轻量级组件工厂函数，用于规范化实体组合
   每个组件是一个纯数据工厂，返回可合并的平面对象
   ========================================================= */

/* ---------- 组件接口 ---------- */
export interface PositionComponent {
  x: number;
  y: number;
}

export interface HealthComponent {
  hp: number;
  maxHp: number;
}

export interface RenderableComponent {
  color: string;
  size: number;
  shape?: string;
}

export interface VelocityComponent {
  vx: number;
  vy: number;
}

export interface CombatComponent {
  dmg: number;
  pierce?: number;
  crit?: number;
}

export interface TimerComponent {
  t: number;
  life?: number;
  max?: number;
}

export interface StatusComponent {
  slow?: number;
  stun?: number;
  bleed?: number;
  flash?: number;
}

export interface EnemyComponent {
  type: string;
  boss?: boolean;
}

export interface ProjectileComponent {
  wId: string;
  range?: number;
  speed?: number;
  r?: number;
}

export interface DropComponent {
  kind: string;
  amount: number;
  t: number;
  take: boolean;
}

export interface ParticleComponent {
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  t: number;
}

export interface PhantomComponent {
  dmg: number;
  max: number;
  fireT: number;
  t: number;
}

export interface AuraComponent {
  auraSlow?: number;
  auraDmg?: number;
  auraRange?: number;
}

/** 组件联合类型，用于 createEntity 参数 */
export type Component =
  | PositionComponent
  | HealthComponent
  | RenderableComponent
  | VelocityComponent
  | CombatComponent
  | TimerComponent
  | StatusComponent
  | EnemyComponent
  | ProjectileComponent
  | DropComponent
  | ParticleComponent
  | PhantomComponent
  | AuraComponent
  | Record<string, any>; // 允许内联扩展属性

/* ---------- 组件工厂 ---------- */

export function Position(x: number, y: number): PositionComponent {
  return { x, y };
}

export function Health(hp: number, maxHp?: number): HealthComponent {
  return { hp, maxHp: maxHp ?? hp };
}

export function Renderable(color: string, size: number, shape?: string): RenderableComponent {
  return { color, size, ...(shape ? { shape } : {}) };
}

export function Velocity(vx: number, vy: number): VelocityComponent {
  return { vx, vy };
}

export function Combat(dmg: number, pierce?: number, crit?: number): CombatComponent {
  return { dmg, ...(pierce !== undefined ? { pierce } : {}), ...(crit !== undefined ? { crit } : {}) };
}

export function Timer(t: number, life?: number): TimerComponent {
  return { t, ...(life !== undefined ? { life, max: life } : {}) };
}

export function Status(slow?: number, stun?: number, bleed?: number, flash?: number): StatusComponent {
  const s: Record<string, any> = {};
  if (slow !== undefined) s.slow = slow;
  if (stun !== undefined) s.stun = stun;
  if (bleed !== undefined) s.bleed = bleed;
  if (flash !== undefined) s.flash = flash;
  return s;
}

export function Enemy(type: string, boss?: boolean): EnemyComponent {
  return { type, boss: !!boss };
}

export function Projectile(wId: string, range?: number, speed?: number, radius?: number): ProjectileComponent {
  return { wId, range, speed, ...(radius !== undefined ? { r: radius } : {}) };
}

export function Drop(kind: string, amount: number): DropComponent {
  return { kind, amount, t: 0, take: false };
}

export function Particle(vx: number, vy: number, life: number, color: string, size: number): ParticleComponent {
  return { vx, vy, life, max: life, color, size, t: 0 };
}

export function Phantom(dmg: number, max: number, fireT?: number): PhantomComponent {
  return { dmg, max, fireT: fireT ?? 0, t: 0 };
}

export function Aura(slow?: number, dmg?: number, range?: number): AuraComponent {
  const a: Record<string, any> = {};
  if (slow !== undefined) a.auraSlow = slow;
  if (dmg !== undefined) a.auraDmg = dmg;
  if (range !== undefined) a.auraRange = range;
  return a;
}

/** 创建实体：合并多个组件为一个平面对象 */
export function createEntity(...components: Component[]): Record<string, any> {
  return Object.assign({}, ...components);
}