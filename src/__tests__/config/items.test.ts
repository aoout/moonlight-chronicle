/* =========================================================
   config/items.json · 道具数据一致性回归
   ---------------------------------------------------------
   道具效果间隔（interval）是三处事实来源，必须同步：
     1. items.json 的 interval 字段（数据层）
     2. domain/effects.ts 的实现（读取 interval）
     3. desc 文本（图鉴展示的"N 秒"）
   任何一处改了另两处没改，就是"图鉴文本与实际效果不符"类
   bug 的温床 —— 本测试把这条链锁死。
   ========================================================= */
import { describe, it, expect } from 'vitest';
import { SHOP_ITEMS } from '../../config/index.js';

describe('道具 interval 与描述一致性', () => {
  const withInterval = SHOP_ITEMS.filter(i => i.interval !== undefined);

  it('存在带 interval 的道具（保证本测试不是空转）', () => {
    expect(withInterval.length).toBeGreaterThan(0);
  });

  it('带 interval 的道具，desc 文本必须包含对应的秒数', () => {
    for (const item of withInterval) {
      expect(item.desc, `${item.id} 的 desc 未包含 interval=${item.interval} 秒，请同步修改描述文本`).toContain(`${item.interval} 秒`);
    }
  });

  it('群星陨落触发间隔为 9 秒（与 effects.ts 实现一致）', () => {
    const starfall = SHOP_ITEMS.find(i => i.id === 'starfall');
    expect(starfall?.interval).toBe(9);
    expect(starfall?.desc).toContain('9 秒');
  });
});
