// @ts-check
/* =========================================================
   蚀月远征 · 系统管理器（依赖注入容器）
   注册/调度所有 ECS System
   自动注入 World, EventBus, Config 到 System
   ========================================================= */
import { System } from './system.js';
import { EventBus, EventBusClass } from './event_bus.js';
import { world } from '../ecs/World.js';
import { CONFIG } from '../data/index.js';

export class SystemManager {
  constructor() {
    /** @type {System[]} */
    this._systems = [];
    /** @type {Record<string, System>} */
    this._nameMap = {};
    /** 注入的依赖 */
    this._deps = {
      world,
      eventBus: EventBus,
      config: CONFIG,
    };
  }

  /**
   * 初始化 World，绑定实体列表
   * @param {Record<string, any[]>} lists
   */
  initWorld(lists) {
    world.init(lists);
  }

  /**
   * 获取 World 实例
   * @returns {import('../ecs/World.js').World}
   */
  getWorld() { return world; }

  /**
   * 获取 EventBus 实例
   * @returns {EventBusClass}
   */
  getEventBus() { return EventBus; }

  /**
   * 获取配置
   * @returns {object}
   */
  getConfig() { return CONFIG; }

  /**
   * 注册系统（自动注入依赖）
   * @param {typeof System} SystemClass
   * @returns {System}
   */
  add(SystemClass) {
    if (this._nameMap[SystemClass.name]) {
      console.warn(`[SystemManager] 系统 "${SystemClass.name}" 已注册，跳过`);
      return this._nameMap[SystemClass.name];
    }
    const system = new SystemClass(this._deps);
    this._systems.push(system);
    this._nameMap[system.name] = system;
    system.init();
    return system;
  }

  /**
   * 按名称获取系统
   * @param {string} name
   * @returns {System|undefined}
   */
  get(name) { return this._nameMap[name]; }

  /**
   * 更新所有系统
   * @param {number} dt
   */
  update(dt) {
    for (const sys of this._systems) sys.update(dt);
  }

  /**
   * 渲染所有系统
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    for (const sys of this._systems) {
      if (sys.render) sys.render(ctx);
    }
  }

  /**
   * 通知所有系统状态变更
   * @param {string} from
   * @param {string} to
   */
  notifyStateChange(from, to) {
    for (const sys of this._systems) {
      if (sys.onStateChange) sys.onStateChange(from, to);
    }
  }

  /** 清除所有系统（先销毁再清空） */
  clear() {
    for (const sys of this._systems) sys.destroy();
    this._systems = [];
    this._nameMap = {};
  }
}