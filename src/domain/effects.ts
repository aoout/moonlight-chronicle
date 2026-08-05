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
import { achEarnedTotal } from '../systems/AchievementSystem.js';
import { rand, dist, pick, RNG } from '../utils.js';
import { damageEnemy } from './combat.js';
import { MOON_NAMES, currentMoonPhase } from '../data/moon_phase.js';

import { gmSt } from '../state/accessors.js';

/** 你的月亮：各月相的属性增量（add=加法增量，mul=乘法倍率）。用增量逆运算还原，避免覆盖月相期间新购入的道具加成 */
function applyMoonEffects(p: Player, ph: number): void {
  const b: Record<string, number> = {};
  switch (ph) {
    case 0: /* 新月：闪避 +25% */
      b.dodge = 0.25; p.dodge += b.dodge; break;
    case 1: /* 娥眉：攻击 +15%，经验获取 +15% */
      b.atk = 1.15; b.xpGain = 1.15; p.atk *= b.atk; p.xpGain *= b.xpGain; break;
    case 2: /* 上弦：暴击率 +12%，攻速 +12% */
      b.critRate = 0.12; b.atkSpd = 0.12; p.critRate += b.critRate; p.atkSpd += b.atkSpd; break;
    case 3: /* 盈凸：攻击 +10%，范围 +10%，投射物 +1 */
      b.atk = 1.10; b.area = 0.10; b.projCount = 1; p.atk *= b.atk; p.area += b.area; p.projCount += b.projCount; break;
    case 4: /* 满月：攻击 +25%，暴伤 +25% */
      b.atk = 1.25; b.critDmg = 0.25; p.atk *= b.atk; p.critDmg += b.critDmg; break;
    case 5: { /* 亏凸·回澜之护：生命上限 +15%（含等额回复），伤害转化护盾 */
      b.maxHp = Math.round(p.maxHp * 0.15);
      p.maxHp += b.maxHp;
      p.hp = Math.min(p.maxHp, p.hp + b.maxHp);
      p.effects.moonWane = 1;
      break; }
    case 6: /* 下弦·月影壁垒：冷却缩减 +15%，受击生成护盾 */
      b.cdr = 0.15; p.cdr += b.cdr;
      p.effects.moonWax = 1;
      break;
    case 7: /* 残月·将熄之勇：暴伤 +25%，击杀计数 → 必爆 */
      b.critDmg = 0.25; p.critDmg += b.critDmg;
      p.effects.moonKill = 1;
      break;
  }
  p.effects.moonPrev = b;
  p.effects.moonFullT = 8;
  p.effects.moonCloakT = 0;
}

function revertMoonEffects(p: Player): void {
  const b = p.effects.moonPrev || {};
  if (b.dodge !== undefined) p.dodge -= b.dodge;
  if (b.atk !== undefined) p.atk /= b.atk;
  if (b.xpGain !== undefined) p.xpGain /= b.xpGain;
  if (b.critRate !== undefined) p.critRate -= b.critRate;
  if (b.atkSpd !== undefined) p.atkSpd -= b.atkSpd;
  if (b.area !== undefined) p.area -= b.area;
  if (b.projCount !== undefined) p.projCount -= b.projCount;
  if (b.critDmg !== undefined) p.critDmg -= b.critDmg;
  if (b.maxHp !== undefined) { p.maxHp -= b.maxHp; p.hp = Math.min(p.maxHp, p.hp); }
  if (b.cdr !== undefined) p.cdr -= b.cdr;
  p.effects.moonWane = 0;
  p.effects.moonWax = 0;
  p.effects.moonKill = 0;
  p.effects.moonKillCount = 0;
  p.effects.moonCrit = 0;
}

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
    p.effects.starTimer = (p.effects.starTimer || 9) - dt;
    if (p.effects.starTimer <= 0) {
      p.effects.starTimer = 9;
      const t = nearestEnemy(p.x, p.y, 600);
      if (t) {
        world.add('projectiles', {
          meteor: true, x: t.x + rand(-40, 40), y: t.y + rand(-40, 40),
          t: 0, delay: 0.45, dmg: p.effAtk, aoe: 90, color: '#ffe9a8', r: 12, wId: 'starfall',
        });
      }
    }
  }},

  /* ===== 辉光审判 ===== */
  achJudge: { name: '辉光审判', desc: '每6秒对随机敌人降下裁决辉光，随成就数量增伤', update(p, dt) {
    p.effects.achJudgeTimer = (p.effects.achJudgeTimer || 6) - dt;
    if (p.effects.achJudgeTimer <= 0) {
      p.effects.achJudgeTimer = 6;
      const alive = entityState.state.enemies.filter(e => !e.dead);
      if (alive.length > 0) {
        const t = pick(alive);
        const ach = achEarnedTotal();
        world.add('projectiles', {
          judge: 1, x: t.x + rand(-35, 35), y: t.y + rand(-35, 35),
          t: 0, delay: 0.5, dmg: p.effAtk * 2 * (1 + ach * 0.08), aoe: 110,
          color: '#ffd98a', r: 12, wId: 'achJudge',
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

  /* ===== 你的月亮（现实月相） ===== */
  yourMoon: { name: '你的月亮', desc: '效果随现实月相流转', update(p, dt) {
    const ph = currentMoonPhase();
    if (p.effects.moonPhase !== ph) {
      if ((p.effects.moonPhase ?? -1) >= 0) revertMoonEffects(p);
      applyMoonEffects(p, ph);
      p.effects.moonPhase = ph;
      EventBus.emit('ui:spawnText', { x: p.x, y: p.y - 52, text: '你的月亮 · ' + MOON_NAMES[ph], color: '#e9c987' });
      EventBus.emit('visual:ring', { x: p.x, y: p.y, color: '#e9c987', life: 0.6, radius: 76, width: 2 });
    }
    p.effects.moonT = (p.effects.moonT || 0) + dt;
    /* 新月·隐匿：每 10 秒隐匿 0.6 秒（不可被瞄准/命中）
       moonCloakT > 0  = 隐匿中（倒计时 0.6s）
       moonCloakT <= 0 = 等待期（自 0 递减至 -10 后触发隐匿） */
    if (ph === 0) {
      let clo = p.effects.moonCloakT ?? 0;
      if (clo > 0) {
        clo -= dt;
        if (clo <= 0) clo = -10;
      } else {
        clo -= dt;
        if (clo <= -10) clo = 0.6;
      }
      p.effects.moonCloakT = clo;
      if (clo > 0) p.effects.cloakTimer = 0.05;
    }
    /* 满月·月华辉光：每 8 秒对最近 5 个敌人造成 200% 攻击伤害 */
    if (ph === 4) {
      p.effects.moonFullT = (p.effects.moonFullT || 8) - dt;
      if (p.effects.moonFullT <= 0) {
        p.effects.moonFullT = 8;
        const alive = entityState.state.enemies.filter(e => !e.dead);
        alive.sort((a, b) => dist(p, a) - dist(p, b));
        const targets = alive.slice(0, 5);
        for (const e of targets) {
          damageEnemy(e, p.effAtk * 2, RNG() < p.effCrit, 'moon', 'yourMoon');
          EventBus.emit('visual:burst', { x: e.x, y: e.y, color: '#e9c987', count: 8 });
          EventBus.emit('visual:ring', { x: e.x, y: e.y, color: '#fff5d6', life: 0.3, radius: 40, width: 1.6 });
        }
        if (targets.length > 0) {
          EventBus.emit('ui:spawnText', { x: p.x, y: p.y - 40, text: '月华辉光', color: '#e9c987' });
        }
      }
    }
    /* 亏凸·回澜之护：停止输出 6 秒后护盾渐消 */
    if (ph === 5) {
      if ((p.effects.moonT - (p.effects.moonLastDmgT ?? 0)) > 6 && (p.effects.shield ?? 0) > 0) {
        p.effects.shield = Math.max(0, (p.effects.shield ?? 0) - 14 * dt);
      }
    }
    /* 下弦·月影壁垒：受击生盾 CD 递减 */
    if (ph === 6) {
      if ((p.effects.moonHurtCd ?? 0) > 0) p.effects.moonHurtCd = (p.effects.moonHurtCd ?? 0) - dt;
    }
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