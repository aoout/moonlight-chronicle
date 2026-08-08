/* =========================================================
   domain/fortune_wheel · 蚀月轮盘纯逻辑
   ---------------------------------------------------------
   轮盘构成 / 权重与幸运修正 / 指针落点 / 踢格替代
   ========================================================= */
import { describe, it, expect } from 'vitest';
import {
  buildWheel, spinWheel, substituteBlessing, wheelBlessingIds, blessingById, slotWeight,
  doubleDescNums, enhanceNoteFor, sieveCandidates,
  WHEEL_SLOT_COUNT, WHEEL_BLESSING_COUNT, BLANK_WEIGHT,
} from '../../domain/fortune_wheel.js';
import { BLESSINGS } from '../../config/blessings.js';

describe('buildWheel 轮盘构成', () => {
  it('返回 12 格：11 祝福 + 1 蚀格', () => {
    const w = buildWheel(1);
    expect(w.length).toBe(WHEEL_SLOT_COUNT);
    expect(w.filter(s => s.kind === 'blank')).toHaveLength(1);
    expect(w.filter(s => s.kind === 'blessing')).toHaveLength(WHEEL_BLESSING_COUNT);
  });

  it('祝福格互不重复，且 id 全部合法', () => {
    const w = buildWheel(1);
    const ids = wheelBlessingIds(w);
    expect(new Set(ids).size).toBe(11);
    for (const id of ids) expect(blessingById(id)).toBeDefined();
  });

  it('excludeIds 不会出现在轮盘上', () => {
    const w = buildWheel(1, ['b_atk', 'b_hp']);
    const ids = wheelBlessingIds(w);
    expect(ids).not.toContain('b_atk');
    expect(ids).not.toContain('b_hp');
  });
});

describe('luckWeight 幸运修正（luck 重构后的唯一消费点）', () => {
  it('common 不受幸运影响', () => {
    const c = BLESSINGS.find(b => b.tier === 'common')!;
    expect(slotWeight({ kind: 'blessing', blessingId: c.id }, 1)).toBe(c.weight);
    expect(slotWeight({ kind: 'blessing', blessingId: c.id }, 3)).toBe(c.weight);
  });

  it('epic 权重 ×(1+luck)', () => {
    const e = BLESSINGS.find(b => b.tier === 'epic')!;
    expect(slotWeight({ kind: 'blessing', blessingId: e.id }, 1)).toBeCloseTo(e.weight * 2);
    expect(slotWeight({ kind: 'blessing', blessingId: e.id }, 3)).toBeCloseTo(e.weight * 4);
  });

  it('legend 权重 ×(1+luck×2)——杠杆长于 epic', () => {
    const l = BLESSINGS.find(b => b.tier === 'legend')!;
    expect(slotWeight({ kind: 'blessing', blessingId: l.id }, 1)).toBeCloseTo(l.weight * 3);
    expect(slotWeight({ kind: 'blessing', blessingId: l.id }, 3)).toBeCloseTo(l.weight * 7);
  });

  it('蚀格权重恒定，不受幸运影响', () => {
    expect(slotWeight({ kind: 'blank' }, 1)).toBe(BLANK_WEIGHT);
    expect(slotWeight({ kind: 'blank' }, 5)).toBe(BLANK_WEIGHT);
  });

  it('高幸运显著抬升 legend 总权重占比（福运 → 命运祝福更容易出现）', () => {
    const low = buildWheel(1);
    const high = buildWheel(3);
    const ratio = (w: typeof low) => w.reduce((s, x) =>
      s + (x.kind === 'blessing' && blessingById(x.blessingId!)?.tier === 'legend' ? slotWeight(x, 1) : 0), 0) /
      w.reduce((s, x) => s + slotWeight(x, 1), 0);
    expect(ratio(high)).toBeGreaterThan(ratio(low));
  });
});

describe('spinWheel 指针落点', () => {
  it('空池返回 -1', () => {
    expect(spinWheel([], 1)).toBe(-1);
  });

  it('rng=0 落第一格，rng 接近 1 落最后一格', () => {
    const w = buildWheel(1);
    expect(spinWheel(w, 1, () => 0)).toBe(0);
    expect(spinWheel(w, 1, () => 0.999999)).toBe(w.length - 1);
  });

  it('命中扇区与权重的累计区间一致（中点 rng 命中目标格）', () => {
    /* 手工构造两个权重格 + 空白，验证权重占比 = 命中概率 */
    const slots = [
      { kind: 'blessing' as const, blessingId: 'b_atk' },   // common 14
      { kind: 'blessing' as const, blessingId: 'b_critdmg' }, // epic 4（luck=1 → 8）
      { kind: 'blank' as const },
    ];
    const total = 14 + 8 + BLANK_WEIGHT;
    const mid0 = 14 / total / 2;
    const mid1 = (14 + 8) / total - 8 / total / 2;
    expect(spinWheel(slots, 1, () => mid0)).toBe(0);
    expect(spinWheel(slots, 1, () => mid1)).toBe(1);
    expect(spinWheel(slots, 1, () => (14 + 8 + BLANK_WEIGHT / 2) / total)).toBe(2);
  });
});

describe('substituteBlessing 踢格替代', () => {
  it('只从轮盘外选（18 祝福 - 11 在盘 = 7 可选）', () => {
    const w = buildWheel(1);
    const onWheel = wheelBlessingIds(w);
    const sub = substituteBlessing(onWheel, 1, () => 0);
    expect(sub).not.toBeNull();
    expect(onWheel).not.toContain(sub);
  });

  it('池空（全在盘上）返回 null', () => {
    const allIds = BLESSINGS.map(b => b.id);
    expect(substituteBlessing(allIds, 1)).toBeNull();
  });
});

describe('doubleDescNums 强化数值翻倍（详情浮层展示用）', () => {
  it('整数加法翻倍', () => {
    expect(doubleDescNums('生命上限 <span class="stat-up">+12</span>'))
      .toBe('生命上限 <span class="stat-up">+24</span>');
  });

  it('百分比翻倍', () => {
    expect(doubleDescNums('攻速 <span class="stat-up">+8%</span>'))
      .toBe('攻速 <span class="stat-up">+16%</span>');
  });

  it('小数翻倍（护甲 +1.5 → +3）', () => {
    expect(doubleDescNums('护甲 <span class="stat-up">+1.5</span>'))
      .toBe('护甲 <span class="stat-up">+3</span>');
  });

  it('每秒恢复翻倍（+0.4/s → +0.8/s）', () => {
    expect(doubleDescNums('生命恢复 <span class="stat-up">+0.4/s</span>'))
      .toBe('生命恢复 <span class="stat-up">+0.8/s</span>');
  });

  it('复合描述翻倍（幸运 +15%（提升权重）→ +30%）', () => {
    expect(doubleDescNums('幸运 <span class="stat-up">+15%</span>（提升非凡/命运祝福权重）'))
      .toBe('幸运 <span class="stat-up">+30%</span>（提升非凡/命运祝福权重）');
  });
});

describe('enhanceNoteFor 强化说明', () => {
  it('三种品质各有一句话说明', () => {
    expect(enhanceNoteFor('common')).toContain('翻倍');
    expect(enhanceNoteFor('epic')).toContain('月契');
    expect(enhanceNoteFor('legend')).toContain('三连抽');
    expect(enhanceNoteFor('unknown')).toBe('');
  });
});

describe('sieveCandidates 命运筛选三格候选', () => {
  it('返回 [左邻, 落点, 右邻]，环绕处理', () => {
    const slots = Array.from({ length: 12 }, (_, i) =>
      i === 0 ? { kind: 'blank' as const } : { kind: 'blessing' as const, blessingId: 'b_hp' });
    expect(sieveCandidates(slots, 5)).toEqual([4, 5, 6]);
    /* 落点在首格：左邻环绕到末格 */
    expect(sieveCandidates(slots, 0)).toEqual([11, 0, 1]);
    /* 落点在末格：右邻环绕到首格 */
    expect(sieveCandidates(slots, 11)).toEqual([10, 11, 0]);
  });

  it('空轮盘返回空数组', () => {
    expect(sieveCandidates([], 0)).toEqual([]);
  });
});
