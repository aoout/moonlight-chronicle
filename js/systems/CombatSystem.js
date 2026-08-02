// @ts-check
/* =========================================================
   蚀月远征 · ECS System：战斗逻辑
   伤害计算 / 击杀 / 受伤 / 治疗 / 近战打击
   集中管理所有战斗相关逻辑，替代 combat.js 上帝模块
   ========================================================= */
import { System } from '../core/system.js';
import { G, STATE, sm, shakeScreen, endStage, playerDeath } from '../state.js';
import { EventBus } from '../core/event_bus.js';
import { RNG, dist, rand } from '../utils.js';
import { ENEMIES, BOSSES, CONFIG } from '../data/index.js';
import { queryRadius } from '../spatial.js';
import { spawnBurst, spawnRing, spawnHitFx } from '../fx.js';
import { spawnText } from '../ui/hud.js';
import { AudioEngine } from '../audio.js';
import { persistUnlocked } from '../save.js';
import { world } from '../ecs/World.js';
import { SpawnSystem } from './SpawnSystem.js';
import { createEntity, Position, Velocity } from '../ecs/components.js';

export class CombatSystem extends System {
  name = 'CombatSystem';

  /** CombatSystem 是事件驱动的，不需要每帧更新 */
  update() {}
}

/* =========================================================
   导出函数（保持与 combat.js 相同的 API 签名）
   ========================================================= */

/* ---------- 伤害计算 ---------- */

/**
 * @param {number} base
 * @param {import('../types/core.d.ts').Player} p
 * @returns {{ dmg: number, crit: boolean }}
 */
export function calcDamage(base, p) {
  const d = { dmg: base, crit: false };
  let crit = p.effCrit + (p.hp >= p.maxHp ? p.fullHpCrit : 0);
  if (RNG() < crit) { d.crit = true; d.dmg = base * p.critDmg; }
  if (p.hp <= p.maxHp * 0.3) d.dmg *= (1 + p.lowHpDmg);
  return d;
}

/**
 * @param {import('../types/core.d.ts').EnemyInstance} e
 * @param {number} dmg
 * @param {boolean} isCrit
 * @param {string} [srcType]
 * @param {string} [srcW]
 */
export function damageEnemy(e, dmg, isCrit, srcType, srcW) {
  if (e.hp <= 0) return;
  const p = G.player;
  if (!p) return;
  if (p.fullHpCrit > 0 && p.hp >= p.maxHp && RNG() < p.fullHpCrit) isCrit = true;
  if (p.lowHpDmg > 0 && p.hp <= p.maxHp * 0.3) dmg *= (1 + p.lowHpDmg);
  if (isCrit) dmg *= p.critDmg;
  if (p._horde) {
    const hc = Math.min(10, Math.floor(G.enemies.length / 10));
    if (hc > 0) dmg *= 1 + p._horde * hc;
  }
  if (isCrit && p._critBoom && srcType !== 'splash') {
    spawnRing(e.x, e.y, '#e9c987', 0.35, 100, 3);
    spawnBurst(e.x, e.y, '#e9c987', 10);
    for (const o of queryRadius(e.x, e.y, 100)) {
      if (o !== e && !o.dead) { o.hp -= dmg * 0.5; o.flash = 0.1; if (o.hp <= 0) killEnemy(o, 'boom'); }
    }
  }
  if (p._splash && RNG() < p._splash && srcType !== 'splash') {
    spawnBurst(e.x, e.y, '#ffe9a8', 8);
    for (const o of queryRadius(e.x, e.y, 90)) {
      if (o !== e && !o.dead) { o.hp -= dmg * 0.6; o.flash = 0.1; if (o.hp <= 0) killEnemy(o, 'splash'); }
    }
  }
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 0.12;
  if (srcW) {
    G.runStats.wDmg = G.runStats.wDmg || {};
    G.runStats.wDmg[srcW] = (G.runStats.wDmg[srcW] || 0) + dmg;
  }
  if (p.lifesteal > 0) {
    healPlayer(dmg * p.lifesteal);
  }
  G.runStats.totalDmg += dmg;
  spawnHitFx(e.x, e.y, dmg, isCrit);
  if (e.hp <= 0) { killEnemy(e, srcType); EventBus.emit('enemy:killed', { type: e.type, boss: !!e.boss }); }
}

/**
 * @param {import('../types/core.d.ts').EnemyInstance} e
 * @param {string} [srcType]
 */
export function killEnemy(e, srcType) {
  if (e.dead) return;
  e.dead = 1;
  G.kills++;
  AudioEngine.playSfx('kill');
  const p = G.player;
  if (!p) return;
  const type = e.type || '';
  const gDef = ENEMIES[type] || {};
  const xpAmt = e.boss ? BOSSES[type].xp : (gDef.xp || 1);
  let goldAmt = e.boss ? BOSSES[type].gold : (gDef.gold || 1);
  if (p._goldMeteor && RNG() < p._goldMeteor) { goldAmt *= 2; spawnText(e.x, e.y - 20, '金币流星', '#f6e3b8'); }
  const luckMul = 1 + Math.max(0, (p.luck || 1) - 1) * 0.15;
  spawnDrop(e.x, e.y, 'xp', Math.round(xpAmt * luckMul));
  spawnDrop(e.x, e.y, 'gold', Math.round(goldAmt * (e.boss ? 1 : 0.6 + RNG() * 0.8) * luckMul));
  if (p._devour) spawnDrop(e.x, e.y, 'xp', p._devour);
  if (p._hunt) { p._huntT = 3; p._huntStacks = Math.min(3, (p._huntStacks || 0) + 1); }
  if (p.onKillHp > 0) healPlayer(p.onKillHp);
  if (p.boom > 0) boomExplosion(e.x, e.y, p);
  if (e.split) {
    for (let i = 0; i < e.split; i++) {
      const mini = SpawnSystem.spawnEnemy('grub', { hpMul: e.splitHp });
      mini.x = e.x + rand(-14, 14); mini.y = e.y + rand(-14, 14);
      mini.size = 5; mini.spd = 80; mini.dmg = e.dmg * 0.5;
    }
  }
  if (e.type === 'splitter') {
    spawnBurst(e.x, e.y, '#d98a8a', 14);
    spawnRing(e.x, e.y, '#d98a8a', 0.3, 70, 3);
    if (dist(p, e) < 70 + p.r) hurtPlayer(e, e.dmg * 0.8);
  }
  spawnBurst(e.x, e.y, e.color || '#fff', e.size);
  if (e.boss) {
    G.runStats.bossKills++;
    G.boss = null;
    EventBus.emit('boss:killed', { type: e.type, stage: G.stage });
    if (G.state === STATE.PLAYING) {
      if (G.stage === CONFIG.FINAL_STAGE) {
        sm.transition(STATE.WIN); G.runStats.win = true;
        if (G.depth === G.unlocked && G.unlocked < 9) { G.unlocked++; persistUnlocked(); AudioEngine.playSfx('unlock'); }
      }
      else endStage(true);
    }
  }
}

/* ---------- 玩家受伤 ---------- */

/**
 * @param {import('../types/core.d.ts').EnemyInstance|{x:number,y:number,dmg:number}} e
 * @param {number} rawDmg
 */
export function hurtPlayer(e, rawDmg) {
  const p = G.player;
  if (!p) return;
  if (p.invuln > 0 || G.state !== STATE.PLAYING) return;
  if (RNG() < p.dodge) {
    spawnText(p.x, p.y - 30, '闪避', '#9fd6e8');
    if (p._cloak) { p.invuln = Math.max(p.invuln, 0.8); p._cloakT = 0.8; }
    return;
  }
  let dmg = Math.max(1, rawDmg - p.armor * 0.8);
  if (p._shield > 0) {
    const abs = Math.min(p._shield, dmg);
    p._shield -= abs;
    dmg -= abs;
    if (dmg <= 0) { spawnText(p.x, p.y - 26, '护盾', '#9fd6e8'); return; }
  }
  if (p._oath > 0 && p.hp - dmg <= 0) {
    p._oath--;
    p.hp = 1;
    dmg = 0;
    p.invuln = Math.max(p.invuln, 1);
    spawnText(p.x, p.y - 26, '守月之约', '#e9c987');
  }
  if (p._nearDeath > 0 && p.hp - dmg <= p.maxHp * 0.25) {
    p._nearDeath = 0;
    p.invuln = Math.max(p.invuln, 3);
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
    spawnText(p.x, p.y - 40, '濒死月魄', '#e9c987');
    spawnRing(p.x, p.y, '#e9c987', 0.5, 90, 3);
    AudioEngine.playSfx('upgrade');
    return;
  }
  p.hp -= dmg;
  p.invuln = 0.45;
  G.hitFlash = 0.3;
  shakeScreen(8);
  EventBus.emit('player:hurt', { damage: dmg, hp: p.hp, maxHp: p.maxHp });
  spawnBurst(p.x, p.y, '#e2546a', 18);
  spawnText(p.x, p.y - 26, '-' + Math.round(dmg), '#e2546a');
  if (p._tideRegen && dmg > 0) p._regenBuff = 2;
  if (p.thorns > 0 && e && 'hp' in e) damageEnemy(/** @type {import('../types/core.d.ts').EnemyInstance} */ (e), dmg * p.thorns, false, 'thorns');
  if (p.hp <= 0) { p.hp = 0; AudioEngine.playSfx('hurt'); EventBus.emit('player:died'); playerDeath(); }
}

/**
 * @param {number} n
 */
export function healPlayer(n) {
  const p = G.player;
  if (!p || p.hp <= 0) return;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + n);
  if (p.hp > before) spawnText(p.x, p.y - 30, '+' + Math.round(p.hp - before), '#7fd6a4');
  if (n > 0) EventBus.emit('player:heal', { amount: n, hp: p.hp, maxHp: p.maxHp });
}

/* 近战打击（小怪/Boss 通用）：范围判定 + 震屏 + 特效 */

/**
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} dmg
 * @param {{ mul?: number, shake?: number }} [opts]
 */
export function meleeHit(x, y, r, dmg, opts) {
  const p = G.player;
  if (!p) return;
  if (dist(p, { x, y }) < r + p.r) {
    hurtPlayer({ x, y, dmg }, dmg * ((opts && opts.mul) || 1));
  }
  spawnRing(x, y, '#e2546a', 0.26, r, 3);
  spawnBurst(x, y, '#e2546a', 8);
  shakeScreen((opts && opts.shake) || 6);
}

/* 掉落物生成 */

/**
 * @param {number} x
 * @param {number} y
 * @param {string} kind
 * @param {number} amount
 */
export function spawnDrop(x, y, kind, amount) {
  world.add('drops', createEntity(
    Position(x, y),
    Velocity(rand(-40, 40), rand(-40, 40)),
    { kind, amount, t: 0, take: false }
  ));
}

/* 爆炸（爆裂之核） */

/**
 * @param {number} x
 * @param {number} y
 * @param {import('../types/core.d.ts').Player} p
 */
export function boomExplosion(x, y, p) {
  spawnBurst(x, y, '#ff9d6b', 16);
  for (const e of queryRadius(x, y, 90 * p.area)) {
    if (e.dead || e.boss) continue;
    damageEnemy(e, p.effAtk * p.boom * (0.7 + RNG() * 0.6), false, 'boom');
  }
}