/* =========================================================
   蚀月远征 · 武器：命中效果模块
   可组合的命中效果，供 PROJ_TICK 使用
   ========================================================= */
import { PALETTE } from '../../assets/palette.js';
import { RNG } from '../../engine/util/utils.js';
import { hurtPlayer, damageEnemy } from '../combat.js';
import { AudioEngine } from '../../platform/audio/engine.js';
import { addFx, spawnImpact, spawnStar, spawnRing, spawnStreak, spawnGlow, spawnSpark, spawnShard } from '../../platform/fx/fx.js';
import { chainLightning } from './chain_lightning.js';
import type { Player, Projectile, EnemyInstance } from '../../types/core.d.ts';

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
    spawnImpact(e.x, e.y, pr.color || PALETTE.white, 0);
    return true;
  },

  /** 减速效果 */
  slow({ target, isPlayer, pr, p }) {
    if (isPlayer) return false;
    // 仅在显式配置 slow 时生效（0 或 undefined 均不减速）。
    // 修复前用 `pr.slow || 0.4` 兜底，会导致未配置 slow 的 aoe
    // 投射物被隐式减速 0.4 —— 魔法数字，违背数值 rationale。
    if (!pr.slow) return false;
    (target as EnemyInstance).slow = Math.max((target as EnemyInstance).slow, pr.slow);
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
    addFx({ spark: true, x: target.x, y: target.y, vx: Math.cos(pr.dir) * 220, vy: Math.sin(pr.dir) * 220, t: 0, max: 0.25, size: 2, color: PALETTE.white });
    addFx({ spark: true, x: target.x, y: target.y, vx: -Math.cos(pr.dir) * 140, vy: -Math.sin(pr.dir) * 140, t: 0, max: 0.22, size: 1.5, color: pr.color });
    spawnStar(target.x, target.y, PALETTE.white, 8);
    return false;
  },

  /** 武器专属命中特效 */
  weaponSpecific({ target, isPlayer, pr, p }) {
    if (isPlayer) return false;
    const e = target as EnemyInstance;
    const w = pr.wId || '';
    if (w === 'nova') {
      spawnStar(e.x, e.y, PALETTE.fireBright, 14);
      spawnRing(e.x, e.y, pr.color || PALETTE.white, 0.35, 36, 2.5);
    } else if (w === 'shadow') {
      spawnStar(e.x, e.y, PALETTE.shadowDark, 10);
      spawnShard(e.x, e.y, PALETTE.shadowDark, 4, 120);
    } else if (w === 'storm') {
      spawnRing(e.x, e.y, pr.color || PALETTE.swift, 0.32, 28, 2.2);
      spawnSpark(e.x, e.y, PALETTE.swift, 5, 110);
    } else if (w === 'lance') {
      spawnStreak(e.x, e.y, Math.atan2(pr.vy || 0, pr.vx || 0), 30, 2, PALETTE.white, 0.25);
      spawnSpark(e.x, e.y, PALETTE.ice, 3, 90);
    } else if (w === 'moonRing') {
      // 月辉回刃：月牙闪光 + 金色星尘
      spawnRing(e.x, e.y, PALETTE.gold, 0.3, 26, 2);
      spawnSpark(e.x, e.y, PALETTE.gold, 4, 120);
      spawnStar(e.x, e.y, PALETTE.white, 6);
    } else if (w === 'frost') {
      // 霜环：冰晶碎片迸裂
      spawnShard(e.x, e.y, '#cfeefb', 5, 130);
      spawnRing(e.x, e.y, PALETTE.ice, 0.25, 22, 1.8);
    } else if (w === 'beam') {
      // 月光束：光爆
      spawnRing(e.x, e.y, PALETTE.fireBright, 0.3, 30, 2.5);
      spawnGlow(e.x, e.y, 14, PALETTE.warmWhite, 0.25);
      spawnSpark(e.x, e.y, PALETTE.white, 5, 160);
    } else if (w === 'crossbow') {
      // 连弩：箭光迸射
      spawnStreak(e.x, e.y, Math.atan2(pr.vy || 0, pr.vx || 0), 22, 1.5, PALETTE.white, 0.2);
      spawnSpark(e.x, e.y, PALETTE.fireBright, 2, 80);
    } else if (w === 'meteor') {
      // 陨星：爆炸火环 + 碎片
      spawnRing(e.x, e.y, PALETTE.fire, 0.4, 44, 3);
      spawnShard(e.x, e.y, PALETTE.fire, 6, 170);
      spawnGlow(e.x, e.y, 16, PALETTE.hot, 0.3);
    } else if (w === 'phantom') {
      // 幻影：月雾迸散
      spawnRing(e.x, e.y, PALETTE.icePale, 0.3, 24, 2);
      spawnGlow(e.x, e.y, 12, '#cfe0f8', 0.25);
      spawnSpark(e.x, e.y, PALETTE.icePale, 3, 90);
    } else if (w === 'arc' && pr.chain) {
      chainLightning(p, e, pr.dmg, pr.chainCount ?? 0, pr.chainFall ?? 0.65, pr.chainRange ?? 340, pr.color ?? PALETTE.white, pr.wId || 'arc');
    }
    return false;
  },
};
