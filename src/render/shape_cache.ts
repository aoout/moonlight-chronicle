/* =========================================================
   蚀月远征 · 离屏 Canvas 缓存工具
   用预渲染替代重复 Canvas 2D 绘图调用，大幅减少 draw call
   ========================================================= */

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
      canvas = document.createElement('canvas');
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
      canvas = document.createElement('canvas');
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