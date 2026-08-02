/* =========================================================
   蚀月远征 · ECS System：玩家逻辑
   诅咒 / 道具光环 / 时停 / 移动 / 回血 / 武器开火
   ========================================================= */
import { System } from '../core/system.js';
import { G, STATE, sm } from '../state.js';
import { playerState } from '../state/player.js';
import { statsState } from '../state/stats.js';
import { inputState } from '../state/input.js';
import { renderState } from '../state/render.js';
import { stageState } from '../state/stage.js';
import { entityState } from '../state/entities.js';
import { EventBus } from '../core/event_bus.js';
import { RNG, rand, clamp, dist } from '../utils.js';
import { PALETTE } from '../data/palette.js';
import { CONFIG, BASE_STATS } from '../data/index.js';
import { addFx, spawnRing } from '../render/effects/fx.js';
import { world } from '../ecs/World.js';
import { weaponFire, nearestEnemy } from '../weapons/index.js';
import { codexAdd } from '../persistence/codex.js';
import type { Player } from '../types/core.d.ts';

/** 便捷引用 */
const pSt = () => playerState.state;
const sSt = () => statsState.state;
const iSt = () => inputState.state;
const rSt = () => renderState.state;
const eSt = () => entityState.state;
const gSt = () => stageState.state;

export class PlayerSystem extends System {
  name = 'PlayerSystem';

  update(dt: number): void {
    const p = G.player;
    if (!p) return;

    /* ===== 诅咒 & 道具光环 ===== */
    if ((p._curseT ?? 0) > 0) p._curseT = (p._curseT ?? 0) - dt;
    if (p._shieldMax && (p._shield ?? 0) <= 0) {
      p._shieldT = (p._shieldT || 5) - dt;
      if (p._shieldT <= 0) {
        p._shield = p._shieldMax;
        p._shieldT = 5;
        spawnRing(p.x, p.y, '#9fd6e8', 0.4, 40, 2);
      }
    }
    if (p._frostAura) {
      for (const e of eSt().enemies) {
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
          world.add('projectiles', {
            meteor: true, x: t.x + rand(-40, 40), y: t.y + rand(-40, 40),
            t: 0, delay: 0.45, dmg: p.effAtk, aoe: 90, color: '#ffe9a8', r: 12, wId: 'starfall',
          });
        }
      }
    }
    if ((p._regenBuff ?? 0) > 0) {
      p._regenBuff = (p._regenBuff ?? 0) - dt;
      p.hp = Math.min(p.maxHp, p.hp + 3 * dt);
    }
    if ((p._huntT ?? 0) > 0) { p._huntT = (p._huntT ?? 0) - dt; if ((p._huntT ?? 0) <= 0) p._huntStacks = 0; }
    if ((p._cloakT ?? 0) > 0) p._cloakT = (p._cloakT ?? 0) - dt;

    /* ===== 时停 ===== */
    G._timeScale = 1;
    if (p.timeStop > 0) {
      rSt().timestopTimer -= dt;
      if (rSt().timestopTimer <= 0) {
        renderState.set('timestopTimer', 12);
        addFx({ timestop: true, t: 0, max: 1.0 });
        p.tsActive = 1.0;
      }
      if ((p.tsActive ?? 0) > 0) { p.tsActive = (p.tsActive ?? 0) - dt; G._timeScale = 0.15; }
    }

    /* ===== 闪白 / 震屏 / 无敌衰减 ===== */
    if (rSt().hitFlash > 0) renderState.set('hitFlash', rSt().hitFlash - dt);
    if (rSt().shake > 0) renderState.set('shake', rSt().shake * CONFIG.MIRROR_DECAY);
    if (p.invuln > 0) p.invuln -= dt;

    /* ===== 移动 ===== */
    let mx = 0, my = 0;
    const keys = iSt().keys;
    if (keys['w'] || keys['arrowup']) my -= 1;
    if (keys['s'] || keys['arrowdown']) my += 1;
    if (keys['a'] || keys['arrowleft']) mx -= 1;
    if (keys['d'] || keys['arrowright']) mx += 1;
    const len = Math.hypot(mx, my);
    if (len > 0) {
      p.facing = Math.atan2(my, mx);
      const moveSpd = (p._curseT ?? 0) > 0
        ? p.effSpeed * 0.55
        : ((p._cloakT ?? 0) > 0 ? p.effSpeed * 1.3 : p.effSpeed);
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
    p.x = clamp(p.x, 18, rSt().width - 18);
    p.y = clamp(p.y, 18, rSt().height - 18);

    /* ===== 生命恢复 ===== */
    p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    /* ===== 武器冷却与开火 ===== */
    const wcd = pSt().weaponCd;
    const wcdFull = pSt().weaponCdFull;
    for (const w of p.weapons) {
      wcd[w.id] = (wcd[w.id] || 0) - dt;
      if (wcd[w.id] <= 0) {
        const cd = weaponFire(w);
        const huntBonus = (p._huntT ?? 0) > 0 ? (p._huntStacks || 0) * (p._hunt || 0) : 0;
        wcd[w.id] = cd / p.effAtkSpd / (1 + huntBonus);
        wcdFull[w.id] = wcd[w.id];
      }
    }
  }

  /* =============================================================
     静态方法：玩家管理（从 player_fn.js 迁移）
     ============================================================= */

  /** 派生属性：转模系统在这里生效 */
  static computeDerived(p: Player): Player {
    p.effAtk   = p.atk + p.armor * p.armorToAtk + p.maxHp * p.hpToAtk
               + p.critRate * p.critToAtk + p.level * p.scaleLevel
               + (gSt().stage - 1) * p.scaleStage;
    p.effCrit  = Math.min(0.9, p.critRate + p.speed * p.speedToCrit / 100);
    p.effSpeed = p.speed + p.atk * p.atkToSpd;
    p.effGold  = p.goldGain + (p.luck - 1) * p.luckToGold;
    p.effAtkSpd = p.atkSpd * (1 + p.critRate * 0.3);
    return p;
  }

  /** 创建玩家 */
  static createPlayer(): any {
    const p: any = { ...BASE_STATS };
    p.x = rSt().width / 2; p.y = rSt().height / 2;
    p.r = 16; p.facing = 0; p.invuln = 0; p.level = 1;
    p.weapons = [];
    p.animT = RNG() * 10;
    return p;
  }

  static xpNeeded(level: number): number {
    return Math.round(CONFIG.XP_PER_LEVEL * Math.pow(CONFIG.XP_GROWTH, level - 1));
  }

  static addWeapon(id: string): boolean {
    const p = G.player;
    if (!p) return false;
    if (p.weapons.length >= CONFIG.MAX_WEAPONS) return false;
    if (p.weapons.find(w => w.id === id)) return false;
    p.weapons.push({ id, lv: 1 });
    pSt().weaponCd[id] = 0;
    codexAdd('weapons', id);
    return true;
  }

  static upgradeWeapon(id: string): boolean {
    const p = G.player;
    if (!p) return false;
    const w = p.weapons.find(x => x.id === id);
    if (!w || w.lv >= 10) return false;
    w.lv++;
    return true;
  }

  /** 移除武器 */
  static removeWeapon(id: string): boolean {
    const p = G.player;
    if (!p) return false;
    const i = p.weapons.findIndex(x => x.id === id);
    if (i < 0) return false;
    p.weapons.splice(i, 1);
    delete pSt().weaponCd[id];
    delete pSt().weaponCdFull[id];
    return true;
  }

  static addGold(n: number): void {
    const p = G.player;
    if (!p) return;
    const st = sSt();
    st.gold += Math.round(n * Math.max(0.1, p.effGold));
  }

  /** 获得经验 */
  static gainXp(n: number): void {
    const p = G.player;
    if (!p) return;
    const amt = n * p.xpGain;
    const st = sSt();
    st.xp += amt;
    while (st.xp >= st.xpNeeded) {
      st.xp -= st.xpNeeded;
      st.xpNeeded = PlayerSystem.xpNeeded(p.level + 1);
      p.level++;
      st.levelQueue++;
    }
    if (st.levelQueue > 0) { G._resumeState = sm.current; sm.transition(STATE.LEVELUP); G.levelUpOpen = false; EventBus.emit('player:levelup', { level: p.level, queue: st.levelQueue }); }
  }
}
