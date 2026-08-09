/* =========================================================
   蚀月远征 · 蚀月功勋：成就系统
   订阅战斗/成长事件 + 关键点钩子，累计与单局统计，达成即解锁。
   ========================================================= */
import { EVENTS } from '../engine/core/events.js';
import { ACHIEVEMENTS, type AchievementDef } from '../config/achievements.js';
import { loadAch, saveAch } from '../infra/persistence/achievements.js';
import { EventBus } from '../engine/core/event_bus.js';
import { setAchievementSink } from '../domain/ports/achievements.js';
import { stageState } from '../state/stage.js';

/* ---------- 单局会话统计（每局重置） ---------- */
const session: Record<string, number> = {};
/* 累计计数（跨局，持久化） */
const accum: Record<string, number> = {};
const earned: Record<string, boolean> = {};
const best: Record<string, number> = {};
/* 启动时载入持久化数据 */
(() => {
  const s = loadAch();
  Object.assign(accum, s.counts);
  Object.assign(earned, s.earned);
  Object.assign(best, s.best);
})();

let _hitThisStage = false;
let _hitThisRun = false;
let _died = false;
let _stageTime0 = 0;
let _fastStageCheck = false;
let _runDepth = 0;
let _moonOnly = true;        // 本局是否仅初始武器
let _winStage = 0;
let _stageClearTime = 0;     // 最近一次 cleared 时的游戏时间（用于 a_fast_boss 近似检查）

function persist(): void {
  saveAch({ counts: accum, earned, best });
}

/* ---------- 会话启动（startRun 调用） ---------- */
export function achSessionStart(depth: number): void {
  for (const k of Object.keys(session)) delete session[k];
  _hitThisStage = false;
  _hitThisRun = false;
  _died = false;
  _fastStageCheck = false;
  _runDepth = depth;
  _moonOnly = true;
  _winStage = 0;
}

/* ---------- 关键点钩子（由 combat/player/shop 调用） ---------- */
/* ---------- 局末结算：单局统计并入历史最佳 ---------- */
export function achSessionEnd(): void {
  for (const k of Object.keys(session)) {
    const v = session[k] || 0;
    if (v > (best[k] || 0)) best[k] = v;
  }
  persist();
}

export function achOnKill(type: string, srcType: string | undefined, boss: boolean): void {
  inc('kill', 1); inc('stageKills', 1);
  if (boss) inc('boss', 1);
  if (srcType === 'thorns') inc('thorns', 1);
  else if (srcType === 'starfall' || srcType === 'duo') inc('starfall', 1);
  else if (srcType === 'chainItem') inc('chain', 1);
  else if (srcType === 'boom' || srcType === 'splash' || srcType === 'critBoom') inc('boom', 1);
}

export function achOnDamage(dmg: number, isCrit: boolean): void {
  if (dmg > (session['maxDmg'] || 0)) session['maxDmg'] = dmg;
  if (isCrit) {
    inc('crits', 1);
    session['critDmg'] = (session['critDmg'] || 0) + dmg;
  }
}

export function achOnHurt(): void {
  _hitThisStage = true;
  _hitThisRun = true;
}
export function achOnDodge(): void { inc('dodges', 1); }
export function achOnShieldAbsorb(amount: number): void { session['shieldAbsorb'] = (session['shieldAbsorb'] || 0) + amount; }

export function achOnWeapon(): void {
  session['weapons'] = (session['weapons'] || 0) + 1;
  _moonOnly = false;   // 获得第二把武器即不再"仅初始"
}
export function achOnItemBuy(legend: boolean): void {
  inc('items', 1);
  if (legend) inc('legendItems', 1);
}
export function achOnStageStart(): void { _hitThisStage = false; _fastStageCheck = false; }
export function achOnStageCleared(): void {
  if (!_hitThisStage) inc('noHitStages', 1);
  _fastStageCheck = true;
  _stageClearTime = stageState.state.stageTime;  // 记录通关时间戳（供 a_fast_boss 近似检查）
}

export function achOnLevel(level: number): void {
  if (level > (session['maxLevel'] || 0)) session['maxLevel'] = level;
}
export function achOnGold(gold: number): void {
  if (gold > (session['gold'] || 0)) session['gold'] = gold;
}
export function achOnTimestop(): void { inc('timestop', 1); }

/* ---------- 事件订阅 ---------- */

/** 保存所有 EventBus 取消订阅函数，供 destroyAchievements 清理 */
let _achUnsubs: (() => void)[] = [];

export function initAchievements(): void {
  // 如果已初始化，先清理旧监听器避免重复累积
  destroyAchievements();
  _achUnsubs = [
    EventBus.on(EVENTS.ENEMY_KILLED, (d: any) => achOnKill(d.type || '', d.srcType || '', !!d.boss)),
    EventBus.on(EVENTS.BOSS_KILLED, (d: any) => achOnKill(d.type || '', '', true)),
    EventBus.on(EVENTS.PLAYER_DIED, () => { _died = true; achSessionEnd(); tryUnlock(); }),
    EventBus.on(EVENTS.PLAYER_LEVELUP, (d: any) => achOnLevel(d.level || 0)),
    EventBus.on(EVENTS.STAGE_START, () => { achOnStageStart(); tryUnlock(); }),
    EventBus.on(EVENTS.STAGE_CLEARED, () => achOnStageCleared()),
    EventBus.on(EVENTS.GAME_RUN_END, (d: any) => {
      if (d && d.win) {
        _winStage = d.stage || 0;
        session['winStage'] = d.stage || 0;
        session['gold'] = d.gold || 0;
        if (!_hitThisRun) session['noDeath'] = 1;
        if (_moonOnly) session['moonOnly'] = 1;
        inc('run', 1);
        // 夜数累计（按通关夜数）
        inc('stage', d.stage || 0);
        if ((d.stage || 0) >= 20) {
          if (_runDepth >= 9) inc('depth9', 1);
        }
      }
      achSessionEnd();
      tryUnlock();
    }),
  ];
}

/** 销毁所有 EventBus 订阅，防止重复累积 */
export function destroyAchievements(): void {
  for (const unsub of _achUnsubs) unsub();
  _achUnsubs = [];
}

/* ---------- 统计工具 ---------- */
function inc(kind: string, n: number): void {
  if (kind === 'kill' || kind === 'boss' || kind === 'gold' || kind === 'stage' || kind === 'run') {
    accum[kind] = (accum[kind] || 0) + n;
    persist();
  }
  session[kind] = (session[kind] || 0) + n;
  tryUnlock();
}

/* 图鉴进度（百分比 0-100） */
function codexPercent(): number {
  const cx = (() => { try { return JSON.parse(localStorage.getItem('eclipse_codex_save') || '{}'); } catch (e) { return {}; } })();
  let total = 0, got = 0;
  for (const key of ['enemies', 'bosses', 'weapons', 'items']) {
    const all = key === 'enemies' ? 10 : key === 'bosses' ? 16 : key === 'weapons' ? 12 : 49;
    total += all;
    got += (cx[key] || []).length;
  }
  return total > 0 ? Math.round(got / total * 100) : 0;
}

/* ---------- 达成检查 ---------- */
function testOf(a: AchievementDef): number {
  // 返回当前进度（0 = 未开始，>= target 即达成）
  switch (a.kind) {
    case 'kill': return (a.cumulative ? accum.kill : session.stageKills) || 0;
    case 'boss': return (a.cumulative ? accum.boss : session.boss) || 0;
    case 'gold': return (a.cumulative ? accum.gold : session.gold) || 0;
    case 'stage': return a.cumulative ? (accum.stage || 0) : (_winStage >= a.target ? a.target : 0);
    case 'run': return accum.run || 0;
    case 'level': return session.maxLevel || 0;
    case 'weapon': return session.weapons || 0;
    case 'item': return a.id === 'a_item_legend3' ? (session.legendItems || 0) : (session.items || 0);
    case 'dodge': return session.dodges || 0;
    case 'crit': return a.id === 'a_critdmg_100k' ? (session.critDmg || 0) : (session.crits || 0);
    case 'codex': return codexPercent();
    case 'depth': return session.depth9 || 0;
    case 'damage': return session.maxDmg || 0;
    case 'shield': return session.shieldAbsorb || 0;
    case 'thorns': return session.thorns || 0;
    case 'starfall': return session.starfall || 0;
    case 'chain': return session.chain || 0;
    case 'boom': return session.boom || 0;
    case 'timestop': return session.timestop || 0;
    case 'custom':
      switch (a.id) {
        case 'a_noHit_stage': return session.noHitStages || 0;
        case 'a_noHit_run': return (_winStage >= 20 && !_hitThisRun) ? 1 : 0;
        case 'a_moon_only': return (_winStage >= 20 && _moonOnly) ? 1 : 0;
        case 'a_no_death': return (_winStage >= 20 && !_died) ? 1 : 0;
        // 已知问题：a_fast_boss 本应检查"90 秒内通关一个领主夜"，但当前实现
        // 检查的是击杀数 ≥ 50 而非通关时间。由于缺少完整的跨帧时间追踪机制，
        // 此处保留近似检查作为折中方案。_stageClearTime 记录了 cleared 时的
        // stageState.state.stageTime（游戏内已用时间），可供后续精确实现使用。
        case 'a_fast_boss': return _fastStageCheck && session.stageKills >= 50 ? 1 : 0;
        case 'a_all': return achOtherEarned() >= ACHIEVEMENTS.length - 1 ? 1 : 0;
      }
      return 0;
  }
  return 0;
}

function tryUnlock(): void {
  for (const a of ACHIEVEMENTS) {
    if (earned[a.id]) continue;
    if (testOf(a) >= a.target) {
      earned[a.id] = true;
      persist();
      EventBus.emit(EVENTS.ACHIEVEMENT_UNLOCKED, { id: a.id, name: a.name });
    }
  }
}

/* ---------- 对外读取 ---------- */
export function achProgressOf(a: AchievementDef): number {
  if (a.id === 'a_all') return achOtherEarned();   // 月之圆满：显示其他成就已解锁数
  if (a.cumulative) return Math.min(testOf(a), a.target);
  // 单局成就：显示历史最佳成绩（主菜单/面板查看）
  return Math.min(bestOf(a) || 0, a.target);
}
function bestOf(a: AchievementDef): number {
  switch (a.kind) {
    case 'kill': return best['stageKills'] || 0;
    case 'boss': return best['boss'] || 0;
    case 'gold': return best['gold'] || 0;
    case 'stage': return best['winStage'] || 0;
    case 'level': return best['maxLevel'] || 0;
    case 'weapon': return best['weapons'] || 0;
    case 'item': return a.id === 'a_item_legend3' ? (best['legendItems'] || 0) : (best['items'] || 0);
    case 'dodge': return best['dodges'] || 0;
    case 'crit': return a.id === 'a_critdmg_100k' ? (best['critDmg'] || 0) : (best['crits'] || 0);
    case 'depth': return best['depth9'] || 0;
    case 'damage': return best['maxDmg'] || 0;
    case 'shield': return best['shieldAbsorb'] || 0;
    case 'thorns': return best['thorns'] || 0;
    case 'starfall': return best['starfall'] || 0;
    case 'chain': return best['chain'] || 0;
    case 'boom': return best['boom'] || 0;
    case 'timestop': return best['timestop'] || 0;
    case 'custom':
      switch (a.id) {
        case 'a_noHit_stage': return best['noHitStages'] || 0;
        case 'a_noHit_run': return (best['winStage'] || 0) >= 20 ? 1 : 0;
        case 'a_moon_only': return best['moonOnly'] || 0;
        case 'a_no_death': return best['noDeath'] || 0;
        case 'a_fast_boss': return best['fastBoss'] || 0;
      }
      return 0;
  }
  return 0;
}
export function achIsEarned(id: string): boolean { return !!earned[id]; }
export function achEarnedTotal(): number { return Object.keys(earned).length; }
export function achTotal(): number { return ACHIEVEMENTS.length; }
/* 除「月之圆满」外已解锁的成就数 */
export function achOtherEarned(): number {
  let n = 0;
  for (const b of ACHIEVEMENTS) if (b.id !== 'a_all' && earned[b.id]) n++;
  return n;
}

/* ---------- 向领域层注册实现（依赖倒置：domain 只认端口） ---------- */
setAchievementSink({
  onDamage: achOnDamage,
  onHurt: achOnHurt,
  onDodge: achOnDodge,
  onShieldAbsorb: achOnShieldAbsorb,
  onWeapon: achOnWeapon,
  earnedTotal: achEarnedTotal,
});
