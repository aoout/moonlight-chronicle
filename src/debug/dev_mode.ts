/* =========================================================
   开发者模式：图鉴 / 深度全解锁开关
   判定优先级：URL 参数 ?dev=1（一次性） > localStorage（持久）
               > 构建环境变量 VITE_GOD_MODE（npm run dev:god）
   只做只读覆盖，不写入正式存档；关闭后恢复真实进度。
   ========================================================= */

const LS_KEY = 'eclipse_dev_mode';

export function isDevMode(): boolean {
  if (typeof window !== 'undefined') {
    try {
      if (new URLSearchParams(window.location.search).has('dev')) return true;
      if (localStorage.getItem(LS_KEY) === '1') return true;
    } catch { /* localStorage 不可用（隐私模式等）时忽略 */ }
  }
  return import.meta.env.VITE_GOD_MODE === 'true';
}

/** 运行时切换（写入 localStorage；?dev=1 为一次性，不受此影响） */
export function setDevMode(on: boolean): void {
  try {
    if (on) localStorage.setItem(LS_KEY, '1');
    else localStorage.removeItem(LS_KEY);
  } catch { /* 忽略 */ }
}
