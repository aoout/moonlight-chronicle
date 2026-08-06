/* =========================================================
   蚀月远征 · UI 层事件桥接
   订阅领域层发出的 UI 事件，桥接到 UI 层函数
   ========================================================= */
import { EventBus } from '../../engine/core/event_bus.js';
import { spawnText, addDmgNumber } from './hud_utils.js';
import { AudioEngine } from '../../platform/audio/engine.js';

/** 注册所有 UI 事件订阅 */
export function initUIEventBridge(): void {
  EventBus.on('ui:spawnText', (data) => {
    spawnText(data.x, data.y, data.text, data.color);
  });

  EventBus.on('ui:dmgNumber', (data) => {
    addDmgNumber(data.x, data.y, data.n, data.crit);
  });

  EventBus.on('audio:sfx', (data) => {
    AudioEngine.playSfx(data.name);
  });
}