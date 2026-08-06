/* =========================================================
   蚀月远征 · 武器：风暴之眼（双核环绕+弹幕射击）
   ========================================================= */
import { PALETTE } from '../../assets/palette.js';
import { RNG, rand, TAU, HALF_PI } from '../../engine/util/utils.js';
import { WEAPONS } from '../../config/index.js';
import { world } from '../../engine/ecs/World.js';
import { addFx, spawnGlow } from '../../platform/fx/fx.js';
import { weaponDmg } from '../erosion.js';
import { AudioEngine } from '../../platform/audio/engine.js';

import { pSt, gSt } from '../../state/accessors.js';

export function stormTick(dt: number): void {
  const p = pSt().player;
  if (!p) return;
  const stormW = p.weapons.find(w => w.id === 'storm');
  p.effects.stormCores = p.effects.stormCores || [];
  if (stormW) {
    const def = WEAPONS.storm as any;
    const CORES = def.cores || 2;
    const tick = (def.tick || 0.28) * (1 - p.cdr);
    const orbitR = (def.radius || 115) * p.area;
    const angularSpd = def.angularSpd || 3.0;
    const projSpeed = def.speed || 390;
    const range = def.range || projSpeed * 1.3;
    const projLife = range / projSpeed;
    const projR = def.projRadius || 5;
    const color = def.color || PALETTE.swift;
    const projPerShot = (def.proj || 1) + Math.floor(stormW.lv / 3) + Math.floor((p.projCount || 0) / 3);
    const dmgPerProj = weaponDmg(stormW, p);

    p.effects.stormCores = [];
    p.effects.stormFireT = p.effects.stormFireT || {};

    for (let i = 0; i < CORES; i++) {
      const a = (i / CORES) * TAU + gSt().time * angularSpd;
      const ox = p.x + Math.cos(a) * orbitR;
      const oy = p.y + Math.sin(a) * orbitR;

      p.effects.stormCores.push({ x: ox, y: oy, a });

      // 每个核心独立的开火计时
      const fk = `c${i}`;
      p.effects.stormFireT[fk] = (p.effects.stormFireT[fk] ?? 0) - dt;

      if (p.effects.stormFireT[fk] <= 0) {
        p.effects.stormFireT[fk] = tick;
        // 朝切线方向（前进方向）发射
        const fireA = a + HALF_PI;

        for (let j = 0; j < projPerShot; j++) {
          const spread = (j - (projPerShot - 1) / 2) * (def.spread || 0.16);
          const ang = fireA + spread;
          world.add('projectiles', {
            x: ox, y: oy,
            vx: Math.cos(ang) * projSpeed, vy: Math.sin(ang) * projSpeed,
            r: projR, dmg: dmgPerProj, pierce: p.pierce + (def.pierce || 0),
            color, hit: new Set(), wId: 'storm',
            life: projLife, speed: projSpeed, range: range,
          });
        }

        AudioEngine.playSfx('w_storm');

        // 发射光效
        spawnGlow(ox + Math.cos(fireA) * 14, oy + Math.sin(fireA) * 14, 8, color, 0.25);
        for (let k = 0; k < 3; k++) {
          addFx({
            x: ox + Math.cos(fireA) * 8, y: oy + Math.sin(fireA) * 8,
            vx: Math.cos(fireA) * rand(20, 60) + rand(-30, 30),
            vy: Math.sin(fireA) * rand(20, 60) + rand(-30, 30),
            life: 0.28, max: 0.28, size: 2.2, color,
          });
        }
      }

      // 持续轨迹粒子（旋风拖尾）
      if (RNG() < 0.25) {
        addFx({
          x: ox + rand(-5, 5), y: oy + rand(-5, 5),
          vx: rand(-14, 14), vy: rand(-14, 14),
          life: 0.38, max: 0.38, size: rand(1.5, 3), color,
        });
      }
    }
  } else {
    // 武器被出售/移除后清空残留核心位置，避免风暴核心残留在场上
    p.effects.stormCores = [];
  }
}
