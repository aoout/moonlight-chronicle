/* =========================================================
   测试地基 · 宿主能力替身
   =========================================================

   刻意只提供**非 DOM** 的宿主能力（localStorage / performance）。

   不提供 document / window / HTMLElement —— 这是有意的约束：
   0–9 层不该需要它们，`arch/no_dom.test.ts` 正是靠这个前提在把关。
   经实测，全部渲染层模块在无 window 环境下也能正常加载，
   历史上散落在 6 个测试文件里的 `vi.hoisted(() => globalThis.window = ...)`
   属于早期遗留，已全部移除。

   若将来某个测试确实需要 DOM，正确做法是给那个文件单独加
   `// @vitest-environment jsdom`，而不是在这里污染全局。
   ========================================================= */

/** 内存版 localStorage：行为与浏览器一致，进程内隔离，可清空 */
export function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, String(v)),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

/** 安装非 DOM 宿主能力。幂等。 */
export function installHostGlobals(): void {
  const g = globalThis as Record<string, unknown>;
  if (!g.localStorage) g.localStorage = createMemoryStorage();
  if (!g.performance) g.performance = { now: () => 0 } as Performance;
}

/** 清空 localStorage —— 每个用例前调用，防止存档测试互相串味 */
export function clearHostStorage(): void {
  (globalThis as unknown as { localStorage?: Storage }).localStorage?.clear();
}
