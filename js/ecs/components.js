/* =========================================================
   蚀月远征 · ECS 组件定义
   轻量级组件工厂函数，用于规范化实体组合
   每个组件是一个纯数据工厂，返回可合并的平面对象
   ========================================================= */

/**
 * 位置组件
 * @param {number} x
 * @param {number} y
 */
export function Position(x, y) {
  return { x, y };
}

/**
 * 生命组件
 * @param {number} hp
 * @param {number} [maxHp]
 */
export function Health(hp, maxHp) {
  return { hp, maxHp: maxHp ?? hp };
}

/**
 * 渲染组件
 * @param {string} color
 * @param {number} size
 * @param {string} [shape]
 */
export function Renderable(color, size, shape) {
  return { color, size, ...(shape ? { shape } : {}) };
}

/**
 * 速度组件
 * @param {number} vx
 * @param {number} vy
 */
export function Velocity(vx, vy) {
  return { vx, vy };
}

/**
 * 战斗组件
 * @param {number} dmg
 * @param {number} [pierce]
 * @param {number} [crit]
 */
export function Combat(dmg, pierce, crit) {
  return { dmg, ...(pierce !== undefined ? { pierce } : {}), ...(crit !== undefined ? { crit } : {}) };
}

/**
 * 计时器组件
 * @param {number} t
 * @param {number} [life]
 */
export function Timer(t, life) {
  return { t, ...(life !== undefined ? { life, max: life } : {}) };
}

/**
 * 状态效果组件
 * @param {number} [slow]
 * @param {number} [stun]
 * @param {number} [bleed]
 * @param {number} [flash]
 */
export function Status(slow, stun, bleed, flash) {
  const s = {};
  if (slow !== undefined) s.slow = slow;
  if (stun !== undefined) s.stun = stun;
  if (bleed !== undefined) s.bleed = bleed;
  if (flash !== undefined) s.flash = flash;
  return s;
}

/**
 * 敌方标记组件
 * @param {string} type
 * @param {boolean} [boss]
 */
export function Enemy(type, boss) {
  return { type, boss: !!boss };
}

/**
 * 投射物标记组件
 * @param {string} wId
 * @param {number} [range]
 * @param {number} [speed]
 * @param {number} [radius]
 */
export function Projectile(wId, range, speed, radius) {
  return { wId, range, speed, ...(radius !== undefined ? { r: radius } : {}) };
}

/**
 * 掉落物组件
 * @param {string} kind  'xp' | 'gold'
 * @param {number} amount
 */
export function Drop(kind, amount) {
  return { kind, amount, t: 0, take: false };
}

/**
 * 粒子组件
 * @param {number} vx
 * @param {number} vy
 * @param {number} life
 * @param {string} color
 * @param {number} size
 */
export function Particle(vx, vy, life, color, size) {
  return { vx, vy, life, max: life, color, size, t: 0 };
}

/**
 * 残像组件（月影残像）
 * @param {number} dmg
 * @param {number} max
 * @param {number} [fireT]
 */
export function Phantom(dmg, max, fireT) {
  return { dmg, max, fireT: fireT ?? 0, t: 0 };
}

/**
 * 光环组件
 * @param {number} [slow]
 * @param {number} [dmg]
 * @param {number} [range]
 */
export function Aura(slow, dmg, range) {
  const a = {};
  if (slow !== undefined) a.auraSlow = slow;
  if (dmg !== undefined) a.auraDmg = dmg;
  if (range !== undefined) a.auraRange = range;
  return a;
}

/**
 * 创建实体：合并多个组件为一个平面对象
 * 兼容 EntityPool.addWith() 的接口
 * @param  {...object} components
 * @returns {any}
 */
export function createEntity(...components) {
  return Object.assign({}, ...components);
}