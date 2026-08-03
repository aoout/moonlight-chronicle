/* =========================================================
   蚀月远征 · 渲染层事件桥接
   订阅领域层发出的视觉特效事件，桥接到渲染层函数
   ========================================================= */
import { EventBus } from '../core/event_bus.js';
import { spawnBurst, spawnRing, spawnHitFx } from './effects/fx.js';

/** 注册所有视觉特效事件订阅 */
export function initRenderEventBridge(): void {
  EventBus.on('visual:burst', (data) => {
    spawnBurst(data.x, data.y, data.color, data.count);
  });

  EventBus.on('visual:ring', (data) => {
    spawnRing(data.x, data.y, data.color, data.life, data.radius, data.width);
  });

  EventBus.on('visual:hitFx', (data) => {
    spawnHitFx(data.x, data.y, data.dmg, data.crit);
  });
}