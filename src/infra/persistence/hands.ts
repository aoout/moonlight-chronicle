/* =========================================================
   蚀月远征 · 记手录：器物与持握者的相遇次数
   每一次在商店「选取」武器/道具，记手录便添一笔。
   月背档案的深层字迹只对「相伴十次」的手显现——
   器识其主，握之十夜，方见其言。
   ========================================================= */

const HANDS_KEY = 'eclipse_hands_save';

type HandsMap = Record<string, Record<string, number>>;

export function loadHands(): HandsMap {
  try { return JSON.parse(localStorage.getItem(HANDS_KEY) || '{}') || {}; } catch (e) { return {}; }
}

/** 某器物被选取的总次数（跨局累计） */
export function handsGet(type: string, id: string): number {
  return loadHands()[type]?.[id] ?? 0;
}

/** 选取一次，记手录添一笔 */
export function handsAdd(type: string, id: string): void {
  try {
    const h = loadHands();
    h[type] = h[type] || {};
    h[type][id] = (h[type][id] || 0) + 1;
    localStorage.setItem(HANDS_KEY, JSON.stringify(h));
  } catch (e) {}
}

/** 深层档案解锁所需相伴次数（世界设定：十次） */
export const HANDS_DEEP_THRESHOLD = 10;
