/* =========================================================
   蚀月远征 · 渲染层事件桥接
   订阅领域层发出的视觉特效事件，桥接到渲染层函数
   ========================================================= */
import { EVENTS } from '../../engine/core/events.js';
import { EventBus } from '../../engine/core/event_bus.js';
import { spawnBurst, spawnRing, spawnHitFx, spawnSpark, spawnStar, spawnShard, spawnStreak, spawnGlow } from '../../platform/fx/fx.js';

/** 保存所有取消订阅函数，供 destroyRenderEventBridge 清理 */
let _renderUnsubs: (() => void)[] = [];

/** 注册所有视觉特效事件订阅 */
export function initRenderEventBridge(): void {
  destroyRenderEventBridge();
  _renderUnsubs = [
    EventBus.on(EVENTS.VISUAL_BURST, (data) => {
      spawnBurst(data.x, data.y, data.color, data.count);
    }),
    EventBus.on(EVENTS.VISUAL_RING, (data) => {
      spawnRing(data.x, data.y, data.color, data.life, data.radius, data.width);
    }),
    EventBus.on(EVENTS.VISUAL_HIT_FX, (data) => {
      spawnHitFx(data.x, data.y, data.dmg, data.crit);
    }),
    /* 伤害道具专属：方向火花 / 星芒 / 旋转碎片 / 光晕 / 流光 */
    EventBus.on(EVENTS.VISUAL_SPARK, (data) => {
      spawnSpark(data.x, data.y, data.color, data.count || 6, data.speed || 150);
    }),
    EventBus.on(EVENTS.VISUAL_STAR, (data) => {
      spawnStar(data.x, data.y, data.color, data.size || 10);
    }),
    EventBus.on(EVENTS.VISUAL_SHARD, (data) => {
      spawnShard(data.x, data.y, data.color, data.count || 6, data.speed || 180);
    }),
    EventBus.on(EVENTS.VISUAL_GLOW, (data) => {
      spawnGlow(data.x, data.y, data.size || 14, data.color, data.life || 0.4);
    }),
    EventBus.on(EVENTS.VISUAL_STREAK, (data) => {
      spawnStreak(data.x, data.y, data.ang, data.len, data.w, data.color, data.life);
    }),
  ];
}

/** 销毁所有渲染事件订阅，防止重复累积 */
export function destroyRenderEventBridge(): void {
  for (const unsub of _renderUnsubs) unsub();
  _renderUnsubs = [];
}
