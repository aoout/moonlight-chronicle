/* =========================================================
   蚀月远征 · 领域模块：玩家管理
   派生属性 / 创建 / 武器管理 / 金币 / 经验
   从 PlayerSystem 静态方法迁出
   ========================================================= */
import { STATE, sm } from '../core/states.js';
import { playerState } from '../state/player.js';
import { statsState } from '../state/stats.js';
import { renderState } from '../state/render.js';
import { stageState } from '../state/stage.js';
import { gameState } from '../state/game.js';
import { EventBus } from '../core/event_bus.js';
import { RNG } from '../utils.js';
import { CONFIG, BASE_STATS } from '../data/index.js';
import { codexAdd } from '../persistence/codex.js';
import type { Player } from '../types/core.d.ts';

import { pSt, sSt, rSt, gSt } from '../state/accessors.js';

/** 派生属性：转模系统在这里生效 */
export function computeDerived(p: Player): Player {
  p.effAtk   = p.atk + p.armor * p.armorToAtk + p.maxHp * p.hpToAtk
             + p.critRate * p.critToAtk + p.level * p.scaleLevel
             + (stageState.state.stage - 1) * p.scaleStage;
  p.effCrit  = Math.min(0.9, p.critRate + p.speed * p.speedToCrit / 100);
  p.effSpeed = p.speed + p.atk * p.atkToSpd;
  p.effGold  = p.goldGain + (p.luck - 1) * p.luckToGold;
  p.effAtkSpd = p.atkSpd * (1 + p.critRate * 0.3);
  return p;
}

/** 创建玩家 */
export function createPlayer(): Player {
  return {
    ...BASE_STATS,
    x: rSt().width / 2, y: rSt().height / 2,
    r: 16, facing: 0, invuln: 0, level: 1,
    weapons: [],
    animT: RNG() * 10,
    effects: {},
    vx: 0, vy: 0,
    effAtk: 0, effCrit: 0, effSpeed: 0, effGold: 0, effAtkSpd: 0,
  } as unknown as Player;
}

export function xpNeeded(level: number): number {
  return Math.round(CONFIG.XP_PER_LEVEL * Math.pow(CONFIG.XP_GROWTH, level - 1));
}

export function addWeapon(id: string): boolean {
  const p = pSt().player;
  if (!p) return false;
  if (p.weapons.length >= CONFIG.MAX_WEAPONS) return false;
  if (p.weapons.find(w => w.id === id)) return false;
  p.weapons.push({ id, lv: 1 });
  pSt().weaponCd[id] = 0;
  codexAdd('weapons', id);
  return true;
}

export function upgradeWeapon(id: string): boolean {
  const p = pSt().player;
  if (!p) return false;
  const w = p.weapons.find(x => x.id === id);
  if (!w || w.lv >= 10) return false;
  w.lv++;
  return true;
}

/** 移除武器 */
export function removeWeapon(id: string): boolean {
  const p = pSt().player;
  if (!p) return false;
  const i = p.weapons.findIndex(x => x.id === id);
  if (i < 0) return false;
  p.weapons.splice(i, 1);
  delete pSt().weaponCd[id];
  delete pSt().weaponCdFull[id];
  return true;
}

export function addGold(n: number): void {
  const p = pSt().player;
  if (!p) return;
  const st = sSt();
  statsState.set('gold', st.gold + Math.round(n * Math.max(0.1, p.effGold)));
}

/** 获得经验 */
export function gainXp(n: number): void {
  const p = pSt().player;
  if (!p) return;
  const amt = n * p.xpGain;
  const st = sSt();
  statsState.set('xp', st.xp + amt);
  while (st.xp >= st.xpNeeded) {
    statsState.set('xp', st.xp - st.xpNeeded);
    statsState.set('xpNeeded', xpNeeded(p.level + 1));
    p.level++;
    statsState.set('levelQueue', st.levelQueue + 1);
  }
  if (st.levelQueue > 0) { gameState.set('_resumeState', sm.current); sm.transition(STATE.LEVELUP); EventBus.emit('player:levelup', { level: p.level, queue: st.levelQueue }); }
}
