/* =========================================================
   蚀月远征 · 渲染层事件桥接
   订阅领域层发出的视觉特效事件，桥接到渲染层函数
   ========================================================= */
import { EventBus } from '../core/event_bus.js';
import { spawnBurst, spawnRing, spawnHitFx, spawnSpark, spawnStar, spawnShard, spawnStreak, spawnGlow } from './effects/fx.js';

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

  /* 伤害道具专属：方向火花 / 星芒 / 旋转碎片 / 光晕 / 流光 */
  EventBus.on('visual:spark', (data) => {
    spawnSpark(data.x, data.y, data.color, data.count || 6, data.speed || 150);
  });

  EventBus.on('visual:star', (data) => {
    spawnStar(data.x, data.y, data.color, data.size || 10);
  });

  EventBus.on('visual:shard', (data) => {
    spawnShard(data.x, data.y, data.color, data.count || 6, data.speed || 180);
  });

  EventBus.on('visual:glow', (data) => {
    spawnGlow(data.x, data.y, data.size || 14, data.color, data.life || 0.4);
  });

  EventBus.on('visual:streak', (data) => {
    spawnStreak(data.x, data.y, data.ang, data.len, data.w, data.color, data.life);
  });
}
