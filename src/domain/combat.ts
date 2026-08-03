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

/* ===== 道具统计追踪 ===== */

function ensureItemStats(p: Player, id: string): import('../types/core.d.ts').ItemStats {
  if (!p.effects.itemStats) p.effects.itemStats = {};
  if (!p.effects.itemStats[id]) {
    p.effects.itemStats[id] = { dmg: 0, stageDmg: 0, lastStageDmg: 0, extraGold: 0, stageExtraGold: 0, lastStageExtraGold: 0 };
  }
  return p.effects.itemStats[id]!;
}

function trackItemDmg(p: Player, itemId: string, dmg: number): void {
  const s = ensureItemStats(p, itemId);
  s.dmg += dmg;
  s.stageDmg += dmg;
}

/* 道具造成的伤害来源（计入道具伤害占比，而非武器） */
const ITEM_DMG_SRC = new Set(['starfall', 'duo', 'chainItem']);

function trackItemExtraGold(p: Player, itemId: string, gold: number): void {
  const s = ensureItemStats(p, itemId);
  s.extraGold += gold;
  s.stageExtraGold += gold;
}

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
    // 暴月之眼：金色光爆（双冲击环 + 星芒 + 金色火花 + 光晕）
    EventBus.emit('visual:ring', { x: e.x, y: e.y, color: '#e9c987', life: 0.4, radius: 100, width: 3.2 });
    EventBus.emit('visual:ring', { x: e.x, y: e.y, color: '#fff5d6', life: 0.3, radius: 58, width: 2 });
    EventBus.emit('visual:star', { x: e.x, y: e.y, color: '#e9c987', size: 17 });
    EventBus.emit('visual:spark', { x: e.x, y: e.y, color: '#ffe9a8', count: 12, speed: 190 });
    EventBus.emit('visual:glow', { x: e.x, y: e.y, color: '#e9c987', size: 24, life: 0.35 });
    for (const o of (queryRadius(e.x, e.y, 100) as EnemyInstance[])) {
      if (o !== e && !o.dead) { const cbDmg = dmg * 0.5; o.hp -= cbDmg; o.flash = 0.1; trackItemDmg(p, 'critBoom', cbDmg); if (o.hp <= 0) killEnemy(o, 'boom'); }
    }
  }
  if (p.effects.splash && RNG() < p.effects.splash && srcType !== 'splash') {
    // 破晓溅射：金光碎浪（粒子 + 小冲击环 + 白火花）
    EventBus.emit('visual:burst', { x: e.x, y: e.y, color: '#ffe9a8', count: 12 });
    EventBus.emit('visual:ring', { x: e.x, y: e.y, color: '#ffe9a8', life: 0.26, radius: 62, width: 1.6 });
    EventBus.emit('visual:spark', { x: e.x, y: e.y, color: '#fff5d6', count: 7, speed: 150 });
    EventBus.emit('visual:shard', { x: e.x, y: e.y, color: '#e9c987', count: 4, speed: 170 });
    for (const o of (queryRadius(e.x, e.y, 90) as EnemyInstance[])) {
      if (o !== e && !o.dead) { const spDmg = dmg * 0.6; o.hp -= spDmg; o.flash = 0.1; trackItemDmg(p, 'splash', spDmg); if (o.hp <= 0) killEnemy(o, 'splash'); }
    }
  }
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg;
  e.flash = 0.12;
  EventBus.emit('combat:hit', { target: e, damage: dmg, crit: isCrit, srcType, srcW });
  const rs = { ...sSt().runStats };
  rs.totalDmg += dmg;
  /* 道具伤害统一归属：starfall（群星陨落）/ duo（连星之弩）/ chainItem（雷纹刻印）
     计入道具统计而非武器统计，保证 武器 + 道具 = 100% */
  if (srcW) {
    if (ITEM_DMG_SRC.has(srcW)) trackItemDmg(p, srcW, dmg);
    else rs.wDmg = { ...(rs.wDmg || {}), [srcW]: (rs.wDmg[srcW] || 0) + dmg };
  }
  statsState.set('runStats', rs);
  /* 道具伤害追踪（无 srcW 的爆炸/反伤类） */
  if (srcType === 'boom') trackItemDmg(p, 'boom', dmg);
  else if (srcType === 'thorns') trackItemDmg(p, 'thorns', dmg);
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
  if (p.effects.goldMeteor && RNG() < p.effects.goldMeteor) { const extraGold = goldAmt; goldAmt *= 2; trackItemExtraGold(p, 'goldMeteor', extraGold); EventBus.emit('ui:spawnText', { x: e.x, y: e.y - 20, text: '金币流星', color: '#f6e3b8' }); }
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
  EventBus.emit('audio:sfx', { name: 'hurt' });
  // 攻击者攻击动作特效（近战接触伤害：撕咬/撞击/重拳等）
  const atkType = e && 'type' in e ? (e as any).type : '';
  const ex = e && 'x' in e ? (e as any).x : p.x;
  const ey = e && 'y' in e ? (e as any).y : p.y;
  if (atkType) {
    if (atkType === 'giant') {
      // 巨噬者：重拳砸地（大冲击环 + 尘土）
      EventBus.emit('visual:ring', { x: ex, y: ey, color: '#4a5a72', life: 0.35, radius: 55, width: 3 });
      EventBus.emit('visual:burst', { x: ex, y: ey, color: '#7a8aa5', count: 10 });
    } else if (atkType === 'charger') {
      // 裂口魔：独角撞击（赤红火花 + 冲击）
      EventBus.emit('visual:spark', { x: ex, y: ey, color: '#e2546a', count: 6, speed: 180 });
      EventBus.emit('visual:ring', { x: ex, y: ey, color: '#e2546a', life: 0.25, radius: 34, width: 2.4 });
    } else if (atkType === 'splitter') {
      // 血疱魔：血疱崩溅
      EventBus.emit('visual:burst', { x: ex, y: ey, color: '#d98a8a', count: 8 });
    } else if (atkType === 'bomber') {
      // 自爆魔：贴身爆燃
      EventBus.emit('visual:spark', { x: ex, y: ey, color: '#ff9d6b', count: 8, speed: 200 });
    } else {
      // 撕咬/扑击类（grub/rat/armored/wing/shadow）：口器闪光
      EventBus.emit('visual:spark', { x: ex, y: ey, color: '#ffd9a8', count: 5, speed: 160 });
    }
  }
  renderState.set('hitFlash', 0.3);
  shakeScreen(8);
  EventBus.emit('player:hurt', { damage: dmg, hp: p.hp, maxHp: p.maxHp });
  EventBus.emit('visual:burst', { x: p.x, y: p.y, color: '#e2546a', count: 18 });
  EventBus.emit('ui:spawnText', { x: p.x, y: p.y - 26, text: '-' + Math.round(dmg), color: '#e2546a' });
  if (p.effects.tideRegen && dmg > 0) p.effects.regenBuff = 2;
  if (p.thorns > 0 && e && 'hp' in e) {
    // 荆棘反伤：血色尖刺迸发
    EventBus.emit('visual:burst', { x: p.x, y: p.y, color: '#ff5a6a', count: 9 });
    EventBus.emit('visual:ring', { x: p.x, y: p.y, color: '#e2546a', life: 0.3, radius: 42, width: 2 });
    EventBus.emit('visual:spark', { x: p.x, y: p.y, color: '#ff8a8a', count: 8, speed: 210 });
    EventBus.emit('visual:glow', { x: p.x, y: p.y, color: '#e2546a', size: 16, life: 0.3 });
    damageEnemy(e as EnemyInstance, dmg * p.thorns, false, 'thorns');
  }
  if (p.hp <= 0) { p.hp = 0; EventBus.emit('player:died'); playerDeath(); }
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
  // 爆炸：金色火球 + 双冲击环 + 旋转碎片 + 白炽火花 + 光晕
  EventBus.emit('visual:ring', { x, y, color: '#ffb84d', life: 0.42, radius: 90 * p.area, width: 3.5 });
  EventBus.emit('visual:ring', { x, y, color: '#fff2cc', life: 0.28, radius: 50 * p.area, width: 2 });
  EventBus.emit('visual:glow', { x, y, color: '#ff7a3c', size: 26, life: 0.4 });
  EventBus.emit('visual:burst', { x, y, color: '#ffd9a8', count: 16 });
  EventBus.emit('visual:shard', { x, y, color: '#ff9d6b', count: 8, speed: 240 });
  EventBus.emit('visual:spark', { x, y, color: '#fff5d6', count: 10, speed: 220 });
  EventBus.emit('visual:streak', { x, y, color: '#ffd9a8', ang: 0, len: 34, w: 2.4, life: 0.3 });
  for (const e of queryRadius(x, y, 90 * p.area)) {
    if (e.dead || e.boss) continue;
    damageEnemy(e, p.effAtk * p.boom * (0.7 + RNG() * 0.6), false, 'boom');
  }
}
