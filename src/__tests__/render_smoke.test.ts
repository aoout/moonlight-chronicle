import { describe, it, expect, vi } from 'vitest';
import { drawEnemyBody, ENEMY_SHAPES } from '../render/layers/enemies.js';
import { drawBossBody, BOSS_SHAPES } from '../render/layers/bosses.js';

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
      expect(() => drawBossBody(ctx, e, 30, 0, 1, 2.5)).not.toThrow();
    }
  });
});
