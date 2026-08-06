/* =========================================================
   蚀月远征 · 离屏 Canvas 缓存工具
   用预渲染替代重复 Canvas 2D 绘图调用，大幅减少 draw call
   无 DOM 环境（测试/SSR）自动降级为 noop 画布，渲染管线不崩溃
   ========================================================= */

/** 无 DOM 环境的降级画布：方法全部 noop，仅保证管线可运行 */
function createFallbackCanvas(width: number, height: number): HTMLCanvasElement {
  const noop = () => {};
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, k) => {
      // 渐变工厂需返回带 addColorStop 的对象，否则调用方在渐变上调用会崩
      if (k === 'createRadialGradient' || k === 'createLinearGradient') {
        return () => ({ addColorStop: noop });
      }
      return noop;
    },
    set: () => true,
  });
  return { width, height, getContext: () => ctx } as unknown as HTMLCanvasElement;
}

export class ShapeCache {
  private _cache = new Map<string, HTMLCanvasElement>();

  /**
   * 获取或创建缓存条目
   * @param key      缓存键
   * @param width    画布宽
   * @param height   画布高
   * @param draw     绘制函数（仅在缓存未命中时调用）
   * @returns        缓存画布
   */
  get(
    key: string,
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): HTMLCanvasElement {
    let canvas = this._cache.get(key);
    if (!canvas || canvas.width !== width || canvas.height !== height) {
      canvas = typeof document !== 'undefined'
        ? document.createElement('canvas')
        : createFallbackCanvas(width, height);
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      draw(ctx);
      this._cache.set(key, canvas);
    }
    return canvas;
  }

  /**
   * 强制刷新缓存（用于周期性更新的场景，如敌人动画）
   */
  refresh(
    key: string,
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): HTMLCanvasElement {
    let canvas = this._cache.get(key);
    if (!canvas) {
      canvas = typeof document !== 'undefined'
        ? document.createElement('canvas')
        : createFallbackCanvas(width, height);
      this._cache.set(key, canvas);
    }
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    draw(ctx);
    return canvas;
  }

  /** 清除所有缓存 */
  clear(): void {
    this._cache.clear();
  }

  /** 删除指定键 */
  delete(key: string): void {
    this._cache.delete(key);
  }

  /** 当前缓存条目数 */
  get size(): number {
    return this._cache.size;
  }
}

/** 全局单例 */
export const shapeCache = new ShapeCache();