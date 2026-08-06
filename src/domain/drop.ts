/* =========================================================
   蚀月远征 · 领域模块：掉落物逻辑
   掉落物追踪 / 拾取 / 爆炸
   从 DropSystem 静态方法迁出
   ========================================================= */
import { PALETTE } from '../assets/palette.js';
import { EVENTS } from '../engine/core/events.js';
import { playerState } from '../state/player.js';
import { dist, angTo } from '../engine/util/utils.js';
import { CONFIG } from '../config/index.js';
import { EventBus } from '../engine/core/event_bus.js';
import { healPlayer, hurtPlayer } from './combat.js';
import { gainXp, addGold } from './player.js';
import type { Drop, EnemyInstance } from '../types/core.d.ts';

import { pSt } from '../state/accessors.js';

/** 掉落物 tick */
export function dropTick(d: Drop, dt: number): void {
  const p = pSt().player;
  if (!p) return;
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

/** 拾取掉落物 */
export function collectDrop(d: Drop): void {
  if (d.take) return;
  d.take = 1;
  EventBus.emit(EVENTS.AUDIO_SFX, { name: 'pickup' });
  const p = pSt().player;
  if (p && d.kind === 'gold' && p.effects.coinHeal) healPlayer(p.effects.coinHeal * d.amount);
  if (d.kind === 'xp') gainXp(d.amount);
  else addGold(d.amount);
  EventBus.emit(EVENTS.VISUAL_BURST, { x: d.x, y: d.y, color: d.kind === 'xp' ? PALETTE.ice : PALETTE.gold, count: 6 });
}

/** 自爆 */
export function explodeEnemy(e: EnemyInstance, hurtPlayerToo: boolean): void {
  // 自爆：火球光爆 + 冲击环 + 碎片 + 白炽火花 + 烟尘
  EventBus.emit(EVENTS.VISUAL_RING, { x: e.x, y: e.y, color: PALETTE.ember, life: 0.42, radius: 70, width: 3.5 });
  EventBus.emit(EVENTS.VISUAL_RING, { x: e.x, y: e.y, color: PALETTE.cream, life: 0.28, radius: 42, width: 2 });
  EventBus.emit(EVENTS.VISUAL_GLOW, { x: e.x, y: e.y, color: PALETTE.tangerine, size: 22, life: 0.4 });
  EventBus.emit(EVENTS.VISUAL_BURST, { x: e.x, y: e.y, color: PALETTE.peach, count: 18 });
  EventBus.emit(EVENTS.VISUAL_SHARD, { x: e.x, y: e.y, color: PALETTE.heavy, count: 7, speed: 230 });
  EventBus.emit(EVENTS.VISUAL_SPARK, { x: e.x, y: e.y, color: PALETTE.warmWhite, count: 9, speed: 220 });
  const p = pSt().player;
  if (hurtPlayerToo && p && dist(e, p) < 90) hurtPlayer(e, e.dmg);
}
