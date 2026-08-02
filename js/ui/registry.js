// @ts-check
/* =========================================================
   蚀月远征 · 组件注册表
   管理组件实例化、挂载、卸载
   ========================================================= */
import { Component } from './component.js';

/** @type {Map<string, Component<any>>} */
const _instances = new Map();

/**
 * 挂载组件到容器
 * @param {string} id  组件唯一标识
 * @param {Component<any>} comp  组件实例
 * @param {string|HTMLElement} container  目标容器（CSS selector 或元素）
 * @param {Record<string, any>} [props]
 * @returns {Component<any>}
 */
export function mount(id, comp, container, props) {
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
 * @param {string} id
 */
export function unmount(id) {
  const comp = _instances.get(id);
  if (comp) {
    comp.destroy();
    _instances.delete(id);
  }
}

/**
 * 获取已挂载的组件
 * @param {string} id
 * @returns {Component<any>|undefined}
 */
export function get(id) {
  return _instances.get(id);
}

/**
 * 卸载所有组件
 */
export function unmountAll() {
  for (const [id] of _instances) {
    unmount(id);
  }
}