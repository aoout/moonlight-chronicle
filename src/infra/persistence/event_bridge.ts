/* =========================================================
   蚀月远征 · 持久化事件桥
   领域层只广播"发生了什么"，由本桥决定"要不要落盘"。
   domain 因此不再依赖 infra/persistence。
   ========================================================= */
import { EVENTS } from '../../engine/core/events.js';
import { EventBus } from '../../engine/core/event_bus.js';
import { persistUnlocked } from './save.js';

/** 保存取消订阅函数，供 destroyPersistenceBridge 清理 */
let _persistUnsub: (() => void) | null = null;

/** 注册持久化相关的事件订阅（在 main.ts 启动时调用一次） */
export function initPersistenceBridge(): void {
  destroyPersistenceBridge();
  _persistUnsub = EventBus.on(EVENTS.PROGRESS_UNLOCKED, () => {
    persistUnlocked();
  });
}

/** 销毁持久化事件订阅，防止重复累积 */
export function destroyPersistenceBridge(): void {
  if (_persistUnsub) { _persistUnsub(); _persistUnsub = null; }
}
