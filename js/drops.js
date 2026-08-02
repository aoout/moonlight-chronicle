/* =========================================================
   蚀月远征 · 掉落系统：追踪 / 拾取 / 爆炸
   ========================================================= */
import { G } from './state.js';
import { dist, angTo } from './utils.js';
import { CONFIG } from './data/index.js';
import { spawnBurst } from './fx.js';
import { AudioEngine } from './audio.js';
import { gainXp, addGold } from './player_fn.js';
import { healPlayer, hurtPlayer } from './combat.js';

/* ---------- 掉落物 ---------- */
export function dropTick(d, dt) {
  const p = G.player;
  d.t += dt;
  d.x += d.vx * dt; d.y += d.vy * dt;
  d.vx *= 0.9; d.vy *= 0.9;
  const mag = p.magnet + (p.autoPick ? 400 : 0);
  const dd = dist(d, p);
  if (d.kind === 'xp' ? dd < mag : dd < mag * 0.9) {
    const a = angTo(d, p);
    d.x += Math.cos(a) * 240 * dt;
    d.y += Math.sin(a) * 240 * dt;
  }
  if (p.autoPick && dd < 500) { collectDrop(d); return; }
  if (dd < CONFIG.PICKUP_RADIUS + 8) collectDrop(d);
}
export function collectDrop(d) {
  if (d.take) return;
  d.take = true;
  AudioEngine.playSfx('pickup');
  if (d.kind === 'gold' && G.player._coinHeal) healPlayer(G.player._coinHeal * d.amount);
  if (d.kind === 'xp') gainXp(d.amount);
  else addGold(d.amount);
  spawnBurst(d.x, d.y, d.kind === 'xp' ? '#9fd6e8' : '#e9c987', 6);
}

/* ---------- 自爆 ---------- */
export function explodeEnemy(e, hurtPlayerToo) {
  spawnBurst(e.x, e.y, '#ff9d6b', 20);
  const p = G.player;
  if (hurtPlayerToo && dist(e, p) < 90) hurtPlayer(e, e.dmg);
}