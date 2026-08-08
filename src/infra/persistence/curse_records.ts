/* =========================================================
   蚀月远征 · 蚀之账本（诅咒通关计数）
   记录每个诅咒被携带着通关的次数 —— 蚀潮认得自己的债主。
   携带某诅咒累计通关 5 次即「精通」：诅咒抽卡时若未被抽中，
   便以蚀之回响（反向减半恩惠）偿还旧账。
   ========================================================= */
const KEY = 'eclipse_curse_records_save';

export const CURSE_MASTERY = 5; // 精通阈值：携带通关 5 次

function load(): Record<string, number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function save(records: Record<string, number>): void {
  try { localStorage.setItem(KEY, JSON.stringify(records)); } catch { /* 容量/隐私模式：静默 */ }
}

/** 某诅咒的累计通关次数 */
export function curseRecordCount(id: string): number {
  return load()[id] || 0;
}

/** 携带某诅咒通关一次（+1 并落盘） */
export function curseRecordInc(id: string): void {
  const records = load();
  records[id] = (records[id] || 0) + 1;
  save(records);
}

/** 是否精通（累计 ≥5 次）：精通后诅咒抽卡避开它时给予蚀之回响 */
export function isCurseMastered(id: string): boolean {
  return curseRecordCount(id) >= CURSE_MASTERY;
}
