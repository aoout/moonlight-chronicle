/* =========================================================
   蚀月远征 · 商店：武器公式与投射物数量计算
   ========================================================= */
import type { WeaponDef, Player } from '../../types/core.d.ts';

type FormulaEntry = [string, string, (p: Player, lv: number) => any, (string | ((p: Player, lv: number) => any))?];

const WEAPON_FORMULAS: Record<string, FormulaEntry[]> = {
  moonRing:   [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.55+0.12*lv,'(0.55+0.12×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.55+0.12*lv)], ['移速','param',p=>p.speed||0], ['移速·0.12','part',(p,lv)=>(p.speed||0)*0.12]],
  crossbow:   [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.8+0.15*lv,'(0.8+0.15×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.8+0.15*lv)], ['攻速','param',p=>p.atkSpd||1], ['攻速·攻·0.4','part',(p,lv)=>(p.atkSpd||1)*(p.effAtk||0)*0.4]],
  arc:        [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.9+0.16*lv,'(0.9+0.16×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.9+0.16*lv)]],
  meteor:     [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>2.8+0.5*lv,'(2.8+0.5×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(2.8+0.5*lv)], ['生命上限','param',p=>p.maxHp||0], ['生命·8%','part',(p,lv)=>(p.maxHp||0)*0.08]],
  frost:      [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.7+0.12*lv,'(0.7+0.12×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.7+0.12*lv)], ['生命上限','param',p=>p.maxHp||0], ['生命·10%','part',(p,lv)=>(p.maxHp||0)*0.10*(1+lv*0.2)]],
  beam:       [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>1.05+0.18*lv,'(1.05+0.18×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(1.05+0.18*lv)], ['暴击率','param',p=>p.critRate||0], ['暴击·攻·1.5','part',(p,lv)=>(p.critRate||0)*(p.effAtk||0)*1.5]],
  orbit:      [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>(0.38+0.08*lv)*2,'(0.38+0.08×L)×2'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.38+0.08*lv)*2]],
  lance:      [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>1.2+0.2*lv,'(1.2+0.2×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(1.2+0.2*lv)], ['移速','param',p=>p.speed||0], ['移速倍率','param',(p,lv)=>0.08+0.02*lv,'(0.08+0.02×L)'], ['移速·倍率','part',(p,lv)=>(p.speed||0)*(0.08+0.02*lv)]],
  shadow:     [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.7+0.13*lv,'(0.7+0.13×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(0.7+0.13*lv)], ['溢暴伤','param',p=>Math.max(0,(p.critDmg||1.5)-1.5)], ['溢暴伤·攻·0.9','part',(p,lv)=>Math.max(0,(p.critDmg||1.5)-1.5)*(p.effAtk||0)*0.9]],
  storm:      [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>0.5+0.09*lv,'(0.5+0.09×L)'], ['单发伤害','part',(p,lv)=>(p.effAtk||0)*(0.5+0.09*lv)], ['每核弹幕数','param',(p,lv)=>1+Math.floor(lv/2)], ['双核·总输出','part',(p,lv)=>(p.effAtk||0)*(0.5+0.09*lv)*(1+Math.floor(lv/2))*2]],
  nova:       [['攻击力','param',p=>p.effAtk||0], ['倍率','param',(p,lv)=>1.5+0.25*lv,'(1.5+0.25×L)'], ['攻击·倍率','part',(p,lv)=>(p.effAtk||0)*(1.5+0.25*lv)], ['移速','param',p=>p.speed||0], ['移速·0.1','part',(p,lv)=>(p.speed||0)*0.1]],
  phantom:    [['攻击力','param',p=>p.effAtk||0], ['分身数','param',(p,lv)=>2+Math.floor(lv/2)], ['单分身·攻击×(0.45+0.08L)','param',(p,lv)=>(p.effAtk||0)*(0.45+0.08*lv)], ['总输出(单×分身数)','part',(p,lv)=>(p.effAtk||0)*(0.45+0.08*lv)*(2+Math.floor(lv/2))]],
};

export function weaponFormulaText(def: WeaponDef): string {
  return def.formula || '攻击 ×' + (0.6 + (typeof def.dmg === 'function' ? 0 : def.dmg)) ;
}

/* 武器范围描述（射程 / 范围 / 环绕半径） */
export function weaponRangeText(def: WeaponDef): string | null {
  if (def.radius) return '环绕半径 ' + def.radius;
  if (def.range) return '射程 ' + def.range;
  if (def.aoe) return '范围 ' + def.aoe;
  return null;
}

export interface ProjInfo {
  base: number;
  total: number;
  multi: boolean;
}

/* 投射物数量计算：各武器对 projCount 的转化公式 */
export function weaponProjInfo(def: any, p: Player): ProjInfo {
  const id = def.id;
  const bonus = p.projCount || 0;
  const map: Record<string, () => ProjInfo> = {
    moonRing:()=>{const b=1,e=Math.floor(bonus*0.6);return{base:b,total:Math.max(1,b+e),multi:true};},
    crossbow:()=>{return{base:1,total:1+bonus,multi:true};},
    lance:   ()=>{const e=Math.floor(bonus*0.5);return{base:1,total:1+e,multi:true};},
    shadow:  ()=>{return{base:1,total:1+bonus,multi:true};},
    storm:   ()=>{ const b=1;const e=b+Math.floor(bonus*0.5);return{base:b,total:Math.max(1,b+e),multi:true}; },
    nova:    ()=>{const b=def.proj||10;return{base:b,total:b+bonus,multi:true};},
  };
  const fn = map[id];
  if (fn) return fn();
  return { base:1, total:1, multi:false };
}

export interface FormulaBreakdownRow {
  label: string;
  expr: any;
  value: any;
  kind: string;
}

export function weaponFormulaBreakdown(def: WeaponDef, p: Player, lv: number): FormulaBreakdownRow[] {
  const F = WEAPON_FORMULAS[def.id];
  if (!F) return [{ label: '攻击力', expr: Math.round(p.effAtk || 0), value: p.effAtk || 0, kind: 'part' }];
  return F.map(s => {
    const [label, kind, get, tpl] = s;
    const value = get(p, lv);
    let expr: any;
    if (typeof tpl === 'function') expr = tpl(p, lv);
    else if (typeof tpl === 'string') expr = tpl.replace(/L/g, String(lv));
    else expr = (typeof value === 'number' ? Math.round(value * 100) / 100 : value);
    return { label, expr, value, kind };
  });
}
