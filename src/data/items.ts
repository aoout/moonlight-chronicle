/* =========================================================
   蚀月远征 · 数据层：商店道具
   从 JSON 加载道具元数据，apply 函数保持为 JS
   ========================================================= */
import { ICONS } from '../ui/icons.js';
import { validateEntries, validateAndWarn } from './validate.js';
import itemsData from './items.json';
import type { ShopItemDef, Player } from '../types/core.d.ts';
import { applyMoonEffects } from '../domain/effects.js';
import { currentMoonPhase } from './moon_phase.js';

export const SHOP_ITEMS: ShopItemDef[] = [];

const ICON_MAP = ICONS;

// apply 函数注册表：id → (p) => void
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
  luckGold:   p => { p.luckToGold += 0.08; },
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
  yourMoon:   p => { p.effects.yourMoon = 1; p.effects.moonPhase = currentMoonPhase(); applyMoonEffects(p, p.effects.moonPhase); },
};

// 校验道具数据
validateAndWarn(validateEntries(itemsData, {
  id: { type: 'string', desc: '道具标识' },
  name: { type: 'string', desc: '道具名称' },
  icon: { type: 'string', desc: '图标键名' },
  rarity: { type: 'string', desc: '稀有度' },
  price: { type: 'number', desc: '价格' },
  desc: { type: 'string', desc: '描述' },
  max: { type: 'number', optional: true, desc: '最大购买次数（无则不限）' },
}, 'items.json'), 'items.json');

// 加载 JSON 数据，合并 apply 函数
for (const data of Object.values(itemsData)) {
  const item: Record<string, any> = { ...data };
  if (typeof item.icon === 'string') {
    item.icon = ICON_MAP[item.icon] || item.icon;
  }
  item.apply = APPLY_FN[item.id] || (() => {});
  SHOP_ITEMS.push(item as ShopItemDef);
}
