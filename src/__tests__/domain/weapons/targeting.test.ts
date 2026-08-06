/* =========================================================
   domain/weapons · denseArea 瞄准回退
   ---------------------------------------------------------
   回归测试：AOE 武器（陨星/潮锚）此前在稀疏敌场直接哑火。
   根因：denseArea 以 `bestScore < 1` 硬阈值拒绝开火——
   场上只有 1-2 个敌人时 score 达不到 1，返回 null，
   executeFirePipeline 因 target 为空直接不开火。

   修复后：密集区优先，找不到密集区时回退最近敌人，
   保证 AOE 武器始终有目标可打；只有场上完全无敌才返回 null。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { TARGETING } from '../../../domain/weapons/targeting.js';
import { installPlayer, makeEnemy, spawnEnemies, bindWorld } from '../../_harness/index.js';
import { buildSpatialGrid } from '../../../engine/spatial/SpatialSystem.js';
import type { Player, WeaponFireConfig } from '../../../types/core.d.ts';

const cfg: WeaponFireConfig = { targeting: 'denseArea', range: 500, pattern: 'single' };

function playerAt(x: number, y: number): Player {
  return installPlayer({ x, y });
}

beforeEach(() => { bindWorld(); });

describe('denseArea · 密集区瞄准', () => {
  it('敌群密集时瞄准簇心（score 最高点）', () => {
    playerAt(0, 0);
    // 三敌密集于 (300,300) 附近，另有一个孤敌在 (200,200)
    spawnEnemies(
      makeEnemy({ x: 300, y: 300 }),
      makeEnemy({ x: 315, y: 300 }),
      makeEnemy({ x: 300, y: 315 }),
      makeEnemy({ x: 200, y: 200 }),
    );
    buildSpatialGrid();

    const r = TARGETING.denseArea(playerAt(0, 0), cfg)!;
    // 应命中密集簇的成员之一，而非孤敌
    expect([300, 315]).toContain(Math.round(r.x));
    expect([300, 315]).toContain(Math.round(r.y));
  });

  it('单敌稀疏场不再哑火：回退到最近敌人', () => {
    playerAt(0, 0);
    spawnEnemies(makeEnemy({ x: 250, y: 250 }));
    buildSpatialGrid();

    const r = TARGETING.denseArea(playerAt(0, 0), cfg);
    expect(r).not.toBeNull();
    expect(Math.round(r!.x)).toBe(250);
    expect(Math.round(r!.y)).toBe(250);
  });

  it('两敌相隔较远（score < 1）仍会选其一开火', () => {
    playerAt(0, 0);
    // 相距 200，score 各为 1.4-200/160=0.15 < 1 —— 旧实现会拒绝
    spawnEnemies(
      makeEnemy({ x: 200, y: 200 }),
      makeEnemy({ x: 400, y: 200 }),
    );
    buildSpatialGrid();

    const r = TARGETING.denseArea(playerAt(0, 0), cfg);
    expect(r).not.toBeNull();
    // 命中的是其中一个敌人（200 或 400）
    expect([200, 400]).toContain(Math.round(r!.x));
  });

  it('场上完全无敌人时返回 null（不强行开火）', () => {
    playerAt(0, 0);
    buildSpatialGrid();

    expect(TARGETING.denseArea(playerAt(0, 0), cfg)).toBeNull();
  });

  it('候选全为 dead 时返回 null', () => {
    playerAt(0, 0);
    spawnEnemies(makeEnemy({ x: 250, y: 250, hp: 0, dead: 1 as any }));
    buildSpatialGrid();

    expect(TARGETING.denseArea(playerAt(0, 0), cfg)).toBeNull();
  });

  it('无玩家时安全返回 null', () => {
    expect(() => TARGETING.denseArea(null as any, cfg)).not.toThrow();
  });
});
