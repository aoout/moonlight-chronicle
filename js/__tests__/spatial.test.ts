import { describe, it, expect, beforeEach, vi } from 'vitest';

// 模拟 state.js 返回可控的 G 对象
const { mockEnemies, mockG } = vi.hoisted(() => {
  const enemies: any[] = [];
  return { mockEnemies: enemies, mockG: { enemies } };
});
vi.mock('../state.js', () => ({ G: mockG }));

// 导入被测试模块
import { buildSpatialGrid, queryRadius, nearestInGrid } from '../spatial.js';

describe('Spatial Grid', () => {
  beforeEach(() => {
    mockEnemies.length = 0;
  });

  it('should build empty grid', () => {
    buildSpatialGrid();
    const result = queryRadius(0, 0, 100);
    expect(result.length).toBe(0);
  });

  it('should find a single enemy at center', () => {
    mockEnemies.push({ x: 0, y: 0, dead: 0 });
    buildSpatialGrid();
    const result = queryRadius(0, 0, 100);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(mockEnemies[0]);
  });

  it('should skip dead enemies', () => {
    mockEnemies.push({ x: 0, y: 0, dead: 1 });
    buildSpatialGrid();
    const result = queryRadius(0, 0, 100);
    expect(result.length).toBe(0);
  });

  it('should find enemy within radius', () => {
    mockEnemies.push({ x: 50, y: 0, dead: 0 });
    buildSpatialGrid();
    const result = queryRadius(0, 0, 100);
    expect(result.length).toBe(1);
  });

  it('should exclude enemy outside radius', () => {
    mockEnemies.push({ x: 200, y: 0, dead: 0 });
    buildSpatialGrid();
    const result = queryRadius(0, 0, 100);
    expect(result.length).toBe(0);
  });

  it('should find the nearest enemy', () => {
    mockEnemies.push({ x: 100, y: 0, dead: 0 });
    mockEnemies.push({ x: 30, y: 0, dead: 0 });
    mockEnemies.push({ x: 80, y: 0, dead: 0 });
    buildSpatialGrid();
    const nearest = nearestInGrid(0, 0, 200);
    expect(nearest).toBe(mockEnemies[1]); // 距离 30 的敌人
  });

  it('should handle multiple enemies at same position', () => {
    mockEnemies.push({ x: 10, y: 10, dead: 0 });
    mockEnemies.push({ x: 10, y: 10, dead: 0 });
    mockEnemies.push({ x: 10, y: 10, dead: 0 });
    buildSpatialGrid();
    const result = queryRadius(0, 0, 50);
    expect(result.length).toBe(3);
  });

  it('should return empty for nearest when no enemies', () => {
    buildSpatialGrid();
    const nearest = nearestInGrid(0, 0, 100);
    expect(nearest).toBeNull();
  });
});
