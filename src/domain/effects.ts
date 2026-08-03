/* =========================================================
   蚀月远征 · Effect 注册表
   集中管理所有玩家运行时效果（道具/祝福/诅咒）的更新逻辑
   替代 PlayerSystem._updateCursesAndAuras 的条件分支
   ========================================================= */
import type { Player } from '../types/core.d.ts';
import { EventBus } from '../core/event_bus.js';
import { entityState } from '../state/entities.js';
import { gameState } from '../state/game.js';
import { world } from '../ecs/World.js';
import { nearestEnemy } from '../weapons/index.js';
import { rand, dist } from '../utils.js';

import { gmSt } from '../state/accessors.js';

/** 策略对象：运行时效果 */
export interface EffectStrategy {
  name: string;
  desc: string;
  update: (p: Player, dt: number) => void;
}

/** 效果处理器签名（旧，用于迁移过渡） */
type EffectHandler = (p: Player, dt: number) => void;

/** 效果注册表：效果名 → 策略对象 */
const REGISTRY: Record<string, EffectStrategy> = {
  /* ===== 诅咒计时 ===== */
  curseTimer: { name: '诅咒计时', desc: '诅咒持续衰减', update(p, dt) {
    const t = p.effects.curseTimer ?? 0;
    if (t > 0) p.effects.curseTimer = t - dt;
  }},

  /* ===== 护盾恢复 ===== */
  shield: { name: '护盾恢复', desc: '护盾耗尽后自动恢复', update(p, dt) {
    if (p.effects.shieldMax && (p.effects.shield ?? 0) <= 0) {
      p.effects.shieldTimer = (p.effects.shieldTimer || 5) - dt;
      if (p.effects.shieldTimer <= 0) {
        p.effects.shield = p.effects.shieldMax;
        p.effects.shieldTimer = 5;
        EventBus.emit('visual:ring', { x: p.x, y: p.y, color: '#9fd6e8', life: 0.4, radius: 40, width: 2 });
      }
    }
  }},

  /* ===== 冰霜光环 ===== */
  frostAura: { name: '冰霜光环', desc: '减速周围敌人', update(p, _dt) {
    for (const e of entityState.state.enemies) {
      if (!e.dead) e.auraSlow = dist(e, p) < (p.effects.frostAura ?? 0) ? 0.2 : 0;
    }
  }},

  /* ===== 回响减速 ===== */
  echoSlow: { name: '回响减速', desc: '周期性触发全场减速', update(p, dt) {
    if (gmSt()._echoSlowT > 0) gameState.set('_echoSlowT', gmSt()._echoSlowT - dt);
    p.effects.echoTimer = (p.effects.echoTimer === undefined ? 20 : p.effects.echoTimer) - dt;
    if (p.effects.echoTimer <= 0) {
      p.effects.echoTimer = 20;
      gameState.set('_echoSlowT', 1);
      EventBus.emit('visual:ring', { x: p.x, y: p.y, color: '#9fd6e8', life: 0.5, radius: 420, width: 2 });
    }
  }},

  /* ===== 陨星 ===== */
  starfall: { name: '陨星', desc: '周期性召唤陨石', update(p, dt) {
    p.effects.starTimer = (p.effects.starTimer || 12) - dt;
    if (p.effects.starTimer <= 0) {
      p.effects.starTimer = 12;
      const t = nearestEnemy(p.x, p.y, 600);
      if (t) {
        world.add('projectiles', {
          meteor: true, x: t.x + rand(-40, 40), y: t.y + rand(-40, 40),
          t: 0, delay: 0.45, dmg: p.effAtk, aoe: 90, color: '#ffe9a8', r: 12, wId: 'starfall',
        });
      }
    }
  }},

  /* ===== 恢复强化（潮涌之枪被动） ===== */
  regenBuff: { name: '恢复强化', desc: '潮涌之枪被动恢复', update(p, dt) {
    const rb = p.effects.regenBuff ?? 0;
    if (rb > 0) {
      p.effects.regenBuff = rb - dt;
      p.hp = Math.min(p.maxHp, p.hp + 3 * dt);
    }
  }},

  /* ===== 狩猎计时 ===== */
  hunt: { name: '狩猎', desc: '狩猎计时与层数衰减', update(p, dt) {
    const ht = p.effects.huntTimer ?? 0;
    if (ht > 0) {
      p.effects.huntTimer = ht - dt;
      if ((p.effects.huntTimer ?? 0) <= 0) p.effects.huntStacks = 0;
    }
  }},

  /* ===== 隐身计时 ===== */
  cloak: { name: '隐身', desc: '隐身计时衰减', update(p, dt) {
    const ct = p.effects.cloakTimer ?? 0;
    if (ct > 0) p.effects.cloakTimer = ct - dt;
  }},
};

/**
 * 获取所有已激活效果对应的策略对象列表
 * 按 PlayerEffects 的 key 匹配 REGISTRY
 */
export function getActiveEffectStrategies(p: Player): EffectStrategy[] {
  const strategies: EffectStrategy[] = [];
  for (const key of Object.keys(REGISTRY)) {
    if ((p.effects as any)[key] !== undefined && (p.effects as any)[key] !== 0) {
      strategies.push(REGISTRY[key]);
    }
  }
  return strategies;
}

/** 执行所有激活效果的更新 */
export function updateEffects(p: Player, dt: number): void {
  for (const strategy of getActiveEffectStrategies(p)) {
    strategy.update(p, dt);
  }
}