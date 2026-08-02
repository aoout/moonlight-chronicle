/* =========================================================
   蚀月远征 · 事件总线
   解耦游戏逻辑与 UI，模块间通信
   ========================================================= */

class EventBusClass {
  constructor() {
    this._listeners = {};
  }

  /** 订阅事件 */
  on(event, callback) {
    (this._listeners[event] ||= []).push(callback);
    return () => this.off(event, callback); // 返回取消订阅函数
  }

  /** 取消订阅 */
  off(event, callback) {
    const list = this._listeners[event];
    if (!list) return;
    const i = list.indexOf(callback);
    if (i >= 0) list.splice(i, 1);
  }

  /** 发射事件 */
  emit(event, data) {
    const list = this._listeners[event];
    if (!list) return;
    // 复制一份，防止回调中取消订阅导致遍历错乱
    for (const cb of [...list]) {
      try { cb(data); } catch (e) { console.error(`[EventBus] ${event} 回调出错:`, e); }
    }
  }

  /** 一次性订阅 */
  once(event, callback) {
    const wrapper = (data) => { this.off(event, wrapper); callback(data); };
    this.on(event, wrapper);
  }

  /** 清除所有订阅 */
  clear() {
    this._listeners = {};
  }
}

export const EventBus = new EventBusClass();