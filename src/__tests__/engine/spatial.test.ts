/* =========================================================
   engine/spatial · 空间哈希网格
   ---------------------------------------------------------
   全项目所有「范围内的敌人」都走这里：范围伤害、索敌、环绕武器、
   连锁闪电、拾取判定。它错一点，上层全线静默失灵 —— 不报错，
   只是打不到人。

   原文件用 vi.mock 顶替了 entityState，测的是 mock 与网格的配合；
   现在直接跑真实 store + World 绑定，把「接线本身」也纳入覆盖。
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import { buildSpatialGrid, queryRadius, nearestInGrid, neighborEnemies } from '../../engine/spatial/SpatialSystem.js';
import { bindWorld, makeEnemy, spawnEnemies } from '../_harness/index.js';
import type { EnemyInstance } from '../../types/core.d.ts';

/** 单元格边长，与 World 内的 SPATIAL_CELL 对齐 */
const CELL = 120;

const at = (x: number, y: number, overrides: Partial<EnemyInstance> = {}) =>
  makeEnemy({ x, y, ...overrides });

/** 放敌人 + 重建网格，一步到位 */
function grid(...enemies: EnemyInstance[]): EnemyInstance[] {
  spawnEnemies(...enemies);
  buildSpatialGrid();
  return enemies;
}

beforeEach(() => {
  bindWorld();
});

describe('buildSpatialGrid · 建格', () => {
  it('空世界查询返回空结果', () => {
    buildSpatialGrid();
    expect(queryRadius(0, 0, 100)).toHaveLength(0);
  });

  it('死亡敌人不入格', () => {
    grid(at(0, 0, { dead: 1 }));
    expect(queryRadius(0, 0, 100)).toHaveLength(0);
  });

  it('重建会反映敌人的新位置', () => {
    const [e] = grid(at(0, 0));
    expect(queryRadius(0, 0, 50)).toHaveLength(1);

    e.x = 1000;
    buildSpatialGrid();

    expect(queryRadius(0, 0, 50)).toHaveLength(0);
    expect(queryRadius(1000, 0, 50)).toHaveLength(1);
  });

  it('不重建则查询结果是上一帧的（每帧重建是硬约束）', () => {
    const [e] = grid(at(0, 0));
    e.x = 1000;                                  // 移动但不重建

    // 仍能在旧格子里被找到 —— 这是「必须每帧 buildSpatialGrid」的原因
    expect(neighborEnemies(0, 0)).toContain(e);
  });
});

describe('queryRadius · 精确半径', () => {
  it('命中范围内的敌人', () => {
    const [e] = grid(at(50, 0));
    expect(queryRadius(0, 0, 100)).toEqual([e]);
  });

  it('排除范围外的敌人', () => {
    grid(at(200, 0));
    expect(queryRadius(0, 0, 100)).toHaveLength(0);
  });

  it('恰好落在半径上算命中（闭区间）', () => {
    const [e] = grid(at(100, 0));
    expect(queryRadius(0, 0, 100)).toEqual([e]);
  });

  it('半径外 1px 即落空', () => {
    grid(at(101, 0));
    expect(queryRadius(0, 0, 100)).toHaveLength(0);
  });

  it('同格多敌全部返回', () => {
    grid(at(10, 10), at(10, 10), at(10, 10));
    expect(queryRadius(0, 0, 50)).toHaveLength(3);
  });

  it('大半径跨多个格子也能查全', () => {
    const far = at(CELL * 3 - 10, 0);            // 约 350px 外，隔 3 个格
    grid(at(10, 0), far);

    expect(queryRadius(0, 0, 400)).toHaveLength(2);
  });

  it('半径小于格宽时不会漏掉邻格的敌人', () => {
    // 查询点在格边缘，敌人在隔壁格但物理距离很近
    const [e] = grid(at(CELL + 5, 0));
    expect(queryRadius(CELL - 5, 0, 30)).toEqual([e]);
  });

  it('负坐标同样正确分格', () => {
    const [e] = grid(at(-250, -250));
    expect(queryRadius(-250, -250, 50)).toEqual([e]);
    expect(queryRadius(250, 250, 50)).toHaveLength(0);
  });

  it('半径为 0 时只命中同点敌人', () => {
    const [same] = grid(at(0, 0), at(1, 0));
    expect(queryRadius(0, 0, 0)).toEqual([same]);
  });
});

describe('neighborEnemies · 粗筛', () => {
  it('不传半径时只扫 3×3 格，远处敌人扫不到', () => {
    grid(at(CELL * 3, 0));
    expect(neighborEnemies(0, 0)).toHaveLength(0);
  });

  it('粗筛不做精确距离过滤，会带出格内但半径外的敌人', () => {
    // (115, 115) 与原点距离约 162 > 100，但同在 0,0 格里
    const [e] = grid(at(115, 115));

    expect(neighborEnemies(0, 0, 100)).toContain(e);
    expect(queryRadius(0, 0, 100)).toHaveLength(0);
  });
});

describe('nearestInGrid · 最近邻', () => {
  it('返回距离最近的那个', () => {
    const [, near] = grid(at(100, 0), at(30, 0), at(80, 0));
    expect(nearestInGrid(0, 0, 200)).toBe(near);
  });

  it('没有敌人时返回 null', () => {
    buildSpatialGrid();
    expect(nearestInGrid(0, 0, 100)).toBeNull();
  });

  it('maxR 同时限定搜索格与距离上限', () => {
    grid(at(150, 0));
    expect(nearestInGrid(0, 0, 100)).toBeNull();
    expect(nearestInGrid(0, 0, 200)).not.toBeNull();
  });

  it('exclude 可跳过指定目标（连锁闪电靠它不打回头）', () => {
    const [first, second] = grid(at(30, 0), at(60, 0));

    expect(nearestInGrid(0, 0, 200)).toBe(first);
    expect(nearestInGrid(0, 0, 200, first)).toBe(second);
  });

  it('死亡目标不会被选中', () => {
    const [, alive] = grid(at(10, 0, { dead: 1 }), at(90, 0));
    expect(nearestInGrid(0, 0, 200)).toBe(alive);
  });
});
