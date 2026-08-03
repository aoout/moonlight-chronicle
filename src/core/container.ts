/* =========================================================
   蚀月远征 · IoC 容器
   集中管理服务注册与依赖注入，消灭模块单例与惰性初始化 hack
   ========================================================= */

type Factory<T> = () => T;

interface Entry<T> {
  factory: Factory<T>;
  instance?: T;
  singleton: boolean;
}

export class Container {
  private _entries = new Map<string, Entry<any>>();

  register<T>(name: string, factory: Factory<T>, singleton = true): void {
    this._entries.set(name, { factory, singleton });
  }

  resolve<T>(name: string): T {
    const entry = this._entries.get(name);
    if (!entry) throw new Error(`[Container] 未注册服务: "${name}"`);
    if (entry.singleton) {
      if (!entry.instance) entry.instance = entry.factory();
      return entry.instance as T;
    }
    return entry.factory() as T;
  }

  has(name: string): boolean {
    return this._entries.has(name);
  }

  /** 重置单例实例（主要用于测试/热重载） */
  reset(name: string): void {
    const entry = this._entries.get(name);
    if (entry) entry.instance = undefined;
  }

  clear(): void {
    this._entries.clear();
  }
}

/** 全局容器实例 */
export const container = new Container();