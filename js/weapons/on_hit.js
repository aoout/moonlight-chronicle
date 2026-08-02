/* =========================================================
   蚀月远征 · 武器：命中效果模块
   可组合的命中效果，供 PROJ_TICK 使用
   ========================================================= */
import { RNG } from '../utils.js';
import { PALETTE } from '../palette.js';
import { damageEnemy } from '../enemies.js';
import { hurtPlayer } from '../combat.js';
import { AudioEngine } from '../audio.js';
import { addFx, spawnImpact, spawnStar, spawnRing, spawnStreak, spawnGlow } from '../fx.js';
import { chainLightning } from './chain_lightning.js';

/**
 * 命中效果注册表
 * 每个效果接收 (target, pr, p) → 执行命中效果
 * - target: 命中的敌人或玩家
 * - pr: 投射物
 * - p: 玩家
 * 返回是否消耗了穿透
 */
export const ON_HIT = {

  /** 基础伤害（通用） */
  damage({ target, isPlayer, pr, p }) {
    if (isPlayer) {
      hurtPlayer(target, pr.dmg);
      pr.dead = true;
      return false;
    }
    damageEnemy(target, pr.dmg, RNG() < p.effCrit, 'proj', pr.wId);
    AudioEngine.playSfx('hit');
    spawnImpact(target.x, target.y, pr.color, 0);
    return true;
  },

  /** 减速效果 */
  slow({ target, isPlayer, pr, p }) {
    if (isPlayer) return false;
    target.slow = Math.max(target.slow, pr.slow || 0.4);
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
    if (pr.wId === 'nova') {
      spawnStar(target.x, target.y, PALETTE.fireBright, 14);
      spawnRing(target.x, target.y, pr.color, 0.35, 36, 2.5);
    } else if (pr.wId === 'shadow') {
      spawnStar(target.x, target.y, PALETTE.violetDark, 10);
    } else if (pr.wId === 'storm') {
      spawnRing(target.x, target.y, pr.color, 0.28, 22, 2);
    } else if (pr.wId === 'lance') {
      spawnStreak(target.x, target.y, Math.atan2(pr.vy || 0, pr.vx || 0), 30, 2, '#ffffff', 0.25);
    } else if (pr.wId === 'arc' && pr.chain) {
      chainLightning(p, target, pr.dmg, pr.chainCount, pr.chainFall, pr.chainRange, pr.color, pr.wId);
    }
    return false;
  },
};