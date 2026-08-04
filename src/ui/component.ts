/* =========================================================
   蚀月远征 · UI 组件基类
   轻量级组件系统，每个组件 = 类 + render() + 生命周期
   ========================================================= */

export class Component<P = any> {
  _el: HTMLElement | null;
  _props: Record<string, any>;
  _mounted: boolean;

  constructor() {
    this._el = null;
    this._props = {};
    this._mounted = false;
  }

  /**
   * 返回 HTML 字符串或 DOM 节点
   */
  render(props?: Record<string, any>): string | HTMLElement | DocumentFragment {
    return '';
  }

  /**
   * 挂载到 DOM
   */
  mount(container: string | HTMLElement, props?: Record<string, any>): void {
    this._props = props || {};
    const output = this.render(this._props);
    const parent = typeof container === 'string' ? document.querySelector(container) : container;
    if (!parent) return;
    if (typeof output === 'string') {
      parent.innerHTML = output;
    } else {
      parent.appendChild(output);
    }
    this._el = parent as HTMLElement;
    this._mounted = true;
    this.onMount();
  }

  /**
   * 卸载
   */
  unmount(): void {
    if (this._el) {
      this._el.innerHTML = '';
      this._el = null;
    }
    this._mounted = false;
    this.onUnmount();
  }

  /** 挂载后钩子 */
  onMount(): void {}

  /** 卸载后钩子 */
  onUnmount(): void {}

  /** 更新属性并重新渲染 */
  setProps(props: Record<string, any>): void {
    this._props = { ...this._props, ...props };
    if (this._mounted && this._el) {
      const output = this.render(this._props);
      if (typeof output === 'string') {
        this._el.innerHTML = output;
      }
    }
  }
}