import { describe, it, expect, vi } from 'vitest';

vi.hoisted(() => {
  (globalThis as any).window = globalThis;
  (globalThis as any).requestAnimationFrame = (cb: any) => 0;
});

import { MOVEMENT } from '../domain/weapons/movement.js';

describe('追踪弹平滑转向', () => {
  it('turnRate 限制转向：急转时弹跟不上', () => {
    // 弹向右飞，玩家在正上方 → 需转 90°
    const pr: any = { x: 0, y: 0, vx: 100, vy: 0, speed: 100, turnRate: 1.5, t: 0, life: 4 };
    const p: any = { x: 0, y: -100 };
    pr.target = p;
    const alive = MOVEMENT.homing(pr, 1 / 60, p);
    expect(alive).toBe(true);
    // 转向角受 turnRate×dt 限制：90°(1.57rad) > 1.5×(1/60)=0.025rad → 只转 0.025rad
    const turn = Math.atan2(pr.vy, pr.vx);
    expect(turn).toBeGreaterThan(-1.5);   // 未转完 90°
    expect(turn).toBeLessThan(0);         // 朝玩家（上方 = -y）转了，但只有 -0.025rad
  });

  it('lockT 到期后失去追踪（变直线）', () => {
    const pr: any = { x: 0, y: 0, vx: 100, vy: 0, speed: 100, turnRate: 99, lockT: 0.05, t: 0, life: 4 };
    const p: any = { x: 0, y: -100 };
    pr.target = p;
    MOVEMENT.homing(pr, 0.06, p);
    expect(pr.target).toBeUndefined();
  });

  it('speedMax 限制加速上限', () => {
    const pr: any = { x: 0, y: 0, vx: 100, vy: 0, speed: 100, speedMax: 120, accel: 1000, t: 0, life: 4 };
    const p: any = { x: 0, y: -100 };
    pr.target = p;
    MOVEMENT.homing(pr, 1 / 60, p);
    expect(pr.speed).toBeLessThanOrEqual(120);
  });
});
