/* =========================================================
   测试地基 · 模块级单例隔离
   ---------------------------------------------------------
   项目里有一批模块把状态放在文件顶层（成就累计、端口注册表、
   事件订阅…），它们在首次 import 时就从 localStorage 载入并
   常驻。这类模块无法用「调个 reset 函数」的方式清干净——
   除非为了测试往生产代码里塞后门。

   正确解法是清空模块注册表后重新 import：模块顶层副作用会
   重新执行一遍，拿到的是出厂状态的新实例。

   注意：resetModules 之后，静态 import 拿到的是**旧实例**，
   新旧两份不共享状态。所以同一条测试链路上需要的模块，都要
   一起用 importFresh 重新拿。
   ========================================================= */
import { vi } from 'vitest';

/**
 * 清空模块缓存后重新加载模块，得到顶层状态全新的实例。
 *
 * 传 loader 闭包而不是路径字符串，是为了让 Vite 能静态分析
 * 到这个 import，同时保住 TypeScript 的类型推导。
 *
 * @example
 * let ach: typeof import('../../systems/AchievementSystem.js');
 * beforeEach(async () => {
 *   ach = await importFresh(() => import('../../systems/AchievementSystem.js'));
 * });
 */
export async function importFresh<T>(loader: () => Promise<T>): Promise<T> {
  vi.resetModules();
  return loader();
}

/**
 * 一次性加载多个互相依赖的模块，保证它们落在**同一份**模块图里。
 * 只在开头 reset 一次，后续 import 复用同一个新注册表。
 *
 * @example
 * const [ach, cfg] = await importFreshAll(
 *   () => import('../../systems/AchievementSystem.js'),
 *   () => import('../../config/achievements.js'),
 * );
 */
export async function importFreshAll<T extends readonly unknown[]>(
  ...loaders: { [K in keyof T]: () => Promise<T[K]> }
): Promise<T> {
  vi.resetModules();
  const out: unknown[] = [];
  for (const load of loaders) out.push(await load());
  return out as unknown as T;
}
