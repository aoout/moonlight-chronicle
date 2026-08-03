/* =========================================================
   蚀月远征 · 依赖注入注册
   集中注册所有 Container 服务，惰性工厂避免循环依赖
   ========================================================= */
import { container } from './container.js';
import { world } from '../ecs/World.js';
import { EventBus } from './event_bus.js';
import { CONFIG } from '../data/index.js';
import { createSystemManager } from '../systems/index.js';
import { entityState } from '../state/entities.js';

// 注册前执行一次仅用于触发模块加载，lamda 闭包捕获引用
// 工厂函数惰性执行，避免 import 时的 TDZ

container.register('world', () => world);
container.register('eventBus', () => EventBus);
container.register('config', () => CONFIG);

/** SystemManager：惰性创建，等效于 game.ts 原 getSysMan() */
container.register('sysMan', () => {
  const sm = createSystemManager();
  sm.initWorld(entityState.state as any);
  return sm;
});