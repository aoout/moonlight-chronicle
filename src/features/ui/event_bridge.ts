/* =========================================================
   蚀月远征 · UI 层事件桥接
   订阅领域层发出的 UI 事件，桥接到 UI 层函数
   ========================================================= */
import { EVENTS } from '../../engine/core/events.js';
import { EventBus } from '../../engine/core/event_bus.js';
import { spawnText, addDmgNumber } from './hud_utils.js';
import { AudioEngine } from '../../platform/audio/engine.js';

/** 保存所有取消订阅函数，供 destroyUIEventBridge 清理 */
let _uiUnsubs: (() => void)[] = [];

/** 注册所有 UI 事件订阅 */
export function initUIEventBridge(): void {
  destroyUIEventBridge();
  _uiUnsubs = [
    EventBus.on(EVENTS.UI_SPAWN_TEXT, (data) => {
      spawnText(data.x, data.y, data.text, data.color);
    }),
    EventBus.on(EVENTS.UI_DMG_NUMBER, (data) => {
      addDmgNumber(data.x, data.y, data.n, data.crit);
    }),
    EventBus.on(EVENTS.AUDIO_SFX, (data) => {
      AudioEngine.playSfx(data.name);
    }),
  ];
}

/** 销毁所有 UI 事件订阅，防止重复累积 */
export function destroyUIEventBridge(): void {
  for (const unsub of _uiUnsubs) unsub();
  _uiUnsubs = [];
}