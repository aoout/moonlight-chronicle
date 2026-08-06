/* =========================================================
   Vitest 全局 setup · 每个用例前的复位
   =========================================================

   全局接管（Math.random / 宿主替身）不在这里，在 `_harness/install.ts`。
   那件事必须发生在任何业务模块求值之前，而本文件顶部就 import 了业务
   模块（状态机），做不到 —— 详见 install.ts 里的说明。

   本文件只负责「每个用例前复位四件事」，无需测试文件自己记得：
     1. 复位随机序列  → 用例之间的随机数完全独立且可复现
     2. 复位全部 store → 根除「单独跑绿、全量跑红」的状态污染
     3. 清空 localStorage → 存档类测试互不串味
     4. 复位状态机     → 上一条用例打到 shop/over，下一条不该继承

   刻意**不**清空 EventBus：一批模块在 import 时就接线（成就系统、
   存档桥…），在 beforeEach 里 clear() 会把它们一次性拔干净，
   后续用例静默失去这些行为。事件监听的隔离交给 captureEvent()。
   ========================================================= */
import { beforeEach } from 'vitest';
import { seedRng } from './_harness/random.js';
import { clearHostStorage } from './_harness/host.js';
import { resetAllStores } from './_harness/stores.js';
import { sm } from '../engine/core/states.js';

beforeEach(() => {
  seedRng();
  resetAllStores();
  clearHostStorage();
  sm.reset();
});
