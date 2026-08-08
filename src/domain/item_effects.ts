/* =========================================================
   蚀月远征 · 道具效果注册表（domain 层）
   items.json 只描述"是什么"（名称/价格/稀有度/描述），
   本模块描述"做什么"——购买后对 Player 的实际改动。
   两者以 id 关联，配置层因此不再反向依赖 domain。
   ========================================================= */
import type { Player } from '../types/core.d.ts';
import { applyMoonEffects } from './effects.js';
import { currentMoonPhase } from '../config/moon_phase.js';

/** 道具效果注册表：id → (p) => void */
const APPLY_FN: Record<string, (p: Player) => void> = {
  hp1:     p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  armor1:  p => { p.armor += 3; },
  atk1:    p => { p.atk += 4; },
  spd1:    p => { p.speed += 10; },
  crit1:   p => { p.critRate += 0.06; },
  cdr1:    p => { p.cdr += 0.06; },
  area1:   p => { p.area += 0.12; p.magnet += 20; },
  regen1:  p => { p.regen += 0.8; },
  xp:      p => { p.xpGain += 0.25; },
  lvHeal:  p => { p.xpGain += 0.30; p.onLevelUpHp += 12; },
  gold:    p => { p.goldGain += 0.2; },
  speedCrit:  p => { p.speedToCrit += 0.12; },
  armorAtk:   p => { p.armorToAtk += 0.6; },
  hpAtk:      p => { p.hpToAtk += 0.06; },
  atkSpd:     p => { p.atkToSpd += 0.4; },
  critAtk:    p => { p.critToAtk += 1.5; },
  vampAura:   p => { p.onKillHp += 2; },
  boom:       p => { p.boom += 0.4; },
  chainL:     p => { p.chainLightning += 0.18; },
  pierce:     p => { p.pierce += 1; },
  lowHp:      p => { p.lowHpDmg += 0.55; },
  fullCrit:   p => { p.fullHpCrit += 0.2; },
  autoPick:   p => { p.autoPick = 1; p.xpGain += 0.25; },
  /* luck 重构（2026-08-08）：幸运不再转化为金币，贪婪之匣改为直接金币获取 +25% */
  luckGold:   p => { p.goldGain += 0.25; },
  scaleLv:    p => { p.scaleLevel += 1; },
  scaleStage: p => { p.scaleStage += 2; },
  echo:       p => { p.echo += 0.25; },
  dodge1:     p => { p.dodge += 0.15; },
  thorns:     p => { p.thorns += 0.35; },
  proj1:      p => { p.projCount += 1; },
  critDmg1:   p => { p.critDmg += 0.4; },
  timeStop:   p => { p.timeStop += 1; },
  vamp:       p => { p.lifesteal += 0.1; },
  atkSpd2:    p => { p.atkSpd += 0.2; p.speed += 20; },
  luck1:      p => { p.luck += 0.35; p.goldGain += 0.15; },
  dash1:      p => { p.speed *= 1.08; p.dodge += 0.08; p.speed += 30; },
  shield1:    p => { p.effects.shieldMax = 30; p.effects.shield = 30; },
  nearDeath:  p => { p.effects.nearDeath = 1; },
  hunt:       p => { p.effects.hunt = 0.06; },
  duoShoot:   p => { p.effects.duoShoot = 0.18; },
  frostAura:  p => { p.effects.frostAura = 260; },
  goldMeteor: p => { p.effects.goldMeteor = 0.25; },
  splash:     p => { p.effects.splash = 0.15; },
  critBoom:   p => { p.effects.critBoom = 1; },
  devour:     p => { p.effects.devour = 1; },
  cloak:      p => { p.effects.cloak = 1; },
  starfall:   p => { p.effects.starfall = 1; },
  achJudge:   p => { p.effects.achJudge = 1; },
  tideRegen:  p => { p.effects.tideRegen = 1; },
  oath:       p => { p.effects.oath = 1; },
  horde:      p => { p.effects.horde = 0.05; },
  echoSlow:   p => { p.effects.echoSlow = 1; },
  coinHeal:   p => { p.effects.coinHeal = 0.5; },
  /* 集市三契 */
  tideDiscount: p => { p.effects.refillDiscount = 0.5; },
  tideGrowth:   p => { p.effects.tideGrowth = 1; },
  tideGift:     p => { p.effects.nextRefillFree = (p.effects.nextRefillFree || 0) + 1; },
  yourMoon:   p => { p.effects.yourMoon = 1; p.effects.moonPhase = currentMoonPhase(); applyMoonEffects(p, p.effects.moonPhase); },
};

/** 应用道具效果；未注册的 id 为空操作（与旧行为一致） */
export function applyItemEffect(id: string, p: Player): void {
  (APPLY_FN[id] || (() => {}))(p);
}

/** 该道具是否登记了效果（用于数据校验 / 调试） */
export function hasItemEffect(id: string): boolean {
  return id in APPLY_FN;
}

/** 已登记效果的全部 id（用于数据校验：反查 items.json 里不存在的死实现） */
export function itemEffectIds(): string[] {
  return Object.keys(APPLY_FN);
}
