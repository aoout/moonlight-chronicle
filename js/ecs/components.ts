/* =========================================================
   蚀月远征 · ECS 组件定义
   轻量级组件工厂函数，用于规范化实体组合
   每个组件是一个纯数据工厂，返回可合并的平面对象
   ========================================================= */

export function Position(x: number, y: number): Record<string, any> {
  return { x, y };
}

export function Health(hp: number, maxHp?: number): Record<string, any> {
  return { hp, maxHp: maxHp ?? hp };
}

export function Renderable(color: string, size: number, shape?: string): Record<string, any> {
  return { color, size, ...(shape ? { shape } : {}) };
}

export function Velocity(vx: number, vy: number): Record<string, any> {
  return { vx, vy };
}

export function Combat(dmg: number, pierce?: number, crit?: number): Record<string, any> {
  return { dmg, ...(pierce !== undefined ? { pierce } : {}), ...(crit !== undefined ? { crit } : {}) };
}

export function Timer(t: number, life?: number): Record<string, any> {
  return { t, ...(life !== undefined ? { life, max: life } : {}) };
}

export function Status(slow?: number, stun?: number, bleed?: number, flash?: number): Record<string, any> {
  const s: Record<string, any> = {};
  if (slow !== undefined) s.slow = slow;
  if (stun !== undefined) s.stun = stun;
  if (bleed !== undefined) s.bleed = bleed;
  if (flash !== undefined) s.flash = flash;
  return s;
}

export function Enemy(type: string, boss?: boolean): Record<string, any> {
  return { type, boss: !!boss };
}

export function Projectile(wId: string, range?: number, speed?: number, radius?: number): Record<string, any> {
  return { wId, range, speed, ...(radius !== undefined ? { r: radius } : {}) };
}

export function Drop(kind: string, amount: number): Record<string, any> {
  return { kind, amount, t: 0, take: false };
}

export function Particle(vx: number, vy: number, life: number, color: string, size: number): Record<string, any> {
  return { vx, vy, life, max: life, color, size, t: 0 };
}

export function Phantom(dmg: number, max: number, fireT?: number): Record<string, any> {
  return { dmg, max, fireT: fireT ?? 0, t: 0 };
}

export function Aura(slow?: number, dmg?: number, range?: number): Record<string, any> {
  const a: Record<string, any> = {};
  if (slow !== undefined) a.auraSlow = slow;
  if (dmg !== undefined) a.auraDmg = dmg;
  if (range !== undefined) a.auraRange = range;
  return a;
}

/** 创建实体：合并多个组件为一个平面对象 */
export function createEntity(...components: Record<string, any>[]): Record<string, any> {
  return Object.assign({}, ...components);
}
