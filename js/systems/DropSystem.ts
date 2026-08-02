/* =========================================================
   蚀月远征 · ECS System：掉落物更新 + 压缩
   掉落物追踪 / 拾取 / 爆炸
   ========================================================= */
import { System } from '../core/system.js';
import { G } from '../state.js';
import { playerState } from '../state/player.js';
import { world } from '../ecs/World.js';
import { dist, angTo } from '../utils.js';
import { CONFIG } from '../data/index.js';
import { spawnBurst } from '../fx.js';
import { AudioEngine } from '../audio.js';
import { CombatSystem, hurtPlayer } from './CombatSystem.js';
import { PlayerSystem } from './PlayerSystem.js';

export class DropSystem extends System {
  name = 'DropSystem';

  update(dt: number): void {
    const drops = world.query('drops');
    for (const d of drops) DropSystem.dropTick(d, dt);
    world.compact('drops', d => d.take);
  }

  /* =============================================================
     静态方法（从 drops.js 迁移）
     ============================================================= */

  /** 掉落物 tick */
  static dropTick(d: any, dt: number): void {
    const p = G.player;
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
    if (p.autoPick && dd < 500) { DropSystem.collectDrop(d); return; }
    if (dd < CONFIG.PICKUP_RADIUS + 8) DropSystem.collectDrop(d);
  }

  /** 拾取掉落物 */
  static collectDrop(d: any): void {
    if (d.take) return;
    d.take = true;
    AudioEngine.playSfx('pickup');
    const p = G.player;
    if (p && d.kind === 'gold' && p._coinHeal) CombatSystem.healPlayer(p._coinHeal * d.amount);
    if (d.kind === 'xp') PlayerSystem.gainXp(d.amount);
    else PlayerSystem.addGold(d.amount);
    spawnBurst(d.x, d.y, d.kind === 'xp' ? '#9fd6e8' : '#e9c987', 6);
  }

  /** 自爆 */
  static explodeEnemy(e: any, hurtPlayerToo: boolean): void {
    spawnBurst(e.x, e.y, '#ff9d6b', 20);
    const p = G.player;
    if (hurtPlayerToo && p && dist(e, p) < 90) hurtPlayer(e, e.dmg);
  }
}
