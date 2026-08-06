/* =========================================================
   蚀月远征 · ECS System：玩家逻辑（生命周期壳）
   诅咒 / 道具光环 / 时停 / 移动 / 回血 / 武器开火
   效果更新已委托给 domain/effects.ts 注册表
   ========================================================= */
import { System } from '../engine/core/system.js';
import { playerState } from '../state/player.js';
import { inputState } from '../state/input.js';
import { renderState } from '../state/render.js';
import { gameState } from '../state/flow.js';
import { RNG, rand, clamp } from '../engine/util/utils.js';
import { PALETTE } from '../assets/palette.js';
import { CONFIG } from '../config/index.js';
import { addFx } from '../platform/fx/fx.js';
import { updateEffects } from '../domain/effects.js';
import { weaponFire } from '../domain/weapons/index.js';
import { isFixedLoad } from '../engine/env.js';

import { pSt, iSt, rSt, gmSt } from '../state/accessors.js';

export class PlayerSystem extends System {
  name = 'PlayerSystem';

  update(dt: number): void {
    const p = pSt().player;
    if (!p) return;
    this._updateTimeStop(dt);
    this._updateHitEffects(dt);
    updateEffects(p, dt);      // ← 委托给 Effect 注册表
    this._updateMovement(dt);
    this._updateRegen(dt);
    this._updateWeapons(dt);
  }

  /** 时停逻辑 */
  private _updateTimeStop(dt: number): void {
    const p = pSt().player;
    if (!p) return;

    gameState.set('_timeScale', 1);
    if (p.timeStop > 0) {
      // 首次进入时停时初始化计时器（初始值为 0），防止 0 - dt 立即触发特效
      if (rSt().timestopTimer === 0) renderState.set('timestopTimer', 12);
      renderState.set('timestopTimer', rSt().timestopTimer - dt);
      if (rSt().timestopTimer <= 0) {
        renderState.set('timestopTimer', 12);
        addFx({ timestop: true, t: 0, max: 1.0 });
        p.effects.tsActive = 1.0;
      }
      if ((p.effects.tsActive ?? 0) > 0) { p.effects.tsActive = (p.effects.tsActive ?? 0) - dt; gameState.set('_timeScale', 0.15); }
    }
  }

  /** 闪白 / 震屏 / 无敌衰减 */
  private _updateHitEffects(dt: number): void {
    if (rSt().hitFlash > 0) renderState.set('hitFlash', rSt().hitFlash - dt);
    if (rSt().shake > 0) renderState.set('shake', rSt().shake * CONFIG.MIRROR_DECAY);
    const p = pSt().player;
    if (p && p.invuln > 0) p.invuln -= dt;
  }

  /** WASD / 手柄摇杆移动、朝向、速度修正 */
  private _updateMovement(dt: number): void {
    const p = pSt().player;
    if (!p) return;

    let mx = 0, my = 0;
    const keys = iSt().keys;
    if (keys['w'] || keys['arrowup']) my -= 1;
    if (keys['s'] || keys['arrowdown']) my += 1;
    if (keys['a'] || keys['arrowleft']) mx -= 1;
    if (keys['d'] || keys['arrowright']) mx += 1;
    // 手柄摇杆 / D-Pad / 虚拟摇杆合成向量（已含死区，单位向量或 0）
    const gp = iSt().gamepad;
    if ((gp.connected || gp.touchActive) && (gp.moveX !== 0 || gp.moveY !== 0)) {
      mx = gp.moveX;
      my = gp.moveY;
    }
    const len = Math.hypot(mx, my);
    if (len > 0) {
      p.facing = Math.atan2(my, mx);
      const moveSpd = (p.effects.curseTimer ?? 0) > 0
        ? p.effSpeed * 0.55
        : ((p.effects.cloakTimer ?? 0) > 0 ? p.effSpeed * 1.3 : p.effSpeed);
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
  }

  /** 被动生命恢复 */
  private _updateRegen(dt: number): void {
    const p = pSt().player;
    if (!p) return;
    p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
  }

  /** 武器冷却与开火 */
  private _updateWeapons(dt: number): void {
    const p = pSt().player;
    if (!p) return;
    if (isFixedLoad()) return;

    const wcd = pSt().weaponCd;
    const wcdFull = pSt().weaponCdFull;
    for (const w of p.weapons) {
      wcd[w.id] = (wcd[w.id] || 0) - dt;
      if (wcd[w.id] <= 0) {
        const cd = weaponFire(w);
        const huntBonus = (p.effects.huntTimer ?? 0) > 0 ? (p.effects.huntStacks || 0) * (p.effects.hunt || 0) : 0;
        wcd[w.id] = cd / p.effAtkSpd / (1 + huntBonus);
        wcdFull[w.id] = wcd[w.id];
      }
    }
  }
}
