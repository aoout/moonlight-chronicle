/* =========================================================
   蚀月远征 · 蚀月功勋：成就存档（累计计数 + 已解锁）
   ========================================================= */

const ACH_KEY = 'eclipse_achievements_save';

export interface AchSave {
  counts: Record<string, number>;   // 累计计数型进度（跨局）
  earned: Record<string, boolean>;   // 已解锁成就
}

export function loadAch(): AchSave {
  try {
    const d = JSON.parse(localStorage.getItem(ACH_KEY) || '{}');
    return { counts: d.counts || {}, earned: d.earned || {} };
  } catch (e) {
    return { counts: {}, earned: {} };
  }
}

export function saveAch(s: AchSave): void {
  try { localStorage.setItem(ACH_KEY, JSON.stringify(s)); } catch (e) {}
}

export function achEarnedCount(): number {
  return Object.keys(loadAch().earned).length;
}
