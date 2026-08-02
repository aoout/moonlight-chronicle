/* =========================================================
   蚀月远征 · 蚀之图鉴：所见之物烙印于月光
   敌人/Boss 遇过、武器/道具购得即解锁
   ========================================================= */

const CODEX_KEY = 'eclipse_codex_save';

export function loadCodex(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(CODEX_KEY) || '{}') || {}; } catch (e) { return {}; }
}

export function codexUnlocked(type: string): any[] {
  const cx = loadCodex();
  return cx[type] || [];
}

export function codexAdd(type: string, id: string): void {
  try {
    const cx = loadCodex();
    cx[type] = cx[type] || [];
    if (!cx[type].includes(id)) { cx[type].push(id); localStorage.setItem(CODEX_KEY, JSON.stringify(cx)); }
  } catch (e) {}
}
