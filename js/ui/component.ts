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
   * 挂载后调用
   */
  onMount(): void {}

  /**
   * 销毁前调用
   */
  onDestroy(): void {}

  /**
   * 更新属性并重新渲染
   */
  update(props: Record<string, any>): void {
    Object.assign(this._props, props);
    if (this._el && this._mounted) {
      const container = this._el.parentElement;
      if (container) {
        const newEl = this.render(this._props);
        if (typeof newEl === 'string') {
          this._el.innerHTML = newEl;
        } else if (newEl instanceof Node) {
          container.replaceChild(newEl, this._el);
          this._el = newEl as HTMLElement;
        }
      }
    }
  }

  mount(props?: Record<string, any>): HTMLElement {
    if (props) Object.assign(this._props, props);
    const result = this.render(this._props);
    if (typeof result === 'string') {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = result;
      this._el = (wrapper.firstElementChild || wrapper) as HTMLElement;
    } else if (result instanceof Node) {
      this._el = result as HTMLElement;
    } else {
      this._el = document.createElement('div');
    }
    this._mounted = true;
    this.onMount();
    return this._el;
  }

  destroy(): void {
    this.onDestroy();
    if (this._el && this._el.parentElement) {
      this._el.parentElement.removeChild(this._el);
    }
    this._el = null;
    this._mounted = false;
  }

  get el(): HTMLElement | null { return this._el; }
  get mounted(): boolean { return this._mounted; }
}
