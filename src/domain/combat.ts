/* =========================================================
   蚀月远征 · 领域模块：战斗逻辑
   伤害计算 / 击杀 / 受伤 / 治疗 / 近战打击 / 掉落生成 / 爆炸
   从 CombatSystem 静态方法与独立函数迁出
   ========================================================= */
import { STATE, sm } from '../core/states.js';
import { statsState } from '../state/stats.js';
import { stageState } from '../state/stage.js';
import { entityState } from '../state/entities.js';
import { playerState } from '../state/player.js';
import { renderState } from '../state/render.js';
import { gameState } from '../state/game.js';
import { EventBus } from '../core/event_bus.js';
import { RNG, dist, rand } from '../utils.js';
import { ENEMIES, BOSSES, CONFIG } from '../data/index.js';
import { queryRadius } from '../systems/SpatialSystem.js';
import { persistUnlocked } from '../persistence/save.js';
import { world } from '../ecs/World.js';
import { endStage, playerDeath } from '../core/states.js';
import { shakeScreen } from '../state/render.js';
import { spawnEnemy } from './spawn.js';
import { createEntity, Position, Velocity } from '../ecs/components.js';
import type { EnemyInstance, Player } from '../types/core.d.ts';

import { sSt, gSt, eSt, pSt, rSt, gmSt } from '../state/accessors.js';

export function damageEnemy(e: EnemyInstance, dmg: number, isCrit: boolean, srcType?: string, srcW?: string): void {
  if (e.hp <= 0) return;
  const p = pSt().player;
  if (!p) return;
  // fullHpCrit 与 effCrit 加法叠加（与 calcDamage 一致）
  if (p.hp >= p.maxHp && p.fullHpCrit > 0) {
    const totalCrit = Math.min(0.9, p.effCrit + p.fullHpCrit);
    if (RNG() < totalCrit) isCrit = true;
  }
  if (p.lowHpDmg > 0 && p.hp <= p.maxHp * 0.3) dmg *= (1 + p.lowHpDmg);
  if (isCrit) dmg *= p.critDmg;
  if (p.effects.horde) {
    const hc = Math.min(10, Math.floor(eSt().enemies.length / 10));
    if (hc > 0) dmg *= 1 + p.effects.horde * hc;
  }
  if (isCrit && p.effects.critBoom && srcType !== 'splash') {
    EventBus.emit('visual:ring', { x: e.x, y: e.y, color: '#e9c987', life: 0.35, radius: 100, width: 3 });
    EventBus.emit('visual:burst', { x: e.x, y: e.y, color: '#e9c987', count: 10 });
    for (const o of (queryRadius(e.x, e.y, 100) as EnemyInstance[])) {
      if (o !== e && !o.dead) { o.hp -= dmg * 0.5; o.flash = 0.1; if (o.hp <= 0) killEnemy(o, 'boom'); }
    }
  }
  if (p.effects.splash && RNG() < p.effects.splash && srcType !== 'splash') {
    EventBus.emit('visual:burst', { x: e.x, y: e.y, color: '#ffe9a8', count: 8 });
    for (const o of (queryRadius(e.x, e.y, 90) as EnemyInstance[])) {
      if (o !== e && !o.dead) { o.hp -= dmg * 0.6; o.flash = 0.1; if (o.hp <= 0) killEnemy(o, 'splash'); }
    }
  }
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 0.12;
  EventBus.emit('combat:hit', { target: e, damage: dmg, crit: isCrit, srcType, srcW });
  const rs = { ...sSt().runStats };
  rs.totalDmg += dmg;
  if (srcW) {
    rs.wDmg = { ...(rs.wDmg || {}), [srcW]: (rs.wDmg[srcW] || 0) + dmg };
  }
  statsState.set('runStats', rs);
  if (p.lifesteal > 0) {
    healPlayer(dmg * p.lifesteal);
  }
  EventBus.emit('visual:hitFx', { x: e.x, y: e.y, dmg, crit: isCrit });
  if (e.hp <= 0) { killEnemy(e, srcType); EventBus.emit('enemy:killed', { type: e.type || '', boss: !!e.boss }); }
}

export function killEnemy(e: EnemyInstance, srcType?: string): void {
  if (e.dead) return;
  e.dead = 1;
  statsState.set('kills', sSt().kills + 1);
  EventBus.emit('audio:sfx', { name: 'kill' });
  const p = pSt().player;
  if (!p) return;
  const type = e.type || '';
  const gDef = ENEMIES[type] || {};
  const xpAmt = e.boss ? BOSSES[type].xp : (gDef.xp || 1);
  let goldAmt = e.boss ? BOSSES[type].gold : (gDef.gold || 1);
  if (p.effects.goldMeteor && RNG() < p.effects.goldMeteor) { goldAmt *= 2; EventBus.emit('ui:spawnText', { x: e.x, y: e.y - 20, text: '金币流星', color: '#f6e3b8' }); }
  const luckMul = 1 + Math.max(0, (p.luck || 1) - 1) * 0.15;
  spawnDrop(e.x, e.y, 'xp', Math.round(xpAmt * luckMul));
  spawnDrop(e.x, e.y, 'gold', Math.round(goldAmt * (e.boss ? 1 : 0.6 + RNG() * 0.8) * luckMul));
  if (p.effects.devour) spawnDrop(e.x, e.y, 'xp', p.effects.devour);
  if (p.effects.hunt) { p.effects.huntTimer = 3; p.effects.huntStacks = Math.min(3, (p.effects.huntStacks || 0) + 1); }
  if (p.onKillHp > 0) healPlayer(p.onKillHp);
  if (p.boom > 0) boomExplosion(e.x, e.y, p);
  if (e.split) {
    for (let i = 0; i < e.split; i++) {
      const mini = spawnEnemy('grub', { hpMul: e.splitHp });
      mini.x = e.x + rand(-14, 14); mini.y = e.y + rand(-14, 14);
      mini.size = 5; mini.spd = 80; mini.dmg = e.dmg * 0.5;
    }
  }
  if ((e.type || '') === 'splitter') {
    EventBus.emit('visual:burst', { x: e.x, y: e.y, color: '#d98a8a', count: 14 });
    EventBus.emit('visual:ring', { x: e.x, y: e.y, color: '#d98a8a', life: 0.3, radius: 70, width: 3 });
    if (dist(p, e) < 70 + p.r) hurtPlayer(e, e.dmg * 0.8);
  }
  EventBus.emit('visual:burst', { x: e.x, y: e.y, color: e.color || '#fff', count: e.size });
  if (e.boss) {
    const gs = gSt();
    const rs = { ...sSt().runStats, bossKills: sSt().runStats.bossKills + 1 };
    stageState.set('boss', null);
    EventBus.emit('boss:killed', { type: e.type || '', stage: gs.stage });
    if (sm.current === STATE.PLAYING) {
      if (gs.stage === CONFIG.FINAL_STAGE) {
        rs.win = true;
        sm.transition(STATE.WIN);
        if (gs.depth === gs.unlocked && gs.unlocked < 9) { stageState.set('unlocked', gs.unlocked + 1); persistUnlocked(); EventBus.emit('audio:sfx', { name: 'unlock' }); }
      }
      else endStage(true);
    }
    statsState.set('runStats', rs);
  }
}

/* ---------- 玩家受伤 ---------- */

export function hurtPlayer(e: { x: number; y: number; dmg: number } | EnemyInstance | Player, rawDmg: number): void {
  const p = pSt().player;
  if (!p) return;
  if (p.invuln > 0 || sm.current !== STATE.PLAYING) return;
  if (RNG() < p.dodge) {
    EventBus.emit('ui:spawnText', { x: p.x, y: p.y - 30, text: '闪避', color: '#9fd6e8' });
    if (p.effects.cloak) { p.invuln = Math.max(p.invuln, 0.8); p.effects.cloakTimer = 0.8; }
    return;
  }
  let dmg = Math.max(1, rawDmg - p.armor * 0.8);
  if ((p.effects.shield ?? 0) > 0) {
    const abs = Math.min(p.effects.shield ?? 0, dmg);
    p.effects.shield = (p.effects.shield ?? 0) - abs;
    dmg -= abs;
    if (dmg <= 0) { EventBus.emit('ui:spawnText', { x: p.x, y: p.y - 26, text: '护盾', color: '#9fd6e8' }); return; }
  }
  if ((p.effects.oath ?? 0) > 0 && p.hp - dmg <= 0) {
    p.effects.oath = (p.effects.oath ?? 0) - 1;
    p.hp = 1;
    dmg = 0;
    p.invuln = Math.max(p.invuln, 1);
    EventBus.emit('ui:spawnText', { x: p.x, y: p.y - 26, text: '守月之约', color: '#e9c987' });
  }
  if ((p.effects.nearDeath ?? 0) > 0 && p.hp - dmg <= p.maxHp * 0.25) {
    p.effects.nearDeath = 0;
    p.invuln = Math.max(p.invuln, 3);
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
    EventBus.emit('ui:spawnText', { x: p.x, y: p.y - 40, text: '濒死月魄', color: '#e9c987' });
    EventBus.emit('visual:ring', { x: p.x, y: p.y, color: '#e9c987', life: 0.5, radius: 90, width: 3 });
    EventBus.emit('audio:sfx', { name: 'upgrade' });
    return;
  }
  p.hp -= dmg;
  p.invuln = 0.45;
  renderState.set('hitFlash', 0.3);
  shakeScreen(8);
  EventBus.emit('player:hurt', { damage: dmg, hp: p.hp, maxHp: p.maxHp });
  EventBus.emit('visual:burst', { x: p.x, y: p.y, color: '#e2546a', count: 18 });
  EventBus.emit('ui:spawnText', { x: p.x, y: p.y - 26, text: '-' + Math.round(dmg), color: '#e2546a' });
  if (p.effects.tideRegen && dmg > 0) p.effects.regenBuff = 2;
  if (p.thorns > 0 && e && 'hp' in e) damageEnemy(e as EnemyInstance, dmg * p.thorns, false, 'thorns');
  if (p.hp <= 0) { p.hp = 0; EventBus.emit('audio:sfx', { name: 'hurt' }); EventBus.emit('player:died'); playerDeath(); }
}

export function healPlayer(n: number): void {
  const p = pSt().player;
  if (!p || p.hp <= 0) return;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + n);
  if (p.hp > before) EventBus.emit('ui:spawnText', { x: p.x, y: p.y - 30, text: '+' + Math.round(p.hp - before), color: '#7fd6a4' });
  if (n > 0) EventBus.emit('player:heal', { amount: n, hp: p.hp, maxHp: p.maxHp });
}

/* 近战打击（小怪/Boss 通用）：范围判定 + 震屏 + 特效 */

export function meleeHit(x: number, y: number, r: number, dmg: number, opts?: { mul?: number; shake?: number }): void {
  const p = pSt().player;
  if (!p) return;
  if (dist(p, { x, y }) < r + p.r) {
    hurtPlayer({ x, y, dmg }, dmg * ((opts && opts.mul) || 1));
  }
  EventBus.emit('visual:ring', { x, y, color: '#e2546a', life: 0.26, radius: r, width: 3 });
  EventBus.emit('visual:burst', { x, y, color: '#e2546a', count: 8 });
  shakeScreen((opts && opts.shake) || 6);
}

/* 掉落物生成 */

export function spawnDrop(x: number, y: number, kind: string, amount: number): void {
  world.add('drops', createEntity(
    Position(x, y),
    Velocity(rand(-40, 40), rand(-40, 40)),
    { kind, amount, t: 0, take: false }
  ));
}

/* 爆炸（爆裂之核） */

export function boomExplosion(x: number, y: number, p: Player): void {
  EventBus.emit('visual:burst', { x, y, color: '#ff9d6b', count: 16 });
  for (const e of queryRadius(x, y, 90 * p.area)) {
    if (e.dead || e.boss) continue;
    damageEnemy(e, p.effAtk * p.boom * (0.7 + RNG() * 0.6), false, 'boom');
  }
}
