/* =========================================================
   蚀月远征 · System 基类
   所有 ECS System 继承此基类
   支持依赖注入：world, eventBus, config 通过构造函数注入
   ========================================================= */

import type { World } from '../ecs/World.js';
import type { EventBusClass } from './event_bus.js';

export interface SystemDeps {
  world?: World;
  eventBus?: EventBusClass;
  config?: Record<string, any>;
}

export abstract class System {
  /** 系统唯一标识符 */
  name: string = 'unnamed';

  /** ECS World 实例 */
  world?: World;

  /** 事件总线 */
  eventBus?: EventBusClass;

  /** 游戏配置 */
  config?: Record<string, any>;

  constructor(deps: SystemDeps = {}) {
    this.world = deps.world;
    this.eventBus = deps.eventBus;
    this.config = deps.config;
  }

  /** 注册时调用，用于初始化 */
  init(): void {}

  /** 每帧逻辑更新（固定时间步长内调用） */
  update(dt: number): void {}

  /** 每帧渲染（可选，由渲染循环调用） */
  render(ctx: CanvasRenderingContext2D): void {}

  /** 游戏状态切换时调用（如进入/离开 PLAYING 状态） */
  onStateChange(from: string, to: string): void {}

  /** 系统销毁时调用（清理资源、取消订阅等） */
  destroy(): void {}
}
