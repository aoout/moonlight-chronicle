/* =========================================================
   infra · curse_records 蚀之账本（诅咒通关计数）
   ========================================================= */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  curseRecordCount, curseRecordInc, isCurseMastered, CURSE_MASTERY,
} from '../../infra/persistence/curse_records.js';

const KEY = 'eclipse_curse_records_save';

beforeEach(() => {
  localStorage.clear();
});

describe('curse_records（蚀之账本）', () => {
  it('初始计数为 0，未精通', () => {
    expect(curseRecordCount('curse_crit')).toBe(0);
    expect(isCurseMastered('curse_crit')).toBe(false);
  });

  it('携带通关计数 +1 并落盘（跨调用保留）', () => {
    curseRecordInc('curse_atk');
    curseRecordInc('curse_atk');
    curseRecordInc('curse_atk');
    expect(curseRecordCount('curse_atk')).toBe(3);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ curse_atk: 3 });
  });

  it('累计通关达到精通阈值（5 次）后 isCurseMastered 为真', () => {
    for (let i = 0; i < CURSE_MASTERY; i++) curseRecordInc('curse_hp');
    expect(isCurseMastered('curse_hp')).toBe(true);
    expect(curseRecordCount('curse_hp')).toBe(CURSE_MASTERY);
  });

  it('损坏数据静默降级为空账本', () => {
    localStorage.setItem(KEY, '{不是合法json');
    expect(curseRecordCount('curse_crit')).toBe(0);
  });
});
