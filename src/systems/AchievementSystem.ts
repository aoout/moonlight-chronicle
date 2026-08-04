/* =========================================================
   蚀月远征 · 蚀月功勋：成就系统
   订阅战斗/成长事件 + 关键点钩子，累计与单局统计，达成即解锁。
   ========================================================= */
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements.js';
import { loadAch, saveAch } from '../persistence/achievements.js';
import { EventBus } from '../core/event_bus.js';

/* ---------- 单局会话统计（每局重置） ---------- */
const session: Record<string, number> = {};
/* 累计计数（跨局，持久化） */
const accum: Record<string, number> = {};
const earned: Record<string, boolean> = {};

let _hitThisStage = false;
let _hitThisRun = false;
let _died = false;
let _stageTime0 = 0;
let _fastStageCheck = false;
let _runDepth = 0;
let _moonOnly = true;        // 本局是否仅初始武器
let _winStage = 0;

function persist(): void {
  saveAch({ counts: accum, earned });
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
}

export function achOnLevel(level: number): void {
  if (level > (session['maxLevel'] || 0)) session['maxLevel'] = level;
}
export function achOnGold(gold: number): void {
  if (gold > (session['gold'] || 0)) session['gold'] = gold;
}
export function achOnTimestop(): void { inc('timestop', 1); }

/* ---------- 事件订阅 ---------- */
export function initAchievements(): void {
  EventBus.on('enemy:killed', (d: any) => achOnKill(d.type || '', '', !!d.boss));
  EventBus.on('boss:killed', (d: any) => achOnKill(d.type || '', '', true));
  EventBus.on('player:died', () => { _died = true; });
  EventBus.on('player:levelup', (d: any) => achOnLevel(d.level || 0));
  EventBus.on('stage:start', () => { achOnStageStart(); tryUnlock(); });
  EventBus.on('game:runEnd', (d: any) => {
    if (d && d.win) {
      _winStage = d.stage || 0;
      session['gold'] = d.gold || 0;
      inc('run', 1);
      // 夜数累计（按通关夜数）
      inc('stage', d.stage || 0);
      if ((d.stage || 0) >= 20) {
        if (_runDepth >= 9) inc('depth9', 1);
      }
    }
    tryUnlock();
  });
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
        case 'a_fast_boss': return _fastStageCheck && session.stageKills >= 50 ? 1 : 0;
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
      EventBus.emit('achievement:unlocked', { id: a.id, name: a.name });
    }
  }
}

/* ---------- 对外读取 ---------- */
export function achProgressOf(a: AchievementDef): number {
  return Math.min(testOf(a), a.target);
}
export function achIsEarned(id: string): boolean { return !!earned[id]; }
export function achEarnedTotal(): number { return Object.keys(earned).length; }
export function achTotal(): number { return ACHIEVEMENTS.length; }
