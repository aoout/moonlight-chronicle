/* =========================================================
   蚀月远征 · 组件注册表
   管理组件实例化、挂载、卸载
   ========================================================= */
import { Component } from './component.js';

const _instances: Map<string, Component<any>> = new Map();

/**
 * 挂载组件到容器
 */
export function mount(id: string, comp: Component<any>, container: string | HTMLElement, props?: Record<string, any>): Component<any> {
  // 先卸载已存在的同名组件
  if (_instances.has(id)) {
    unmount(id);
  }
  const el = typeof container === 'string'
    ? document.querySelector(container)
    : container;
  if (!el) {
    console.warn(`[registry] mount target not found: ${container}`);
    return comp;
  }
  const dom = comp.mount(props);
  el.appendChild(dom);
  _instances.set(id, comp);
  return comp;
}

/**
 * 卸载组件
 */
export function unmount(id: string): void {
  const comp = _instances.get(id);
  if (comp) {
    comp.destroy();
    _instances.delete(id);
  }
}

/**
 * 获取已挂载的组件
 */
export function get(id: string): Component<any> | undefined {
  return _instances.get(id);
}

/**
 * 卸载所有组件
 */
export function unmountAll(): void {
  for (const [id] of _instances) {
    unmount(id);
  }
}
