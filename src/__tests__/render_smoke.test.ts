import { describe, it, expect, vi } from 'vitest';
import { drawEnemyBody, ENEMY_SHAPES } from '../features/render/layers/enemies.js';
import { drawBossBody, BOSS_SHAPES } from '../features/render/layers/bosses.js';
import { drawProjectiles } from '../features/render/effects/projectiles.js';

vi.hoisted(() => {
  (globalThis as any).window = globalThis;
  (globalThis as any).requestAnimationFrame = (cb: any) => 0;
});

function mkCtx(): any {
  const ops: string[] = [];
  return new Proxy({}, {
    get(_t, k) {
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop(){} });
      if (k === 'arc') return (x: number, y: number, r: number) => { if (typeof r === 'number' && (r < 0 || isNaN(r))) throw new Error('neg/NaN radius ' + r); };
      return (...a: any[]) => { ops.push(String(k)); };
    },
    set() { return true; },
  });
}

describe('敌人/Boss 造型渲染冒烟', () => {
  it('所有敌人造型无负半径/异常', () => {
    const ctx = mkCtx();
    const e: any = { type: '', color: '#888', state: 'chase', stateT: 0.5, ranged: true, hp: 50, maxHp: 100 };
    for (const t of ['grub','rat','armored','wing','charger','spitter','splitter','shadow','giant','bomber','_default']) {
      e.type = t;
      expect(() => drawEnemyBody(ctx, e, 10, 0, 0, 1, 0, 2.5)).not.toThrow();
    }
  });
  it('所有 Boss 造型无负半径/异常（含蓄力）', () => {
    const ctx = mkCtx();
    const e: any = { type: '', color: '#888', attT: 1, attCd: 3.4, hp: 500, maxHp: 500, state: 'chase' };
    for (const t of ['behemoth','tideMother','erodeChariot','lord','moonWraith','moonSwordsman','dragon','stormOwl','abyssMother','final']) {
      e.type = t;
      expect(() => drawBossBody(ctx, e, 30, 0, 0, 1, 2.5)).not.toThrow();
    }
  });
});

describe('敌人技能投射物渲染冒烟', () => {
  it('各技能专属弹头/特效无负半径异常', () => {
    const ctx = mkCtx();
    const cases: any[] = [
      { enemy: true, vx: 100, vy: 0, r: 6, t: 0.3, color: '#ff9d6b', moonblade: true },
      { enemy: true, vx: 100, vy: 0, r: 5, t: 0.3, color: '#5c8a9e', wave: true },
      { enemy: true, vx: 100, vy: 0, r: 6, t: 0.3, color: '#ff9d6b', ember: true },
      { enemy: true, vx: 100, vy: 0, r: 6, t: 0.3, color: '#ffb84d', pulse: true },
      { enemy: true, vx: 0, vy: 0, r: 8, t: 0.3, color: '#9a86c8', orb: true },
      { enemy: true, aoe: true, vx: 0, vy: 0, r: 120, maxR: 360, t: 0.3, color: '#7fce5a', mist: true },
      { ground: true, t: 0.4, delay: 0.8, r: 68, color: '#8f9aee', lightning: true },
      { ground: true, t: 0.4, delay: 0.7, r: 44, color: '#ff7a7a', erode: true },
      { acid: true, vx: 100, vy: 0, r: 5, color: '#7fce5a' },
    ];
    for (const pr of cases) {
      expect(() => drawProjectiles({ ctx, projectiles: [pr], player: null } as any)).not.toThrow();
    }
  });
});
