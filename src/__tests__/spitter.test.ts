import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as any).window = globalThis;
  (globalThis as any).requestAnimationFrame = (cb: any) => 0;
});

import { spitterMove } from '../enemies/behaviors/spitter.js';
import { world } from '../ecs/World.js';
import { stageState } from '../state/stage.js';
import { renderState } from '../state/render.js';

describe('蚀涎魔喷吐', () => {
  it('射程内 stateT<=0 时发射酸弹', () => {
    stageState.set('stage', 5);
    renderState.set('width', 800); renderState.set('height', 600);
    const before = world.getPool('projectiles')?.count ?? 0;
    const e: any = {
      x: 300, y: 300, spd: 52, stateT: 0, ranged: true,
      projSpd: 180, projDmg: 8, size: 10, dmg: 12,
    };
    const p: any = { x: 400, y: 300, vx: 0, vy: 0 };
    // 驱 3 帧（每帧 0.016s，stateT 0→-0.048 → 触发）
    for (let i = 0; i < 3; i++) spitterMove(e, 0.016, p, 1);
    const after = world.getPool('projectiles')?.count ?? 0;
    expect(after - before).toBeGreaterThan(0);
  });
});

import { drawProjectiles } from '../render/effects/projectiles.js';

describe('蚀涎魔弹渲染', () => {
  it('enemy 弹（通用尖刺）渲染无异常', () => {
    const ops: any[] = [];
    const ctx = new Proxy({}, {
      get(_t, k) {
        if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop(){} });
        if (k === 'arc') return (x: number, y: number, r: number) => { if (r < 0 || isNaN(r)) throw new Error('neg ' + r); };
        return () => { ops.push(k); };
      },
      set() { return true; },
    });
    const pr: any = { enemy: true, x: 100, y: 100, vx: 180, vy: 0, r: 5, color: '#7fd6a4', t: 0.3, hit: new Set() };
    expect(() => drawProjectiles({ ctx, projectiles: [pr], player: null } as any)).not.toThrow();
  });
});
