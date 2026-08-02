// @ts-check
/* =========================================================
   蚀月远征 · ECS System：玩家逻辑
   诅咒 / 道具光环 / 时停 / 移动 / 回血 / 武器开火
   ========================================================= */
import { System } from '../core/system.js';
import { G, STATE, sm } from '../state.js';
import { EventBus } from '../core/event_bus.js';
import { RNG, rand, clamp, dist } from '../utils.js';
import { PALETTE } from '../palette.js';
import { CONFIG, BASE_STATS } from '../data/index.js';
import { addFx, spawnRing } from '../fx.js';
import { PROJECTILE_POOL } from '../entity_pool.js';
import { weaponFire, nearestEnemy } from '../weapons/index.js';
import { codexAdd } from '../codex.js';

export class PlayerSystem extends System {
  name = 'PlayerSystem';

  /** @param {number} dt */
  update(dt) {
    const p = G.player;
    if (!p) return;

    /* ===== 诅咒 & 道具光环 ===== */
    if (p._curseT > 0) p._curseT -= dt;
    if (p._shieldMax && p._shield <= 0) {
      p._shieldT = (p._shieldT || 5) - dt;
      if (p._shieldT <= 0) {
        p._shield = p._shieldMax;
        p._shieldT = 5;
        spawnRing(p.x, p.y, '#9fd6e8', 0.4, 40, 2);
      }
    }
    if (p._frostAura) {
      for (const e of G.enemies) {
        if (!e.dead) e.auraSlow = dist(e, p) < p._frostAura ? 0.2 : 0;
      }
    }
    if (G._echoSlowT > 0) G._echoSlowT -= dt;
    if (p._echoSlow) {
      p._echoT = (p._echoT === undefined ? 20 : p._echoT) - dt;
      if (p._echoT <= 0) {
        p._echoT = 20; G._echoSlowT = 1;
        spawnRing(p.x, p.y, '#9fd6e8', 0.5, 420, 2);
      }
    }
    if (p._starfall) {
      p._starT = (p._starT || 12) - dt;
      if (p._starT <= 0) {
        p._starT = 12;
        const t = nearestEnemy(p.x, p.y, 600);
        if (t) {
          G.projectiles.push(PROJECTILE_POOL.addWith({
            meteor: true, x: t.x + rand(-40, 40), y: t.y + rand(-40, 40),
            t: 0, delay: 0.45, dmg: p.effAtk, aoe: 90, color: '#ffe9a8', r: 12, wId: 'starfall',
          }));
        }
      }
    }
    if (p._regenBuff > 0) {
      p._regenBuff -= dt;
      p.hp = Math.min(p.maxHp, p.hp + 3 * dt);
    }
    if (p._huntT > 0) { p._huntT -= dt; if (p._huntT <= 0) p._huntStacks = 0; }
    if (p._cloakT > 0) p._cloakT -= dt;

    /* ===== 时停 ===== */
    G._timeScale = 1;
    if (p.timeStop > 0) {
      G.timestopTimer -= dt;
      if (G.timestopTimer <= 0) {
        G.timestopTimer = 12;
        addFx({ timestop: true, t: 0, max: 1.0 });
        p.tsActive = 1.0;
      }
      if (p.tsActive > 0) { p.tsActive -= dt; G._timeScale = 0.15; }
    }

    /* ===== 闪白 / 震屏 / 无敌衰减 ===== */
    if (G.hitFlash > 0) G.hitFlash -= dt;
    if (G.shake > 0) G.shake *= CONFIG.MIRROR_DECAY;
    if (p.invuln > 0) p.invuln -= dt;

    /* ===== 移动 ===== */
    let mx = 0, my = 0;
    if (G.keys['w'] || G.keys['arrowup']) my -= 1;
    if (G.keys['s'] || G.keys['arrowdown']) my += 1;
    if (G.keys['a'] || G.keys['arrowleft']) mx -= 1;
    if (G.keys['d'] || G.keys['arrowright']) mx += 1;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      p.facing = Math.atan2(my, mx);
      const moveSpd = p._curseT > 0
        ? p.effSpeed * 0.55
        : (p._cloakT > 0 ? p.effSpeed * 1.3 : p.effSpeed);
      p.vx = (mx / len) * moveSpd;
      p.vy = (my / len) * moveSpd;
      p.x += (mx / len) * moveSpd * dt;
      p.y += (my / len) * moveSpd * dt;
      if (RNG() < 0.16) {
        addFx({
          x: p.x + rand(-3, 3), y: p.y + rand(-3, 3),
          vx: rand(-10, 10), vy: rand(-10, 10),
          life: 0.22, max: 0.22, size: 2.6, color: PALETTE.goldPale,
        });
      }
    } else {
      p.vx = 0; p.vy = 0;
    }
    p.x = clamp(p.x, 18, G.width - 18);
    p.y = clamp(p.y, 18, G.height - 18);

    /* ===== 生命恢复 ===== */
    p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    /* ===== 武器冷却与开火 ===== */
    for (const w of p.weapons) {
      G.weaponCd[w.id] = (G.weaponCd[w.id] || 0) - dt;
      if (G.weaponCd[w.id] <= 0) {
        const cd = weaponFire(w);
        const huntBonus = p._huntT > 0 ? (p._huntStacks || 0) * (p._hunt || 0) : 0;
        G.weaponCd[w.id] = cd / p.effAtkSpd / (1 + huntBonus);
        G.weaponCdFull[w.id] = G.weaponCd[w.id];
      }
    }
  }

  /* =============================================================
     静态方法：玩家管理（从 player_fn.js 迁移）
     ============================================================= */

  /** 派生属性：转模系统在这里生效 */
  /** @param {import('../types/core.d.ts').Player} p */
  static computeDerived(p) {
    p.effAtk   = p.atk + p.armor * p.armorToAtk + p.maxHp * p.hpToAtk
               + p.critRate * p.critToAtk + p.level * p.scaleLevel
               + (G.stage - 1) * p.scaleStage;
    p.effCrit  = Math.min(0.9, p.critRate + p.speed * p.speedToCrit / 100);
    p.effSpeed = p.speed + p.atk * p.atkToSpd;
    p.effGold  = p.goldGain + (p.luck - 1) * p.luckToGold;
    p.effAtkSpd = p.atkSpd * (1 + p.critRate * 0.3);
    return p;
  }

  /** 创建玩家 */
  static createPlayer() {
    /** @type {any} */
    const p = { ...BASE_STATS };
    p.x = G.width / 2; p.y = G.height / 2;
    p.r = 16; p.facing = 0; p.invuln = 0; p.level = 1;
    p.weapons = [];
    p.animT = RNG() * 10;
    return p;
  }

  /** @param {number} level */
  static xpNeeded(level) {
    return Math.round(CONFIG.XP_PER_LEVEL * Math.pow(CONFIG.XP_GROWTH, level - 1));
  }

  /** @param {string} id */
  static addWeapon(id) {
    const p = G.player;
    if (!p) return false;
    if (p.weapons.length >= CONFIG.MAX_WEAPONS) return false;
    if (p.weapons.find(w => w.id === id)) return false;
    p.weapons.push({ id, lv: 1 });
    G.weaponCd[id] = 0;
    codexAdd('weapons', id);
    return true;
  }

  /** @param {string} id */
  static upgradeWeapon(id) {
    const p = G.player;
    if (!p) return false;
    const w = p.weapons.find(x => x.id === id);
    if (!w || w.lv >= 10) return false;
    w.lv++;
    return true;
  }

  /** 移除武器 */
  /** @param {string} id */
  static removeWeapon(id) {
    const p = G.player;
    if (!p) return false;
    const i = p.weapons.findIndex(x => x.id === id);
    if (i < 0) return false;
    p.weapons.splice(i, 1);
    delete G.weaponCd[id];
    delete G.weaponCdFull[id];
    return true;
  }

  /** @param {number} n */
  static addGold(n) {
    const p = G.player;
    if (!p) return;
    G.gold += Math.round(n * Math.max(0.1, p.effGold));
  }

  /** 获得经验 */
  /** @param {number} n */
  static gainXp(n) {
    const p = G.player;
    if (!p) return;
    const amt = n * p.xpGain;
    G.xp += amt;
    while (G.xp >= G.xpNeeded) {
      G.xp -= G.xpNeeded;
      G.xpNeeded = PlayerSystem.xpNeeded(p.level + 1);
      p.level++;
      G.levelQueue++;
    }
    if (G.levelQueue > 0) { G._resumeState = sm.current; sm.transition(STATE.LEVELUP); G.levelUpOpen = false; EventBus.emit('player:levelup', { level: p.level, queue: G.levelQueue }); }
  }
}