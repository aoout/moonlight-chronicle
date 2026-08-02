/* =========================================================
   蚀月远征 · 事件总线
   解耦游戏逻辑与 UI，模块间通信
   ========================================================= */

type EventCallback = (data: any) => void;

export class EventBusClass {
  private _listeners: Record<string, EventCallback[]> = {};

  /** 订阅事件 */
  on(event: string, callback: EventCallback): () => void {
    (this._listeners[event] ||= []).push(callback);
    return () => this.off(event, callback);
  }

  /** 取消订阅 */
  off(event: string, callback: EventCallback): void {
    const list = this._listeners[event];
    if (!list) return;
    const i = list.indexOf(callback);
    if (i >= 0) list.splice(i, 1);
  }

  /** 发射事件 */
  emit(event: string, data?: any): void {
    const list = this._listeners[event];
    if (!list) return;
    for (const cb of [...list]) {
      try { cb(data); } catch (e) { console.error(`[EventBus] ${event} 回调出错:`, e); }
    }
  }

  /** 一次性订阅 */
  once(event: string, callback: EventCallback): void {
    const wrapper: EventCallback = (data) => { this.off(event, wrapper); callback(data); };
    this.on(event, wrapper);
  }

  /** 清除所有订阅 */
  clear(): void {
    this._listeners = {};
  }
}

export const EventBus = new EventBusClass();
