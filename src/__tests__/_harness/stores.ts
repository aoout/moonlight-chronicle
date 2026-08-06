/* =========================================================
   测试地基 · 状态容器自动发现与重置
   =========================================================

   为什么要有这个：
   state/ 里的 store 都是模块级单例。用例 A 往 `entities.enemies` 里塞了敌人，
   用例 B 不知情地跑在这份残留上 —— 故障表现为「单独跑绿、全量跑红」，
   或者更糟：「今天绿、明天红」。这类问题排查成本极高。

   为什么用 glob 而不是手写清单：
   手写清单的失效方式是「加了新 store 忘了登记」，而且不会有任何报错。
   glob 让新增 store 自动纳管，清单不存在就不会过期。
   ========================================================= */
import { Store } from '../../engine/core/store.js';

const STATE_MODULES = import.meta.glob('../../state/*.ts', { eager: true }) as Record<
  string,
  Record<string, unknown>
>;

export interface DiscoveredStore {
  /** 形如 `player.playerState`，断言失败时能一眼定位 */
  readonly name: string;
  readonly store: Store<Record<string, unknown>>;
}

function discover(): DiscoveredStore[] {
  const found: DiscoveredStore[] = [];
  for (const [path, mod] of Object.entries(STATE_MODULES)) {
    const file = path.split('/').pop()!.replace(/\.ts$/, '');
    for (const [exportName, value] of Object.entries(mod)) {
      if (value instanceof Store) {
        found.push({ name: `${file}.${exportName}`, store: value as Store<Record<string, unknown>> });
      }
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

/** state/ 下全部状态容器，按名称排序 */
export const ALL_STORES: readonly DiscoveredStore[] = discover();

/** 把所有状态容器恢复到初始状态。不影响监听器订阅。 */
export function resetAllStores(): void {
  for (const { store } of ALL_STORES) store.reset();
}
