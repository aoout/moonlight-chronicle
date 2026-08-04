/* =========================================================
   蚀月远征 · 通用提示条组件
   可复用的胶囊形操作提示条：
   - 提供 icon + label 的项目列表
   - 自动定位（右上角 / 右下角等）
   - 支持对称扩展动画
   ========================================================= */

export interface HintBarItem {
  icon: string;          // 图标 SVG/文本
  label: string;         // 文字标签
  onClick?: () => void;  // 可选：点击回调
}

export interface HintBarOptions {
  position?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
    centerOffsetX?: number;  // 距右边界的偏移（用于中轴对称）
  };
  pointerEvents?: 'auto' | 'none';
  className?: string;     // 额外的 CSS 类名
  inline?: boolean;   // true=不作为 fixed 定位，直接作为父元素的子元素（用于 flex 布局）
}

export class HintBar {
  private _el: HTMLElement | null = null;
  private _items: HintBarItem[] = [];
  private _opts: HintBarOptions;

  constructor(opts: HintBarOptions = {}) {
    this._opts = {
      position: { top: '18px', centerOffsetX: 280 },
      pointerEvents: 'none',
      className: '',
      ...opts,
    };
  }

  /** 创建 DOM 元素 */
  mount(parent: HTMLElement = document.body, beforeFirst: boolean = false): void {
    if (this._el) return;

    this._el = document.createElement('div');
    this._el.className = 'hint-bar hidden ' + (this._opts.className || '');
    this._el.style.pointerEvents = this._opts.pointerEvents || 'none';
    if (!this._opts.inline) this._applyPosition();
    if (beforeFirst && parent.firstChild) {
      parent.insertBefore(this._el, parent.firstChild);
    } else {
      parent.appendChild(this._el);
    }
  }

  /** 销毁 */
  destroy(): void {
    if (this._el) {
      this._el.remove();
      this._el = null;
    }
  }

  /** 显示 */
  show(): void {
    if (this._el) this._el.classList.remove('hidden');
  }

  /** 隐藏 */
  hide(): void {
    if (this._el) this._el.classList.add('hidden');
  }

  /** 设置项目并刷新 */
  setItems(items: HintBarItem[]): void {
    this._items = items;
    this._render();
  }

  /** 应用定位 */
  private _applyPosition(): void {
    if (!this._el) return;
    const pos = this._opts.position || {};
    if (pos.top !== undefined) this._el.style.top = pos.top;
    if (pos.right !== undefined) this._el.style.right = pos.right;
    if (pos.bottom !== undefined) this._el.style.bottom = pos.bottom;
    if (pos.left !== undefined) this._el.style.left = pos.left;
  }

  /** 重新定位（中轴对称扩展） */
  private _reposition(): void {
    if (!this._el) return;
    if (this._opts.inline) return;
    const el = this._el;
    const pos = this._opts.position || {};

    // 如果指定了 centerOffsetX，则使用中轴对称扩展算法
    if (pos.centerOffsetX !== undefined) {
      const prevTransition = el.style.transition;
      el.style.transition = 'none';
      el.style.width = 'auto';
      const targetW = el.offsetWidth;
      const centerX = window.innerWidth - pos.centerOffsetX;
      el.style.left = (centerX - targetW / 2) + 'px';
      el.style.right = 'auto';
      void el.offsetWidth;
      el.style.transition = prevTransition;
      el.style.width = targetW + 'px';
    }
  }

  /** 渲染项目 */
  private _render(): void {
    if (!this._el) return;

    const parts: string[] = [];
    this._items.forEach((it, i) => {
      if (i > 0) parts.push('<span class="hb-sep"></span>');
      const clickable = it.onClick ? 'hb-clickable' : '';
      parts.push(
        '<span class="hb-item ' + clickable + '" data-idx="' + i + '">' +
          '<span class="hb-btn">' + it.icon + '</span>' +
          '<span class="hb-label">' + it.label + '</span>' +
        '</span>',
      );
    });
    this._el.innerHTML = parts.join('');

    // 绑定点击事件
    if (this._opts.pointerEvents === 'auto') {
      this._el.querySelectorAll('.hb-clickable').forEach((el, i) => {
        const item = this._items[+(el as HTMLElement).dataset.idx!];
        if (item?.onClick) {
          (el as HTMLElement).addEventListener('click', (e) => {
            e.stopPropagation();
            item.onClick!();
          });
        }
      });
    }

    this._reposition();
  }
}
