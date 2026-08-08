/* =========================================================
   config · HOMING_TUNE 追踪弹差异化调校
   ---------------------------------------------------------
   锁三件事：
     1. 每个 Boss 的追踪弹三旋钮齐全且在可操作区间（杜绝必中税）
     2. 各 Boss 参数组合互不相同（体验区分，不是统一填表）
     3. 与玩家移速(240)的关系符合设计意图（可拖 / 只能绕）
   ========================================================= */
import { describe, it, expect } from 'vitest';
import { HOMING_TUNE } from '../../config/homing_tune.js';

const PLAYER_SPEED = 240;

describe('HOMING_TUNE 可操作性（每个 Boss 的追踪弹都能被走位应对）', () => {
  it('所有条目三旋钮齐全，且都在可操作区间', () => {
    for (const [key, t] of Object.entries(HOMING_TUNE)) {
      expect(t.turnRate, `${key}: turnRate`).toBeGreaterThanOrEqual(1.8);  // 钝到能甩开
      expect(t.turnRate, `${key}: turnRate`).toBeLessThanOrEqual(4.2);     // 灵敏但非瞬时
      expect(t.speedMax, `${key}: speedMax`).toBeGreaterThanOrEqual(235);
      expect(t.speedMax, `${key}: speedMax`).toBeLessThanOrEqual(390);
      expect(t.lockT, `${key}: lockT`).toBeGreaterThanOrEqual(1.5);        // 有锁定才有压迫
      expect(t.lockT, `${key}: lockT`).toBeLessThanOrEqual(4.5);           // 终会失锁，可拖过
    }
  });

  it('不存在瞬时转向（turnRate 远小于 999）的必中配置', () => {
    for (const [key, t] of Object.entries(HOMING_TUNE)) {
      expect(t.turnRate, `${key}: 不得回到瞬时转向默认值`).toBeLessThan(10);
    }
  });

  it('各 Boss 参数组合互不相同（体验区分）', () => {
    const sigs = Object.values(HOMING_TUNE).map(t => t.turnRate + '/' + t.speedMax + '/' + t.lockT);
    expect(new Set(sigs).size).toBe(sigs.length);
  });

  it('speedMax ≤245 的可纯直线拖（追不上玩家）；≥360 的跑不赢只能绕圈', () => {
    const draggable = ['spawnTide', 'shadowOrbS', 'acidMist'];
    for (const k of draggable) {
      expect(HOMING_TUNE[k].speedMax, `${k} 应可直线拖`).toBeLessThanOrEqual(PLAYER_SPEED + 5);
    }
    for (const k of ['breath', 'eclipse']) {
      expect(HOMING_TUNE[k].speedMax, `${k} 应跑不赢只能绕`).toBeGreaterThanOrEqual(360);
    }
  });
});
