// Test the syntax that's supposedly failing
const PROJECTILE_POOL = { addWith(d) { return d; } };
const G = { projectiles: [] };
const e = { x: 100, y: 100, dmg: 50 };
const ang = 1.2;
G.projectiles.push(PROJECTILE_POOL.addWith({ acid: true, x: e.x, y: e.y, vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230,
  r: 6, dmg: e.dmg * 0.9, color: '#7fce5a', hit: new Set(), enemy: true, life: 1.8, wId: 'enemy' }));
console.log('OK');