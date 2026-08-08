/* =========================================================
   domain · curse_pick 蚀潮索价（诅咒抽取与抉择）
   ========================================================= */
import { describe, it, expect } from 'vitest';
import {
  drawCurseOptions, cursePickCount, curseGraces, resolveCurses,
  CURSE_OPTIONS, DOUBLE_CURSE_DEPTH,
} from '../../domain/curse_pick.js';
import { CURSES } from '../../config/index.js';
import { makePlayer } from '../_harness/index.js';

const curse = (id: string) => CURSES.find(c => c.id === id)!;

describe('drawCurseOptions', () => {
  it('抽取 3 张且互不重复', () => {
    const options = drawCurseOptions();
    expect(options).toHaveLength(CURSE_OPTIONS);
    const ids = options.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of options) expect(CURSES.some(x => x.id === c.id)).toBe(true);
  });
});

describe('cursePickCount', () => {
  it('深度 <5 选 1 个诅咒，≥5 选 2 个', () => {
    expect(cursePickCount(1)).toBe(1);
    expect(cursePickCount(4)).toBe(1);
    expect(cursePickCount(DOUBLE_CURSE_DEPTH)).toBe(2);
    expect(cursePickCount(9)).toBe(2);
  });
});

describe('curseGraces（蚀之回响）', () => {
  it('只返还未抽中且已精通的诅咒', () => {
    const options = [curse('curse_atk'), curse('curse_hp'), curse('curse_gold')];
    const mastered = new Set(['curse_crit', 'curse_atk']); // atk 已被抽中，不应返回
    const graces = curseGraces(options, mastered);
    expect(graces.map(g => g.id)).toEqual(['curse_crit']);
  });

  it('全部抽中或无精通时无回响', () => {
    const options = drawCurseOptions();
    expect(curseGraces(options, new Set())).toEqual([]);
    expect(curseGraces(options, new Set(options.map(c => c.id)))).toEqual([]);
  });
});

describe('resolveCurses', () => {
  it('应用所选诅咒（惩罚）与未抽中精通诅咒的恩惠', () => {
    const p = makePlayer({ atk: 10, critRate: 0.05 });
    const picked = [curse('curse_atk')];
    const options = [curse('curse_atk'), curse('curse_hp'), curse('curse_gold')];
    const mastered = new Set(['curse_crit']);
    resolveCurses(p, picked, options, mastered);
    expect(p.atk).toBe(6);                        // 月刃钝蚀 -4
    expect(p.critRate).toBeCloseTo(0.10);         // 蚀之回响：月运晦暗暴击 +5%
  });
});
