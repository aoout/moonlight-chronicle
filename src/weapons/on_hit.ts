/* =========================================================
   蚀月远征 · 武器：命中效果模块
   可组合的命中效果，供 PROJ_TICK 使用
   ========================================================= */
import { RNG } from '../utils.js';
import { PALETTE } from '../data/palette.js';
import { hurtPlayer, damageEnemy } from '../domain/combat.js';
import { AudioEngine } from '../audio/engine.js';
import { addFx, spawnImpact, spawnStar, spawnRing, spawnStreak, spawnGlow } from '../render/effects/fx.js';
import { chainLightning } from './chain_lightning.js';
import type { Player, Projectile, EnemyInstance } from '../types/core.d.ts';

export interface OnHitArgs {
  target: EnemyInstance | Player;
  isPlayer: boolean;
  pr: Projectile;
  p: Player;
}

/**
 * 命中效果注册表
 * 每个效果接收 (target, pr, p) → 执行命中效果
 * - target: 命中的敌人或玩家
 * - pr: 投射物
 * - p: 玩家
 * 返回是否消耗了穿透
 */
export const ON_HIT: Record<string, (args: OnHitArgs) => boolean> = {

  /** 基础伤害（通用） */
  damage({ target, isPlayer, pr, p }) {
    if (isPlayer) {
      hurtPlayer(target, pr.dmg);
      pr.dead = 1;
      return false;
    }
    const e = target as EnemyInstance;
    damageEnemy(e, pr.dmg, RNG() < p.effCrit, 'proj', pr.wId);
    AudioEngine.playSfx('hit');
    spawnImpact(e.x, e.y, pr.color || '#fff', 0);
    return true;
  },

  /** 减速效果 */
  slow({ target, isPlayer, pr, p }) {
    if (isPlayer) return false;
    (target as EnemyInstance).slow = Math.max((target as EnemyInstance).slow, pr.slow || 0.4);
    return false;
  },

  /** 陨石爆炸 */
  meteor({ target, isPlayer, pr, p }) {
    if (isPlayer) return false;
    // 在陨石 tick 中处理，此处不重复
    return false;
  },

  /** 光束效果 */
  beam({ target, isPlayer, pr, p }) {
    if (isPlayer) return false;
    addFx({ spark: true, x: target.x, y: target.y, vx: Math.cos(pr.dir) * 220, vy: Math.sin(pr.dir) * 220, t: 0, max: 0.25, size: 2, color: '#ffffff' });
    addFx({ spark: true, x: target.x, y: target.y, vx: -Math.cos(pr.dir) * 140, vy: -Math.sin(pr.dir) * 140, t: 0, max: 0.22, size: 1.5, color: pr.color });
    spawnStar(target.x, target.y, '#ffffff', 8);
    return false;
  },

  /** 武器专属命中特效 */
  weaponSpecific({ target, isPlayer, pr, p }) {
    if (isPlayer) return false;
    const e = target as EnemyInstance;
    if (pr.wId === 'nova') {
      spawnStar(e.x, e.y, PALETTE.fireBright, 14);
      spawnRing(e.x, e.y, pr.color || '#fff', 0.35, 36, 2.5);
    } else if (pr.wId === 'shadow') {
      spawnStar(e.x, e.y, PALETTE.violetDark, 10);
    } else if (pr.wId === 'storm') {
      spawnRing(e.x, e.y, pr.color || '#fff', 0.28, 22, 2);
    } else if (pr.wId === 'lance') {
      spawnStreak(e.x, e.y, Math.atan2(pr.vy || 0, pr.vx || 0), 30, 2, '#ffffff', 0.25);
    } else if (pr.wId === 'arc' && pr.chain) {
      chainLightning(p, e, pr.dmg, pr.chainCount || 0, pr.chainFall || 0.65, pr.chainRange || 340, pr.color || '#fff', pr.wId);
    }
    return false;
  },
};
