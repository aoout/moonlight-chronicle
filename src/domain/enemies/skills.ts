/* =========================================================
   蚀月远征 · 小怪专属技能（特性化进攻）
   ========================================================= */
import { PALETTE } from '../../assets/palette.js';
import { RNG, angTo, dist } from '../../engine/util/utils.js';
import { PROJECTILE_POOL } from '../../engine/ecs/entity_pool.js';
import { spawnBurst } from '../../platform/fx/fx.js';
import { meleeHit, hurtPlayer } from '../combat.js';

import { eSt } from '../../state/accessors.js';

export const ENEMY_SKILLS: Record<string, (e: any, dt: number, p: any) => boolean | void> = {
  /* 蚀蛆：近身喷吐腐蚀酸液，命中减速 */
  grub(e: any, dt: number, p: any) {
    if (dist(e, p) < 95) {
      e.skillT = (e.skillT || 0) - dt;
      if (e.skillT <= 0) {
        e.skillT = 2.6;
        e.flash = 0.4;
        const a = angTo(e, p);
        for (let i = -1; i <= 1; i++) {
          const ang = a + i * 0.3;
          const _prj = { acid: true, x: e.x, y: e.y, vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230, r: 6, dmg: e.dmg * 0.9, color: PALETTE.green, hit: new Set(), enemy: true, life: 1.8, wId: 'enemy' };
          eSt().projectiles.push(PROJECTILE_POOL.addWith(_prj));
        }
        return true;
      }
    }
    return false;
  },
  /* 噬光鼠：撕咬扑击（前摇→快速突进撕咬） */
  rat(e: any, dt: number, p: any) {
    if (dist(e, p) < 75) {
      e.skillT = (e.skillT || 0) - dt;
      if (e.skillT <= 0) { e.skillT = 2.2; e.skillP = 0.28; e.skillA = angTo(e, p); }
      if (e.skillP > 0) {
        e.skillP -= dt;
        e.flash = 0.6;
        if (e.skillP <= 0) {
          const sp = e.spd * 3.4;
          e.x += Math.cos(e.skillA) * sp * 0.24; e.y += Math.sin(e.skillA) * sp * 0.24;
          meleeHit(e.x, e.y, 34, e.dmg * 1.5, { shake: 4 });
          return true;
        }
        return true;
      }
    }
    return false;
  },
  /* 蚀甲兽：重踏震击（前摇→范围震地） */
  armored(e: any, dt: number, p: any) {
    if (dist(e, p) < 80) {
      e.skillT = (e.skillT || 0) - dt;
      if (e.skillT <= 0) { e.skillT = 2.8; e.skillP = 0.5; }
      if (e.skillP > 0) {
        e.skillP -= dt;
        e.flash = 0.5;
        if (e.skillP <= 0) {
          meleeHit(e.x, e.y, 92, e.dmg * 1.9, { shake: 11 });
          return true;
        }
        return true;
      }
    }
    return false;
  },
  /* 噬光翼：升空俯冲抓击 + 飞行羽毛弹 */
  wing(e: any, dt: number, p: any) {
    e.skillB = (e.skillB || 0) - dt;
    if (e.skillB <= 0) {
      e.skillB = 1.7;
      const a = angTo(e, p);
      eSt().projectiles.push(PROJECTILE_POOL.addWith({ x: e.x, y: e.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 5, dmg: e.dmg * 0.8, color: '#c9a0e8', hit: new Set(), enemy: true, life: 1.6, wId: 'enemy' }));
    }
    e.skillT = (e.skillT || 0) - dt;
    if (e.skillT <= 0 && dist(e, p) < 340) {
      e.skillT = 3.4;
      e.skillP = 0.55;
      e.skillA = angTo(e, p);
    }
    if (e.skillP > 0) {
      e.skillP -= dt;
      if (e.skillP <= 0.25) {
        const sp = e.spd * 4;
        e.x += Math.cos(e.skillA) * sp * dt * 0.8;
        e.y += Math.sin(e.skillA) * sp * dt * 0.8;
      }
      if (e.skillP <= 0) { meleeHit(e.x, e.y, 40, e.dmg * 1.6, { shake: 6 }); }
      return true;
    }
    return false;
  },
  /* 影行者：影雾闪现突袭 + 撕裂流血 */
  shadow(e: any, dt: number, p: any) {
    e.skillT = (e.skillT || 0) - dt;
    if (e.skillT <= 0 && dist(e, p) > 60 && dist(e, p) < 300) {
      e.skillT = 3.8;
      spawnBurst(e.x, e.y, PALETTE.violetDark, 12);
      const side = RNG() < 0.5 ? 1 : -1;
      const a = angTo(e, p) + side * 1.2;
      e.x = p.x + Math.cos(a) * 70;
      e.y = p.y + Math.sin(a) * 70;
      spawnBurst(e.x, e.y, PALETTE.violetDark, 12);
      if (dist(e, p) < 78) {
        hurtPlayer(e, e.dmg * 1.2);
        e.bleed = 3;
      }
      return true;
    }
    return false;
  },
  /* 巨噬者：巨拳砸击（前摇→大范围重锤） */
  giant(e: any, dt: number, p: any) {
    if (dist(e, p) < 100) {
      e.skillT = (e.skillT || 0) - dt;
      if (e.skillT <= 0) { e.skillT = 3.2; e.skillP = 0.7; e.skillA = angTo(e, p); }
      if (e.skillP > 0) {
        e.skillP -= dt;
        e.flash = 0.6;
        if (e.skillP <= 0) {
          e.x += Math.cos(e.skillA) * 30; e.y += Math.sin(e.skillA) * 30;
          meleeHit(e.x, e.y, 140, e.dmg * 2.2, { shake: 14 });
          return true;
        }
        return true;
      }
    }
    return false;
  },
};
