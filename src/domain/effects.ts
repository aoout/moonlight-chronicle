/* =========================================================
   蚀月远征 · Effect 注册表
   集中管理所有玩家运行时效果（道具/祝福/诅咒）的更新逻辑
   替代 PlayerSystem._updateCursesAndAuras 的条件分支
   ========================================================= */
import { PALETTE } from '../assets/palette.js';
import { EVENTS } from '../engine/core/events.js';
import type { Player } from '../types/core.d.ts';
import { EventBus } from '../engine/core/event_bus.js';
import { entityState } from '../state/entities.js';
import { gameState } from '../state/flow.js';
import { world } from '../engine/ecs/World.js';
import { nearestEnemy } from './weapons/index.js';
import { achievements } from './ports/achievements.js';
import { rand, dist, pick, RNG, tickCooldown } from '../engine/util/utils.js';
import { damageEnemy } from './combat.js';
import { MOON_NAMES, MOON_EFFECTS, currentMoonPhase } from '../config/moon_phase.js';
import { SHOP_ITEMS } from '../config/index.js';

import { gmSt, gSt } from '../state/accessors.js';

/** 你的月亮：按数据表 MOON_EFFECTS 应用月相加成。记录增量以便还原，避免覆盖月相期间新购入的道具加成 */
export function applyMoonEffects(p: Player, ph: number): void {
  const spec = MOON_EFFECTS[ph];
  if (!spec) return;
  const b: Record<string, number> = {};
  const target = p as unknown as Record<string, number>;
  for (const [k, v] of Object.entries(spec.add || {})) { target[k] += v; b[k] = v; }
  for (const [k, v] of Object.entries(spec.mul || {})) { target[k] *= v; b[k] = v; }
  if (spec.maxHpMul) {
    const bonus = Math.round(p.maxHp * spec.maxHpMul);
    b.maxHp = bonus;
    p.maxHp += bonus;
    p.hp = Math.min(p.maxHp, p.hp + bonus);
  }
  if (spec.flag === 'moonWane') p.effects.moonWane = 1;
  if (spec.flag === 'moonWax') p.effects.moonWax = 1;
  if (spec.flag === 'moonKill') p.effects.moonKill = 1;
  p.effects.moonPrev = b;
  p.effects.moonFullT = 8;
  p.effects.moonCloakT = 0;
}

function revertMoonEffects(p: Player): void {
  const spec = MOON_EFFECTS[p.effects.moonPhase ?? -1];
  const b = p.effects.moonPrev || {};
  const target = p as unknown as Record<string, number>;
  if (spec) {
    for (const k of Object.keys(spec.add || {})) if (b[k] !== undefined) target[k] -= b[k];
    for (const k of Object.keys(spec.mul || {})) if (b[k] !== undefined) target[k] /= b[k];
  } else {
    /* 兜底：未知相位（旧存档）按加法还原 */
    for (const [k, v] of Object.entries(b)) target[k] -= v;
  }
  if (b.maxHp !== undefined) { p.maxHp -= b.maxHp; p.hp = Math.min(p.maxHp, p.hp); }
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

/** 群星陨落触发间隔（秒）——以 items.json 的 interval 字段为单一事实来源，防止实现与图鉴文本脱节 */
const STARFALL_INTERVAL = SHOP_ITEMS.find(i => i.id === 'starfall')?.interval ?? 9;
/** 时之残响触发间隔（秒）/ 减速持续（秒）——同上，单一事实来源来自 items.json */
const ECHOSLOW_INTERVAL = SHOP_ITEMS.find(i => i.id === 'echoSlow')?.interval ?? 20;
const ECHOSLOW_DURATION = SHOP_ITEMS.find(i => i.id === 'echoSlow')?.duration ?? 1;

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
        EventBus.emit(EVENTS.VISUAL_RING, { x: p.x, y: p.y, color: PALETTE.ice, life: 0.4, radius: 40, width: 2 });
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
    const { t, fired } = tickCooldown(p.effects.echoTimer, ECHOSLOW_INTERVAL, dt);
    p.effects.echoTimer = t;
    if (fired) {
      gameState.set('_echoSlowT', ECHOSLOW_DURATION);
      EventBus.emit(EVENTS.VISUAL_RING, { x: p.x, y: p.y, color: PALETTE.ice, life: 0.5, radius: 420, width: 2 });
    }
  }},

  /* ===== 陨星 ===== */
  starfall: { name: '陨星', desc: '周期性召唤陨石', update(p, dt) {
    const { t, fired } = tickCooldown(p.effects.starTimer, STARFALL_INTERVAL, dt);
    p.effects.starTimer = t;
    if (fired) {
      const tgt = nearestEnemy(p.x, p.y, 600);
      if (tgt) {
        world.add('projectiles', {
          meteor: true, x: tgt.x + rand(-40, 40), y: tgt.y + rand(-40, 40),
          t: 0, delay: 0.45, dmg: 60 * (1 + 0.12 * gSt().stage) * (1 + 0.12 * gSt().depth), aoe: 90, color: PALETTE.fireBright, r: 12, wId: 'starfall',
        });
      }
    }
  }},

  /* ===== 辉光审判 ===== */
  achJudge: { name: '辉光审判', desc: '每5秒对随机敌人降下裁决辉光，随成就数量增伤', update(p, dt) {
    const { t, fired } = tickCooldown(p.effects.achJudgeTimer, 5, dt);
    p.effects.achJudgeTimer = t;
    if (fired) {
      const alive = entityState.state.enemies.filter(e => !e.dead);
      if (alive.length > 0) {
        const tgt = pick(alive);
        const ach = achievements().earnedTotal();
        world.add('projectiles', {
          judge: 1, x: tgt.x + rand(-35, 35), y: tgt.y + rand(-35, 35),
          t: 0, delay: 0.5, dmg: 40 * (1 + 0.12 * gSt().stage) * (1 + 0.12 * gSt().depth) * (1 + 0.08 * ach), aoe: 110,
          color: PALETTE.goldBright, r: 12, wId: 'achJudge',
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
      EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 52, text: '你的月亮 · ' + MOON_NAMES[ph], color: PALETTE.gold });
      EventBus.emit(EVENTS.VISUAL_RING, { x: p.x, y: p.y, color: PALETTE.gold, life: 0.6, radius: 76, width: 2 });
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
      const { t, fired } = tickCooldown(p.effects.moonFullT, 8, dt);
      p.effects.moonFullT = t;
      if (fired) {
        const alive = entityState.state.enemies.filter(e => !e.dead);
        alive.sort((a, b) => dist(p, a) - dist(p, b));
        const targets = alive.slice(0, 5);
        for (const e of targets) {
          damageEnemy(e, p.effAtk * 2, RNG() < p.effCrit, 'moon', 'yourMoon');
          EventBus.emit(EVENTS.VISUAL_BURST, { x: e.x, y: e.y, color: PALETTE.gold, count: 8 });
          EventBus.emit(EVENTS.VISUAL_RING, { x: e.x, y: e.y, color: PALETTE.warmWhite, life: 0.3, radius: 40, width: 1.6 });
        }
        if (targets.length > 0) {
          EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 40, text: '月华辉光', color: PALETTE.gold });
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
  const effects = p.effects as unknown as Record<string, unknown>;
  for (const key of Object.keys(REGISTRY)) {
    if (effects[key] !== undefined && effects[key] !== 0) {
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