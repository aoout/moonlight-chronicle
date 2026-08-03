/* =========================================================
   蚀月远征 · 事件总线（强类型化）
   解耦游戏逻辑与 UI，模块间通信
   泛型参数 EventMap 由 events.ts 提供，保证事件名与 payload 类型匹配
   ========================================================= */
import type { EventMap } from './events.js';

type EventCallback<T> = (data: T) => void;

export class EventBusClass<M extends Record<string, any>> {
  private _listeners: { [K in keyof M]?: Set<EventCallback<M[K]>> } = {};

  /** 订阅事件，返回取消订阅函数 */
  on<K extends keyof M>(event: K, callback: EventCallback<M[K]>): () => void {
    (this._listeners[event] ||= new Set()).add(callback as any);
    return () => this.off(event, callback);
  }

  /** 取消订阅 */
  off<K extends keyof M>(event: K, callback: EventCallback<M[K]>): void {
    this._listeners[event]?.delete(callback as any);
  }

  /** 发射事件 */
  emit<K extends keyof M>(event: K, data?: M[K]): void {
    const list = this._listeners[event] as Set<EventCallback<M[K]>> | undefined;
    if (!list) return;
    for (const cb of [...list]) {
      try { cb(data as M[K]); } catch (e) { console.error(`[EventBus] ${String(event)} 回调出错:`, e); }
    }
  }

  /** 一次性订阅 */
  once<K extends keyof M>(event: K, callback: EventCallback<M[K]>): void {
    const wrapper: EventCallback<M[K]> = (data) => { this.off(event, wrapper); callback(data); };
    this.on(event, wrapper);
  }

  /** 清除所有订阅 */
  clear(): void {
    this._listeners = {};
  }
}

/** 全局事件总线实例 */
export const EventBus = new EventBusClass<EventMap>();