/* =========================================================
   domain/weapons/hit_detection · AOE maxR 默认值修复
   ---------------------------------------------------------
   覆盖 aoe 碰撞检测中 pr.maxR 为 undefined 时使用默认值 200，
   不产生 NaN 的修复行为。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  makeProjectile, installPlayer, bindWorld, spawnEnemies, makeDummy,
} from '../../_harness/index.js';
import { HIT_DETECTION } from '../../../domain/weapons/hit_detection.js';

describe('AOE 碰撞检测 · maxR 默认值', () => {
  beforeEach(() => {
    bindWorld();
    installPlayer();
  });

  it('pr.maxR 为 undefined 时使用默认值 200，不产生 NaN', () => {
    const pr = makeProjectile({ x: 0, y: 0, r: 50, enemy: false });
    // 确保 maxR 是 undefined（zeroed 会设成 0，这里显式删除）
    delete (pr as any).maxR;
    expect((pr as any).maxR).toBeUndefined();

    const e = makeDummy({ x: 100, y: 0 });
    spawnEnemies(e);

    const p = installPlayer();
    expect(() => HIT_DETECTION.aoe(pr, 0.016, p)).not.toThrow();
    // pr.r 应在正常数值范围内，不应为 NaN
    expect(pr.r).not.toBeNaN();
    expect(isFinite(pr.r)).toBe(true);
    expect(pr.r).toBeGreaterThan(0);
  });

  it('pr.maxR 为 0 时保留 0（?? 修复：0 是合法值，不应替换为 200）', () => {
    const pr = makeProjectile({ x: 0, y: 0, r: 50, maxR: 0, enemy: false });
    const e = makeDummy({ x: 100, y: 0 });
    spawnEnemies(e);

    const p = installPlayer();
    HIT_DETECTION.aoe(pr, 0.016, p);
    // maxR=0 是合法值，?? 修复后保留 0 而非替换为 200
    expect(pr.r).toBe(0);
    expect(pr.r).not.toBeNaN();
    expect(isFinite(pr.r)).toBe(true);
  });
});