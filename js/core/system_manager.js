/* =========================================================
   蚀月远征 · 系统管理器
   注册/调度所有 ECS System
   ========================================================= */
import { System } from './system.js';

export class SystemManager {
  constructor() {
    /** @type {System[]} */
    this._systems = [];
    this._nameMap = {};
  }

  /** 注册系统 */
  add(system) {
    if (!(system instanceof System)) {
      throw new Error(`SystemManager.add: 必须传入 System 实例，收到 ${typeof system}`);
    }
    if (this._nameMap[system.name]) {
      console.warn(`[SystemManager] 系统 "${system.name}" 已注册，跳过`);
      return;
    }
    this._systems.push(system);
    this._nameMap[system.name] = system;
    system.init();
    return system;
  }

  /** 按名称获取系统 */
  get(name) { return this._nameMap[name]; }

  /** 更新所有系统 */
  update(dt) {
    for (const sys of this._systems) sys.update(dt);
  }

  /** 渲染所有系统 */
  render(ctx) {
    for (const sys of this._systems) {
      if (sys.render) sys.render(ctx);
    }
  }

  /** 通知所有系统状态变更 */
  notifyStateChange(from, to) {
    for (const sys of this._systems) {
      if (sys.onStateChange) sys.onStateChange(from, to);
    }
  }

  /** 清除所有系统 */
  clear() {
    this._systems = [];
    this._nameMap = {};
  }
}