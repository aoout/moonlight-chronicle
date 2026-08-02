// @ts-check
/* =========================================================
   蚀月远征 · UI 组件基类
   轻量级组件系统，每个组件 = 类 + render() + 生命周期
   ========================================================= */

/**
 * @template P
 */
export class Component {
  constructor() {
    /** @type {HTMLElement|null} */
    this._el = null;
    /** @type {Record<string, any>} */
    this._props = {};
    /** @type {boolean} */
    this._mounted = false;
  }

  /**
   * 返回 HTML 字符串或 DOM 节点
   * @param {Record<string, any>} [props]
   * @returns {string|HTMLElement|DocumentFragment}
   */
  render(props) {
    return '';
  }

  /**
   * 挂载后调用
   */
  onMount() {}

  /**
   * 销毁前调用
   */
  onDestroy() {}

  /**
   * 更新属性并重新渲染
   * @param {Record<string, any>} props
   */
  update(props) {
    Object.assign(this._props, props);
    if (this._el && this._mounted) {
      const container = this._el.parentElement;
      if (container) {
        const newEl = this.render(this._props);
        if (typeof newEl === 'string') {
          this._el.innerHTML = newEl;
        } else if (newEl instanceof Node) {
          container.replaceChild(newEl, this._el);
          this._el = /** @type {HTMLElement} */ (newEl);
        }
      }
    }
  }

  /**
   * @param {Record<string, any>} [props]
   * @returns {HTMLElement}
   */
  mount(props) {
    if (props) Object.assign(this._props, props);
    const result = this.render(this._props);
    if (typeof result === 'string') {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = result;
      this._el = /** @type {HTMLElement} */ (wrapper.firstElementChild || wrapper);
    } else if (result instanceof Node) {
      this._el = /** @type {HTMLElement} */ (result);
    } else {
      this._el = document.createElement('div');
    }
    this._mounted = true;
    this.onMount();
    return this._el;
  }

  destroy() {
    this.onDestroy();
    if (this._el && this._el.parentElement) {
      this._el.parentElement.removeChild(this._el);
    }
    this._el = null;
    this._mounted = false;
  }

  /** @returns {HTMLElement|null} */
  get el() { return this._el; }
  get mounted() { return this._mounted; }
}