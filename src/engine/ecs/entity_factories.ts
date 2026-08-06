/* =========================================================
   蚀月远征 · 实体工厂函数
   用于规范化实体数据结构的纯数据工厂
   ========================================================= */

export function Position(x: number, y: number) {
  return { x, y };
}

export function Health(hp: number, maxHp?: number) {
  return { hp, maxHp: maxHp ?? hp };
}

export function Renderable(color: string, size: number, shape?: string) {
  return { color, size, ...(shape ? { shape } : {}) };
}

export function Velocity(vx: number, vy: number) {
  return { vx, vy };
}

export function Combat(dmg: number, pierce?: number, crit?: number) {
  return { dmg, ...(pierce !== undefined ? { pierce } : {}), ...(crit !== undefined ? { crit } : {}) };
}

export function Timer(t: number, life?: number) {
  return { t, ...(life !== undefined ? { life, max: life } : {}) };
}

export function Status(slow?: number, stun?: number, bleed?: number, flash?: number) {
  const s: Record<string, any> = {};
  if (slow !== undefined) s.slow = slow;
  if (stun !== undefined) s.stun = stun;
  if (bleed !== undefined) s.bleed = bleed;
  if (flash !== undefined) s.flash = flash;
  return s;
}

export function Enemy(type: string, boss?: boolean) {
  return { type, boss: !!boss };
}

export function Projectile(wId: string, range?: number, speed?: number, radius?: number) {
  return { wId, range, speed, ...(radius !== undefined ? { r: radius } : {}) };
}