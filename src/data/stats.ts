/* =========================================================
   蚀月远征 · 数据层：属性定义 & 基础属性
   ========================================================= */
import { ICONS } from '../ui/icons.js';
import type { StatDef } from '../types/data.d.ts';

export const STATS: Record<string, StatDef> = {
  maxHp:{name:'生命上限',icon:ICONS.heart,color:'#e2546a',fmt:v=>Math.round(v)},
  armor:{name:'护甲',icon:ICONS.shield,color:'#9fd6e8',fmt:v=>v.toFixed(1)},
  speed:{name:'移速',icon:ICONS.arrow,color:'#e9c987',fmt:v=>Math.round(v)},
  atk:{name:'攻击力',icon:ICONS.sword,color:'#ff9d6b',fmt:v=>Math.round(v)},
  atkSpd:{name:'攻速',icon:ICONS.bolt,color:'#b49ae8',fmt:v=>(v*100).toFixed(0)+'%'},
  critRate:{name:'暴击率',icon:ICONS.diamond,color:'#ffb84d',fmt:v=>(v*100).toFixed(0)+'%'},
  critDmg:{name:'暴击伤害',icon:ICONS.star,color:'#ffb84d',fmt:v=>(v*100).toFixed(0)+'%'},
  lifesteal:{name:'吸血',icon:ICONS.plus,color:'#e2546a',fmt:v=>(v*100).toFixed(0)+'%'},
  regen:{name:'生命恢复',icon:ICONS.plus,color:'#7fd6a4',fmt:v=>v.toFixed(1)+'/s'},
  projCount:{name:'投射物',icon:ICONS.dots,color:'#9fd6e8',fmt:v=>'+'+v},
  area:{name:'范围',icon:ICONS.magnet,color:'#b49ae8',fmt:v=>(v*100).toFixed(0)+'%'},
  duration:{name:'持续时间',icon:ICONS.hourglass,color:'#b49ae8',fmt:v=>(v*100).toFixed(0)+'%'},
  luck:{name:'幸运',icon:ICONS.gem,color:'#7fd6a4',fmt:v=>(v*100).toFixed(0)+'%'},
  xpGain:{name:'经验获取',icon:ICONS.spark,color:'#9fd6e8',fmt:v=>(v*100).toFixed(0)+'%'},
  goldGain:{name:'金币获取',icon:ICONS.diamond,color:'#e9c987',fmt:v=>(v*100).toFixed(0)+'%'},
  dodge:{name:'闪避',icon:ICONS.cloud,color:'#9fd6e8',fmt:v=>(v*100).toFixed(0)+'%'},
  cdr:{name:'冷却缩减',icon:ICONS.hourglass,color:'#b49ae8',fmt:v=>(v*100).toFixed(0)+'%'},
  magnet:{name:'拾取范围',icon:ICONS.magnet,color:'#7fd6a4',fmt:v=>Math.round(v)},
  thorns:{name:'荆棘反伤',icon:ICONS.flame,color:'#7fd6a4',fmt:v=>(v*100).toFixed(0)+'%'},
};

export const STAT_ORDER: string[] = ['maxHp','armor','speed','atk','atkSpd','critRate','critDmg','lifesteal','regen','projCount','area','duration','luck','xpGain','goldGain','dodge','cdr','magnet','thorns'];

export const BASE_STATS: Record<string, number> = {
  maxHp:100, hp:100, armor:0, speed:240, atk:10, atkSpd:1.0,
  critRate:0.05, critDmg:1.5, lifesteal:0, regen:0.4, projCount:0,
  area:1.0, duration:1.0, luck:1.0, xpGain:1.0, goldGain:1.0,
  dodge:0, cdr:0, magnet:90, thorns:0,
  speedToCrit:0, armorToAtk:0, hpToAtk:0, atkToSpd:0, critToAtk:0,
  onKillHp:0, onLevelUpHp:0, lowHpDmg:0, fullHpCrit:0, chainLightning:0, pierce:0,
  boom:0, autoPick:0, scaleLevel:0, scaleStage:0, luckToGold:0,
  timeStop:0, echo:0,
};
