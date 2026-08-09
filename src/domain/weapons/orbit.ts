/* =========================================================
   蚀月远征 · 武器：环舞之刃（环绕武器实体）
   ========================================================= */
import { RNG, dist, angTo, rand, TAU } from '../../engine/util/utils.js';
import { PALETTE } from '../../assets/palette.js';
import { WEAPONS } from '../../config/index.js';
import { neighborEnemies } from '../../engine/spatial/SpatialSystem.js';
import { damageEnemy } from '../combat.js';
import { weaponDmg } from '../erosion.js';
import { AudioEngine } from '../../platform/audio/engine.js';
import { addFx, spawnSpark, spawnGlow, spawnShard } from '../../platform/fx/fx.js';

import { pSt, gSt } from '../../state/accessors.js';

/**
 * 环舞之刃单次命中伤害系数。
 *
 * 修复前：damageEnemy(weaponDmg × dt × 8) —— 伤害直接乘帧时间 dt，
 * 导致帧率相关 bug：60fps 单次命中 = weaponDmg × 8/60 ≈ 0.133×weaponDmg，
 * 144fps 仅 ≈ 0.056×weaponDmg，高刷屏玩家伤害缩水一半以上。
 *
 * 修复后：命中节流窗口（0.25s，按游戏时间结算）不变，单次伤害固定为
 * weaponDmg × (8/60)，任意帧率下每秒总伤害一致（≈0.53×weaponDmg/s，
 * 与修复前 60fps 基准行为持平，不改平衡）。
 */
const ORBIT_HIT_DMG = 8 / 60;

export function orbitTick(): void {
  const p = pSt().player;
  if (!p) return;
  const orbitW = p.weapons.find(w => w.id === 'orbit');
  p.effects.orbits = p.effects.orbits || [];
  if (orbitW) {
    const def = WEAPONS.orbit as any;
    const n = (def.blades ?? 2) + orbitW.lv;
    const angularSpd = def.angularSpd ?? 1.6;
    const orbitR = (def.radius ?? 120) * p.area;
    p.effects.orbits = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + gSt().time * angularSpd;
      const ox = p.x + Math.cos(a) * orbitR;
      const oy = p.y + Math.sin(a) * orbitR;
      p.effects.orbits.push({ x: ox, y: oy, a });
      if (RNG() < 0.14) addFx({ x: ox, y: oy, vx: rand(-15, 15), vy: rand(-15, 15), life: 0.3, max: 0.3, size: 2.2, color: PALETTE.gold });
      p.effects.orbitHits = p.effects.orbitHits || {};
      const orbitCandidates = neighborEnemies(ox, oy, 80);
      for (const e of orbitCandidates) {
        if (e.dead) continue;
        if (dist({ x: ox, y: oy }, e) < 20 + e.size * 0.6) {
          if (e._orbitT === undefined || e._orbitT < gSt().time - 0.25) {
            e._orbitT = gSt().time;
            damageEnemy(e, weaponDmg(orbitW, p) * ORBIT_HIT_DMG, RNG() < p.effCrit, 'orbit', 'orbit');
            AudioEngine.playSfx('hit');
            spawnSpark(e.x, e.y, PALETTE.gold, 3, 130);
            spawnGlow(e.x, e.y, 10, PALETTE.gold, 0.3);
            if (RNG() < 0.3) spawnShard(e.x, e.y, PALETTE.goldDeep, 3, 140);
          }
        }
      }
    }
  } else {
    // 武器被出售/移除后清空残留环绕位置，避免月牙残留在场上
    p.effects.orbits = [];
  }
}
