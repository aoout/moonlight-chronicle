/* =========================================================
   蚀月远征 · 领域模块：玩家管理
   派生属性 / 创建 / 武器管理 / 金币 / 经验
   从 PlayerSystem 静态方法迁出
   ========================================================= */
import { EVENTS } from '../engine/core/events.js';
import { achievements } from './ports/achievements.js';
import { STATE, sm } from '../engine/core/states.js';
import { playerState } from '../state/player.js';
import { statsState } from '../state/stats.js';
import { renderState } from '../state/render.js';
import { stageState } from '../state/stage.js';
import { gameState } from '../state/flow.js';
import { EventBus } from '../engine/core/event_bus.js';
import { RNG } from '../engine/util/utils.js';
import { CONFIG, BASE_STATS } from '../config/index.js';
import { codexAdd } from '../infra/persistence/codex.js';
import type { Player } from '../types/core.d.ts';

import { pSt, sSt, rSt, gSt } from '../state/accessors.js';

/* ===== 玩家机制参数（魔法数字具名化） ===== */
const CRIT_CAP = 0.9;              // 暴击率上限
const PLAYER_RADIUS = 16;          // 玩家碰撞半径
const MIN_GOLD_RATE = 0.1;         // 金币倍率下限（防负收益）

/** 派生属性：转模系统在这里生效 */
export function computeDerived(p: Player): Player {
  p.effAtk   = p.atk + p.armor * p.armorToAtk + p.maxHp * p.hpToAtk
             + p.critRate * p.critToAtk + p.level * p.scaleLevel
             + (stageState.state.stage - 1) * p.scaleStage;
  p.effCrit  = Math.min(CRIT_CAP, p.critRate + p.speed * p.speedToCrit / 100);
  p.effSpeed = p.speed + p.atk * p.atkToSpd;
  p.effGold  = p.goldGain + (p.luck - 1) * p.luckToGold;
  p.effAtkSpd = p.atkSpd;   // 攻速 = 基础攻速（已移除暴击率→攻速隐藏联动，防负暴击穿透）
  return p;
}

/** 创建玩家 */
export function createPlayer(): Player {
  return {
    ...BASE_STATS,
    x: rSt().width / 2, y: rSt().height / 2,
    r: PLAYER_RADIUS, facing: 0, invuln: 0, level: 1,
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

export function addWeapon(id: string, opts?: { eroded?: boolean }): boolean {
  const p = pSt().player;
  if (!p) return false;
  if (p.weapons.length >= CONFIG.MAX_WEAPONS) return false;
  if (p.weapons.find(w => w.id === id)) return false;
  p.weapons.push({ id, lv: 1, ...(opts?.eroded ? { eroded: true } : {}) });
  achievements().onWeapon();
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
  statsState.set('gold', st.gold + Math.round(n * Math.max(MIN_GOLD_RATE, p.effGold)));
}

/** 获得经验 */
export function gainXp(n: number): void {
  const p = pSt().player;
  if (!p) return;
  const amt = n * p.xpGain;
  statsState.set('xp', statsState.get('xp') + amt);
  while (statsState.get('xp') >= statsState.get('xpNeeded')) {
    statsState.set('xp', statsState.get('xp') - statsState.get('xpNeeded'));
    statsState.set('xpNeeded', xpNeeded(p.level + 1));
    p.level++;
    if (p.onLevelUpHp) p.hp = Math.min(p.maxHp, p.hp + p.onLevelUpHp);
    statsState.set('level', p.level);
    statsState.set('levelQueue', statsState.get('levelQueue') + 1);
  }
  if (statsState.get('levelQueue') > 0) { gameState.set('_resumeState', sm.current); sm.transition(STATE.LEVELUP); EventBus.emit(EVENTS.PLAYER_LEVELUP, { level: p.level, queue: statsState.get('levelQueue') }); }
}
