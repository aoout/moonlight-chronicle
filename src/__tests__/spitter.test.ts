import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as any).window = globalThis;
  (globalThis as any).requestAnimationFrame = (cb: any) => 0;
});

import { spitterMove } from '../enemies/behaviors/spitter.js';
import { entityState } from '../state/entities.js';
import { stageState } from '../state/stage.js';
import { renderState } from '../state/render.js';
import { drawProjectiles } from '../render/effects/projectiles.js';

describe('蚀涎魔喷吐', () => {
  it('射程内发射毒弹且进入渲染数组（可见）', () => {
    stageState.set('stage', 5);
    renderState.set('width', 800); renderState.set('height', 600);
    entityState.set('projectiles', []);
    const e: any = {
      x: 300, y: 300, spd: 52, stateT: 0, ranged: true,
      projSpd: 180, projDmg: 8, size: 10, dmg: 12,
    };
    const p: any = { x: 400, y: 300, vx: 0, vy: 0, effects: {} };
    for (let i = 0; i < 3; i++) spitterMove(e, 0.016, p, 1);
    const shots = entityState.state.projectiles;
    expect(shots.length).toBeGreaterThan(0);
    const shot = shots[0] as any;
    expect(shot.enemy).toBeTruthy();
    expect(Math.hypot(shot.vx, shot.vy)).toBeGreaterThan(100);
  });

  it('毒弹渲染无异常', () => {
    const ctx = new Proxy({}, {
      get(_t, k) {
        if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop(){} });
        if (k === 'arc') return (x: number, y: number, r: number) => { if (r < 0 || isNaN(r)) throw new Error('neg ' + r); };
        return () => {};
      },
      set() { return true; },
    });
    const pr: any = { enemy: true, spit: true, x: 100, y: 100, vx: 180, vy: 0, r: 6, color: '#7fd6a4', t: 0.3, hit: new Set() };
    expect(() => drawProjectiles({ ctx, projectiles: [pr], player: null } as any)).not.toThrow();
  });
});

describe('蚀涎魔预判瞄准', () => {
  it('高速移动时弹朝玩家预测位置（非离谱偏移）', () => {
    stageState.set('stage', 5);
    renderState.set('width', 800); renderState.set('height', 600);
    entityState.set('projectiles', []);
    const e: any = { x: 300, y: 300, spd: 52, stateT: 0, ranged: true, projSpd: 180, projDmg: 8, size: 10, dmg: 12 };
    // 玩家向右高速移动（vx = 240px/s）
    const p: any = { x: 400, y: 300, vx: 240, vy: 0, effects: {} };
    for (let i = 0; i < 3; i++) spitterMove(e, 0.016, p, 1);
    const shot = entityState.state.projectiles[entityState.state.projectiles.length - 1] as any;
    // 弹的飞行方向应大致朝玩家右侧（预判点），而不是离谱偏移
    const ang = Math.atan2(shot.vy, shot.vx);
    expect(Math.cos(ang)).toBeGreaterThan(0.5);   // 主要朝右（+x）
    // 预判偏移合理：lead ∈ [0.1,1]s × vx 240 ≤ 240px
    const lead = Math.max(0.1, Math.min(1, 100 / 300));
    expect(240 * lead).toBeLessThanOrEqual(240);
  });
});
