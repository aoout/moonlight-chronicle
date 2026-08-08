/* =========================================================
   蚀月远征 · 领域模块：战斗逻辑
   伤害计算 / 击杀 / 受伤 / 治疗 / 近战打击 / 掉落生成 / 爆炸
   从 CombatSystem 静态方法与独立函数迁出
   ========================================================= */
import { PALETTE } from '../assets/palette.js';
import { EVENTS } from '../engine/core/events.js';
import { STATE, sm } from '../engine/core/states.js';
import { statsState } from '../state/stats.js';
import { stageState } from '../state/stage.js';
import { entityState } from '../state/entities.js';
import { playerState } from '../state/player.js';
import { renderState } from '../state/render.js';
import { gameState } from '../state/flow.js';
import { EventBus } from '../engine/core/event_bus.js';
import { RNG, dist, rand } from '../engine/util/utils.js';
import { ENEMIES, CONFIG } from '../config/index.js';
import { queryRadius } from '../engine/spatial/SpatialSystem.js';
import { world } from '../engine/ecs/World.js';
import { endStage, playerDeath } from '../engine/core/states.js';
import { achievements } from './ports/achievements.js';
import { shakeScreen } from '../state/render.js';
import { spawnEnemy } from './spawn.js';
import { Position, Velocity } from '../engine/ecs/entity_factories.js';
import { addGold } from './player.js';
import { addMoonPacts } from '../state/fortune.js';
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
const ITEM_DMG_SRC = new Set(['starfall', 'duo', 'chainItem', 'achJudge', 'yourMoon']);

function trackItemExtraGold(p: Player, itemId: string, gold: number): void {
  const s = ensureItemStats(p, itemId);
  s.extraGold += gold;
  s.stageExtraGold += gold;
}

/* ===== 战斗平衡参数（魔法数字具名化，避免散落的裸数值） ===== */
const CRIT_CAP = 0.9;               // 暴击率上限
const LOW_HP_DMG_THRESHOLD = 0.3;   // 低血增伤线（30% 以下）
const MOON_CRIT_BONUS = 1.5;        // 残月必爆：暴伤额外 +50%
const HORDE_DIVISOR = 10;           // 兽潮：每 10 敌叠一层
const HORDE_MAX_STACKS = 10;        // 兽潮层数上限
const CRIT_BOOM_RADIUS = 100;       // 暴月之眼溅射范围
const CRIT_BOOM_RATIO = 0.5;        // 暴月之眼溅射伤害比例
const SPLASH_RADIUS = 90;           // 破晓溅射范围
const SPLASH_RATIO = 0.6;           // 破晓溅射伤害比例
const MIN_DMG = 1;                  // 最低伤害保底
const MOON_WANE_SHIELD_CAP = 30;    // 回澜之护护盾上限
const MOON_WANE_SHIELD_RATE = 0.12; // 回澜之护伤害转化率
const ARMOR_REDUCTION = 0.8;        // 护甲减免系数
const NEAR_DEATH_THRESHOLD = 0.25;  // 濒死线（25% 以下触发）
const NEAR_DEATH_HEAL_RATE = 0.3;   // 濒死回复（30% 最大生命）
const NEAR_DEATH_INVULN = 3;        // 濒死无敌时长（秒）
const HIT_INVULN = 0.45;            // 受击无敌时长（秒）
const MOON_WAX_SHIELD_RATE = 0.05;  // 月影壁垒：受击生成 5% 最大生命护盾
const MOON_WAX_CD = 8;              // 月影壁垒冷却（秒）
const GOLD_DROP_MIN = 0.6;          // 金币掉落浮动下限
const GOLD_DROP_RANGE = 0.8;        // 金币掉落浮动区间宽度
const HUNT_TIMER = 3;               // 狩猎层数持续时长（秒）
const HUNT_MAX_STACKS = 8;          // 狩猎层数上限
const MOON_KILL_TRIGGER = 3;        // 残月：每击杀 3 敌蓄满必爆

/* ---------- 蚀月领主赏金 ----------
   战胜 6/12/18 夜蚀月领主 → 固定金币 + 月契（替代自身掉落物）。
   rationale：赏金随夜数线性增长（金币 +50/档、月契 +1/档），
   与商店补货通胀（幂增长）相比是温和的稳定注入，中期金币水位不至于断供；
   月契 1/2/3 恰好等于一次强化的成本递增梯度，形成「打领主 = 攒一次强化的赌注」。
   [PLACEHOLDER · 验证：观察 12/18 夜后金币是否溢出（应少于一次商店大采购的 30%）] */
const BOSS_REWARDS: Record<number, { gold: number; pacts: number }> = {
  6:  { gold: 50,  pacts: 1 },
  12: { gold: 100, pacts: 2 },
  18: { gold: 150, pacts: 3 },
};

/** 范围溅射：对半径内除目标外的敌人造成比例伤害（暴月之眼 / 破晓溅射共用） */
function aoeSplash(e: EnemyInstance, radius: number, dmg: number, ratio: number, p: Player, itemId: string, killSrc: string): void {
  for (const o of queryRadius(e.x, e.y, radius) as EnemyInstance[]) {
    if (o !== e && !o.dead) {
      const sDmg = dmg * ratio;
      o.hp -= sDmg;
      o.flash = 0.1;
      trackItemDmg(p, itemId, sDmg);
      if (o.hp <= 0) killEnemy(o, killSrc);
    }
  }
}

export function damageEnemy(e: EnemyInstance, dmg: number, isCrit: boolean, srcType?: string, srcW?: string, secret?: boolean): void {
  if (e.hp <= 0) return;
  const p = pSt().player;
  if (!p) return;
  /* 秘宝等非玩家伤害：跳过一切玩家侧修正（暴击 / 增伤 / 吸血 / 溅射 / 护盾生成），
     但仍正常扣血并进入 killEnemy，从而触发击杀类全局机制（金币流星 / 吞噬之月 / 爆裂之核 / 汲魂之镰） */
  const isSecret = secret === true;
  let moonCrit = false;
  if (!isSecret) {
    // fullHpCrit 与 effCrit 加法叠加（与 calcDamage 一致）
    if (p.hp >= p.maxHp && p.fullHpCrit > 0) {
      const totalCrit = Math.min(CRIT_CAP, p.effCrit + p.fullHpCrit);
      if (RNG() < totalCrit) isCrit = true;
    }
    if (p.lowHpDmg > 0 && p.hp <= p.maxHp * LOW_HP_DMG_THRESHOLD) dmg *= (1 + p.lowHpDmg);
    /* 残月·将熄之勇：必爆蓄力，本次伤害必定暴击且暴伤额外 +50% */
    moonCrit = (p.effects.moonCrit ?? 0) > 0;
    if (moonCrit) { p.effects.moonCrit = 0; isCrit = true; }
  }
  if (isCrit) dmg *= p.critDmg * (moonCrit ? MOON_CRIT_BONUS : 1);
  if (!isSecret && p.effects.horde) {
    const hc = Math.min(HORDE_MAX_STACKS, Math.floor(eSt().enemies.length / HORDE_DIVISOR));
    if (hc > 0) dmg *= 1 + p.effects.horde * hc;
  }
  if (!isSecret && isCrit && p.effects.critBoom && srcType !== 'splash') {
    // 暴月之眼：金色光爆（双冲击环 + 星芒 + 金色火花 + 光晕）
    EventBus.emit(EVENTS.VISUAL_RING, { x: e.x, y: e.y, color: PALETTE.gold, life: 0.4, radius: 100, width: 3.2 });
    EventBus.emit(EVENTS.VISUAL_RING, { x: e.x, y: e.y, color: PALETTE.warmWhite, life: 0.3, radius: 58, width: 2 });
    EventBus.emit(EVENTS.VISUAL_STAR, { x: e.x, y: e.y, color: PALETTE.gold, size: 17 });
    EventBus.emit(EVENTS.VISUAL_SPARK, { x: e.x, y: e.y, color: PALETTE.fireBright, count: 12, speed: 190 });
    EventBus.emit(EVENTS.VISUAL_GLOW, { x: e.x, y: e.y, color: PALETTE.gold, size: 24, life: 0.35 });
    aoeSplash(e, CRIT_BOOM_RADIUS, dmg, CRIT_BOOM_RATIO, p, 'critBoom', 'boom');
  }
  if (!isSecret && p.effects.splash && RNG() < p.effects.splash && srcType !== 'splash') {
    // 破晓溅射：金光碎浪（粒子 + 小冲击环 + 白火花）
    EventBus.emit(EVENTS.VISUAL_BURST, { x: e.x, y: e.y, color: PALETTE.fireBright, count: 12 });
    EventBus.emit(EVENTS.VISUAL_RING, { x: e.x, y: e.y, color: PALETTE.fireBright, life: 0.26, radius: 62, width: 1.6 });
    EventBus.emit(EVENTS.VISUAL_SPARK, { x: e.x, y: e.y, color: PALETTE.warmWhite, count: 7, speed: 150 });
    EventBus.emit(EVENTS.VISUAL_SHARD, { x: e.x, y: e.y, color: PALETTE.gold, count: 4, speed: 170 });
    aoeSplash(e, SPLASH_RADIUS, dmg, SPLASH_RATIO, p, 'splash', 'splash');
  }
  dmg = Math.max(MIN_DMG, Math.round(dmg));
  e.hp -= dmg;
  /* 亏凸·回澜之护：造成伤害的 12% 转化为护盾（上限 30，停止输出 6 秒后消散） */
  if (!isSecret && p.effects.moonWane) {
    p.effects.shield = Math.min(MOON_WANE_SHIELD_CAP, (p.effects.shield || 0) + dmg * MOON_WANE_SHIELD_RATE);
    p.effects.moonLastDmgT = p.effects.moonT || 0;
  }
  e.flash = 0.12;
  achievements().onDamage(dmg, isCrit);
  EventBus.emit(EVENTS.COMBAT_HIT, { target: e, damage: dmg, crit: isCrit, srcType, srcW });
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
  if (!isSecret && p.lifesteal > 0) {
    healPlayer(dmg * p.lifesteal);
  }
  EventBus.emit(EVENTS.VISUAL_HIT_FX, { x: e.x, y: e.y, dmg, crit: isCrit });
  if (e.hp <= 0) { killEnemy(e, srcType); EventBus.emit(EVENTS.ENEMY_KILLED, { type: e.type || '', boss: !!e.boss, srcType }); }
}

export function killEnemy(e: EnemyInstance, srcType?: string): void {
  if (e.dead) return;
  e.dead = 1;
  statsState.set('kills', sSt().kills + 1);
  EventBus.emit(EVENTS.AUDIO_SFX, { name: 'kill' });
  const p = pSt().player;
  if (!p) return;
  const type = e.type || '';
  /* 蚀月领主不产生掉落物（xp/gold 光点全部去除），其收益改为固定赏金（见 BOSS_REWARDS）；
     小怪照常掉落，道具触发的额外掉落（吞噬之月/金币流星）仅对小怪生效 */
  if (!e.boss) {
    const gDef = ENEMIES[type] || {};
    const xpAmt = gDef.xp || 1;
    let goldAmt = gDef.gold || 1;
    if (p.effects.goldMeteor && RNG() < p.effects.goldMeteor) { const extraGold = goldAmt; goldAmt *= 2; trackItemExtraGold(p, 'goldMeteor', extraGold); EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: e.x, y: e.y - 20, text: '金币流星', color: PALETTE.goldPale }); }
    spawnDrop(e.x, e.y, 'xp', Math.round(xpAmt));
    spawnDrop(e.x, e.y, 'gold', Math.round(goldAmt * (GOLD_DROP_MIN + RNG() * GOLD_DROP_RANGE)));
    if (p.effects.devour) spawnDrop(e.x, e.y, 'xp', p.effects.devour);
  }
  if (p.effects.hunt) { p.effects.huntTimer = HUNT_TIMER; p.effects.huntStacks = Math.min(HUNT_MAX_STACKS, (p.effects.huntStacks || 0) + 1); }
  if (p.onKillHp > 0) healPlayer(p.onKillHp);
  /* 残月·将熄之勇：每击杀 3 个敌人，下一次攻击必定暴击且暴伤额外 +50% */
  if (p.effects.moonKill) {
    p.effects.moonKillCount = (p.effects.moonKillCount || 0) + 1;
    if (p.effects.moonKillCount >= MOON_KILL_TRIGGER) {
      p.effects.moonKillCount = 0;
      p.effects.moonCrit = 1;
      EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 30, text: '将熄之勇 · 必爆', color: PALETTE.gold });
      EventBus.emit(EVENTS.VISUAL_RING, { x: p.x, y: p.y, color: PALETTE.gold, life: 0.4, radius: 54, width: 1.6 });
    }
  }
  if (p.boom > 0) boomExplosion(e.x, e.y, p);
  if (e.split) {
    for (let i = 0; i < e.split; i++) {
      const mini = spawnEnemy('grub', { hpMul: e.splitHp });
      mini.x = e.x + rand(-14, 14); mini.y = e.y + rand(-14, 14);
      mini.size = 5; mini.spd = 80; mini.dmg = e.dmg * 0.5;
    }
  }
  if ((e.type || '') === 'splitter') {
    EventBus.emit(EVENTS.VISUAL_BURST, { x: e.x, y: e.y, color: PALETTE.rose, count: 14 });
    EventBus.emit(EVENTS.VISUAL_RING, { x: e.x, y: e.y, color: PALETTE.rose, life: 0.3, radius: 70, width: 3 });
    if (dist(p, e) < 70 + p.r) hurtPlayer(e, e.dmg * 0.8);
  }
  EventBus.emit(EVENTS.VISUAL_BURST, { x: e.x, y: e.y, color: e.color || PALETTE.white, count: e.size });
  if (e.boss) {
    const gs = gSt();
    const rs = { ...sSt().runStats, bossKills: sSt().runStats.bossKills + 1 };
    stageState.set('boss', null);
    EventBus.emit(EVENTS.BOSS_KILLED, { type: e.type || '', stage: gs.stage });
    /* 领主赏金：固定金币 + 月契，直接进账（金币走 effGold 倍率，与全局金币经济一致） */
    const reward = BOSS_REWARDS[gs.stage];
    if (reward) {
      addGold(reward.gold);
      addMoonPacts(reward.pacts);
      EventBus.emit(EVENTS.UI_SPAWN_TEXT, {
        x: e.x, y: e.y - 34, color: PALETTE.gold,
        text: `领主赏金 · 金币 +${Math.round(reward.gold * Math.max(0.1, p.effGold))} · 月契 +${reward.pacts}`,
      });
    }
    if (sm.current === STATE.PLAYING) {
      if (gs.stage === CONFIG.FINAL_STAGE) {
        rs.win = true;
        sm.transition(STATE.WIN);
        // 领域层只负责推进状态并广播；落盘由 infra/persistence 订阅处理
        if (gs.depth === gs.unlocked && gs.unlocked < 9) { stageState.set('unlocked', gs.unlocked + 1); EventBus.emit(EVENTS.PROGRESS_UNLOCKED, { depth: gs.unlocked + 1 }); EventBus.emit(EVENTS.AUDIO_SFX, { name: 'unlock' }); }
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
  /* 新月·隐匿：隐匿期间不可被命中 */
  if ((p.effects.cloakTimer ?? 0) > 0) {
    EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 30, text: '隐匿', color: PALETTE.ice });
    return;
  }
  if (RNG() < p.dodge) {
    achievements().onDodge();
    EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 30, text: '闪避', color: PALETTE.ice });
    if (p.effects.cloak) { p.invuln = Math.max(p.invuln, 0.8); p.effects.cloakTimer = 0.8; }
    return;
  }
  let dmg = Math.max(MIN_DMG, rawDmg - p.armor * ARMOR_REDUCTION);
  if ((p.effects.shield ?? 0) > 0) {
    const abs = Math.min(p.effects.shield ?? 0, dmg);
    p.effects.shield = (p.effects.shield ?? 0) - abs;
    achievements().onShieldAbsorb(abs);
    dmg -= abs;
    if (dmg <= 0) { EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 26, text: '护盾', color: PALETTE.ice }); return; }
  }
  if ((p.effects.oath ?? 0) > 0 && p.hp - dmg <= 0) {
    p.effects.oath = (p.effects.oath ?? 0) - 1;
    p.hp = 1;
    dmg = 0;
    p.invuln = Math.max(p.invuln, 1);
    EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 26, text: '守月之约', color: PALETTE.gold });
  }
  if ((p.effects.nearDeath ?? 0) > 0 && p.hp - dmg <= p.maxHp * NEAR_DEATH_THRESHOLD) {
    p.effects.nearDeath = 0;
    p.invuln = Math.max(p.invuln, NEAR_DEATH_INVULN);
    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * NEAR_DEATH_HEAL_RATE);
    EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 40, text: '濒死月魄', color: PALETTE.gold });
    EventBus.emit(EVENTS.VISUAL_RING, { x: p.x, y: p.y, color: PALETTE.gold, life: 0.5, radius: 90, width: 3 });
    EventBus.emit(EVENTS.AUDIO_SFX, { name: 'upgrade' });
    return;
  }
  p.hp -= dmg;
  /* 下弦·月影壁垒：受击生成 5% 最大生命护盾（8 秒 CD） */
  if (p.effects.moonWax && (p.effects.moonHurtCd ?? 0) <= 0) {
    p.effects.moonHurtCd = MOON_WAX_CD;
    p.effects.shield = (p.effects.shield || 0) + Math.round(p.maxHp * MOON_WAX_SHIELD_RATE);
    EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 26, text: '月影壁垒', color: PALETTE.ice });
  }
  p.invuln = HIT_INVULN;
  achievements().onHurt();
  EventBus.emit(EVENTS.AUDIO_SFX, { name: 'hurt' });
  // 攻击者攻击动作特效（近战接触伤害：撕咬/撞击/重拳等）
  const atkType = 'type' in e ? (e.type ?? '') : '';
  const ex = 'x' in e ? e.x : p.x;
  const ey = 'y' in e ? e.y : p.y;
  if (atkType) {
    if (atkType === 'giant') {
      // 巨噬者：重拳砸地（大冲击环 + 尘土）
      EventBus.emit(EVENTS.VISUAL_RING, { x: ex, y: ey, color: '#4a5a72', life: 0.35, radius: 55, width: 3 });
      EventBus.emit(EVENTS.VISUAL_BURST, { x: ex, y: ey, color: PALETTE.slate, count: 10 });
    } else if (atkType === 'charger') {
      // 裂口魔：独角撞击（赤红火花 + 冲击）
      EventBus.emit(EVENTS.VISUAL_SPARK, { x: ex, y: ey, color: PALETTE.blood, count: 6, speed: 180 });
      EventBus.emit(EVENTS.VISUAL_RING, { x: ex, y: ey, color: PALETTE.blood, life: 0.25, radius: 34, width: 2.4 });
    } else if (atkType === 'splitter') {
      // 血疱魔：血疱崩溅
      EventBus.emit(EVENTS.VISUAL_BURST, { x: ex, y: ey, color: PALETTE.rose, count: 8 });
    } else if (atkType === 'bomber') {
      // 自爆魔：贴身爆燃
      EventBus.emit(EVENTS.VISUAL_SPARK, { x: ex, y: ey, color: PALETTE.heavy, count: 8, speed: 200 });
    } else {
      // 撕咬/扑击类（grub/rat/armored/wing/shadow）：口器闪光
      EventBus.emit(EVENTS.VISUAL_SPARK, { x: ex, y: ey, color: PALETTE.peach, count: 5, speed: 160 });
    }
  }
  renderState.set('hitFlash', 0.3);
  shakeScreen(8);
  EventBus.emit(EVENTS.PLAYER_HURT, { damage: dmg, hp: p.hp, maxHp: p.maxHp });
  EventBus.emit(EVENTS.VISUAL_BURST, { x: p.x, y: p.y, color: PALETTE.blood, count: 18 });
  EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 26, text: '-' + Math.round(dmg), color: PALETTE.blood });
  if (p.effects.tideRegen && dmg > 0) p.effects.regenBuff = 2;
  if (p.thorns > 0 && e && 'hp' in e) {
    // 荆棘反伤：血色尖刺迸发
    EventBus.emit(EVENTS.VISUAL_BURST, { x: p.x, y: p.y, color: '#ff5a6a', count: 9 });
    EventBus.emit(EVENTS.VISUAL_RING, { x: p.x, y: p.y, color: PALETTE.blood, life: 0.3, radius: 42, width: 2 });
    EventBus.emit(EVENTS.VISUAL_SPARK, { x: p.x, y: p.y, color: PALETTE.coralBright, count: 8, speed: 210 });
    EventBus.emit(EVENTS.VISUAL_GLOW, { x: p.x, y: p.y, color: PALETTE.blood, size: 16, life: 0.3 });
    damageEnemy(e as EnemyInstance, dmg * p.thorns, false, 'thorns');
  }
  if (p.hp <= 0) { p.hp = 0; EventBus.emit(EVENTS.PLAYER_DIED); playerDeath(); }
}

export function healPlayer(n: number): void {
  const p = pSt().player;
  if (!p || p.hp <= 0) return;
  const before = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + n);
  if (p.hp > before) EventBus.emit(EVENTS.UI_SPAWN_TEXT, { x: p.x, y: p.y - 30, text: '+' + Math.round(p.hp - before), color: PALETTE.jade });
  if (n > 0) EventBus.emit(EVENTS.PLAYER_HEAL, { amount: n, hp: p.hp, maxHp: p.maxHp });
}

/* 近战打击（小怪/Boss 通用）：范围判定 + 震屏 + 特效 */

export function meleeHit(x: number, y: number, r: number, dmg: number, opts?: { mul?: number; shake?: number }): void {
  const p = pSt().player;
  if (!p) return;
  if (dist(p, { x, y }) < r + p.r) {
    hurtPlayer({ x, y, dmg }, dmg * ((opts && opts.mul) || 1));
  }
  EventBus.emit(EVENTS.VISUAL_RING, { x, y, color: PALETTE.blood, life: 0.26, radius: r, width: 3 });
  EventBus.emit(EVENTS.VISUAL_BURST, { x, y, color: PALETTE.blood, count: 8 });
  shakeScreen((opts && opts.shake) || 6);
}

/* 掉落物生成 */

export function spawnDrop(x: number, y: number, kind: string, amount: number): void {
  world.add('drops', {
    ...Position(x, y),
    ...Velocity(rand(-40, 40), rand(-40, 40)),
    kind, amount, t: 0, take: false,
  });
}

/* 爆炸（爆裂之核） */

export function boomExplosion(x: number, y: number, p: Player): void {
  // 爆炸：金色火球 + 双冲击环 + 旋转碎片 + 白炽火花 + 光晕
  EventBus.emit(EVENTS.VISUAL_RING, { x, y, color: PALETTE.ember, life: 0.42, radius: 90 * p.area, width: 3.5 });
  EventBus.emit(EVENTS.VISUAL_RING, { x, y, color: PALETTE.cream, life: 0.28, radius: 50 * p.area, width: 2 });
  EventBus.emit(EVENTS.VISUAL_GLOW, { x, y, color: PALETTE.tangerine, size: 26, life: 0.4 });
  EventBus.emit(EVENTS.VISUAL_BURST, { x, y, color: PALETTE.peach, count: 16 });
  EventBus.emit(EVENTS.VISUAL_SHARD, { x, y, color: PALETTE.heavy, count: 8, speed: 240 });
  EventBus.emit(EVENTS.VISUAL_SPARK, { x, y, color: PALETTE.warmWhite, count: 10, speed: 220 });
  EventBus.emit(EVENTS.VISUAL_STREAK, { x, y, color: PALETTE.peach, ang: 0, len: 34, w: 2.4, life: 0.3 });
  for (const e of queryRadius(x, y, 90 * p.area)) {
    if (e.dead || e.boss) continue;
    damageEnemy(e, p.effAtk * p.boom * (0.7 + RNG() * 0.6), false, 'boom');
  }
}
