/* =========================================================
   蚀月远征 · 数据层：商店道具
   从 JSON 加载道具元数据，apply 函数保持为 JS
   ========================================================= */
import { ICONS } from '../icons.js';
import itemsData from './items.json';
import type { ShopItemDef, Player } from '../types/core.d.ts';

export const SHOP_ITEMS: ShopItemDef[] = [];

const ICON_MAP: Record<string, string> = ICONS as Record<string, string>;

// apply 函数注册表：id → (p) => void
const APPLY_FN: Record<string, (p: Player) => void> = {
  hp1:     p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); },
  armor1:  p => { p.armor += 3; },
  atk1:    p => { p.atk += 4; },
  spd1:    p => { p.speed += 10; },
  crit1:   p => { p.critRate += 0.06; },
  cdr1:    p => { p.cdr += 0.08; },
  area1:   p => { p.area += 0.12; p.magnet += 20; },
  regen1:  p => { p.regen += 0.8; },
  xp:      p => { p.xpGain += 0.25; },
  gold:    p => { p.goldGain += 0.3; },
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
  atkSpd2:    p => { p.atkSpd += 0.2; p.speed += 5; },
  luck1:      p => { p.luck += 0.35; p.goldGain += 0.15; },
  dash1:      p => { p.speed *= 1.08; p.dodge += 0.08; p.speed += 30; },
  shield1:    p => { p._shieldMax = 30; p._shield = 30; },
  nearDeath:  p => { p._nearDeath = 1; },
  hunt:       p => { p._hunt = 0.12; },
  duoShoot:   p => { p._duoShoot = 0.18; },
  frostAura:  p => { p._frostAura = 260; },
  goldMeteor: p => { p._goldMeteor = 0.25; },
  splash:     p => { p._splash = 0.15; },
  critBoom:   p => { p._critBoom = 1; },
  devour:     p => { p._devour = 1; },
  cloak:      p => { p._cloak = 1; },
  starfall:   p => { p._starfall = 1; },
  tideRegen:  p => { p._tideRegen = 1; },
  oath:       p => { p._oath = 1; },
  horde:      p => { p._horde = 0.05; },
  echoSlow:   p => { p._echoSlow = 1; },
  coinHeal:   p => { p._coinHeal = 0.5; },
};

// 加载 JSON 数据，合并 apply 函数
for (const data of Object.values(itemsData)) {
  const item: any = { ...data };
  if (typeof item.icon === 'string') {
    item.icon = ICON_MAP[item.icon] || item.icon;
  }
  item.apply = APPLY_FN[item.id] || (() => {});
  SHOP_ITEMS.push(item as ShopItemDef);
}
