// @ts-check
/* =========================================================
   蚀月远征 · System 基类
   所有 ECS System 继承此基类
   支持依赖注入：world, eventBus, config 通过构造函数注入
   ========================================================= */

/**
 * @typedef {import('../ecs/World.js').World} World
 * @typedef {import('./event_bus.js').EventBusClass} EventBusClass
 */

export class System {
  /** 系统唯一标识符 */
  name = 'unnamed';

  /**
   * @param {object} deps
   * @param {World} [deps.world] ECS World 实例
   * @param {EventBusClass} [deps.eventBus] 事件总线
   * @param {object} [deps.config] 游戏配置
   */
  constructor(deps = {}) {
    /** @type {World|undefined} */
    this.world = deps.world;
    /** @type {EventBusClass|undefined} */
    this.eventBus = deps.eventBus;
    /** @type {object|undefined} */
    this.config = deps.config;
  }

  /** 注册时调用，用于初始化 */
  init() {}

  /** 每帧逻辑更新（固定时间步长内调用） */
  /** @param {number} dt */
  update(dt) {}

  /** 每帧渲染（可选，由渲染循环调用） */
  /** @param {CanvasRenderingContext2D} ctx */
  render(ctx) {}

  /** 游戏状态切换时调用（如进入/离开 PLAYING 状态） */
  /** @param {string} from @param {string} to */
  onStateChange(from, to) {}
}