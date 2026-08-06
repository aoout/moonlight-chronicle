/* =========================================================
   蚀月远征 · 系统管理器（依赖注入容器）
   注册/调度所有 ECS System
   自动注入 World, EventBus, Config 到 System
   ========================================================= */
import { System, type SystemDeps } from './system.js';
import { EventBus, type EventBusClass } from './event_bus.js';
import { world, type World } from '../ecs/World.js';
import { profiler } from './profiler_port.js';

export class SystemManager {
  private _systems: System[] = [];
  private _nameMap: Record<string, System> = {};
  private _deps: SystemDeps;

  /** config 由调用方（systems 层）注入，引擎不感知具体游戏配置 */
  constructor(config: Record<string, any> = {}) {
    this._deps = {
      world,
      eventBus: EventBus,
      config,
    };
  }

  initWorld(lists: Record<string, any[]>): void {
    world.init(lists);
  }

  getWorld(): World { return world; }

  getEventBus(): EventBusClass<any> { return EventBus; }

  getConfig(): Record<string, any> { return this._deps.config ?? {}; }

  add(SystemClass: new (deps: SystemDeps) => System): System {
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

  get(name: string): System | undefined { return this._nameMap[name]; }

  update(dt: number): void {
    const prof = profiler();
    prof.resetFrame();
    for (const sys of this._systems) {
      prof.begin(sys.name);
      try {
        sys.update(dt);
      } finally {
        prof.end();
      }
    }
    prof.finishFrame();
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const sys of this._systems) {
      if (sys.render) sys.render(ctx);
    }
  }

  notifyStateChange(from: string, to: string): void {
    for (const sys of this._systems) {
      if (sys.onStateChange) sys.onStateChange(from, to);
    }
  }

  clear(): void {
    for (const sys of this._systems) sys.destroy();
    this._systems = [];
    this._nameMap = {};
  }
}
