/* =========================================================
   蚀月远征 · Headless 压测：宿主替身
   ---------------------------------------------------------
   在 Node 中重建游戏运行所需的最小浏览器面：
     localStorage / performance / document.createElement('canvas')

   刻意不引 jsdom：
     1) jsdom 的 canvas 是 noop，测不出任何东西，还拖慢启动；
     2) 我们要的不是"像浏览器"，而是"能精确计数"。
   这里的 ctx 替身会统计每一次绘制调用与状态写入，
   于是 draw call 结构本身成为可回归的指标。
   ========================================================= */

/** 绘制统计。所有 ctx 替身共享同一个计数器实例。 */
export function createDrawStats() {
  return {
    /** 全部 ctx 方法调用 + 属性写入次数 */
    ops: 0,
    /** 实际产生像素的绘制调用（fill/stroke/drawImage/fillRect...） */
    paints: 0,
    /** shadowBlur 被设为非 0 的次数 —— Canvas2D 最贵的状态之一 */
    shadowBlur: 0,
    /** 渐变对象创建次数 —— 每帧新建渐变是常见的隐性开销 */
    gradients: 0,
    /** 离屏画布 backing store 重新分配次数（canvas.width = N） */
    canvasRealloc: 0,
    /** 新建离屏画布数量 */
    canvasCreated: 0,
    /** save/restore 配对次数 */
    saves: 0,
    reset() {
      this.ops = 0; this.paints = 0; this.shadowBlur = 0;
      this.gradients = 0; this.canvasRealloc = 0;
      this.canvasCreated = 0; this.saves = 0;
    },
    snapshot() {
      return {
        ops: this.ops, paints: this.paints, shadowBlur: this.shadowBlur,
        gradients: this.gradients, canvasRealloc: this.canvasRealloc,
        canvasCreated: this.canvasCreated, saves: this.saves,
      };
    },
  };
}

/** 会产生像素的绘制方法 */
const PAINT_OPS = new Set([
  'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect',
  'drawImage', 'fillText', 'strokeText', 'putImageData',
]);

const GRADIENT_FACTORIES = new Set([
  'createRadialGradient', 'createLinearGradient', 'createConicGradient',
]);

const FAKE_GRADIENT = { addColorStop() {} };

/**
 * 创建计数型 CanvasRenderingContext2D 替身。
 *
 * 用 Proxy 而非逐方法定义：渲染层用到的 API 面很宽（含 roundRect、
 * ellipse、setLineDash 等），漏一个就是运行时崩溃，而崩溃会伪装成
 * "性能测试跑不起来"。Proxy 保证任何方法都有兜底。
 */
export function createCountingCtx(stats, canvasRef) {
  const methodCache = Object.create(null);

  return new Proxy(Object.create(null), {
    get(_t, key) {
      if (typeof key === 'symbol') return undefined;
      const name = key;

      if (name === 'canvas') return canvasRef || { width: 1280, height: 720 };

      const cached = methodCache[name];
      if (cached) return cached;

      let fn;
      if (GRADIENT_FACTORIES.has(name)) {
        fn = () => { stats.ops++; stats.gradients++; return FAKE_GRADIENT; };
      } else if (name === 'createPattern') {
        fn = () => { stats.ops++; return null; };
      } else if (name === 'measureText') {
        fn = () => {
          stats.ops++;
          return { width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 };
        };
      } else if (name === 'getImageData') {
        fn = () => {
          stats.ops++;
          return { data: new Uint8ClampedArray(4), width: 1, height: 1 };
        };
      } else if (name === 'isPointInPath' || name === 'isPointInStroke') {
        fn = () => { stats.ops++; return false; };
      } else if (name === 'save') {
        fn = () => { stats.ops++; stats.saves++; };
      } else if (PAINT_OPS.has(name)) {
        fn = () => { stats.ops++; stats.paints++; };
      } else {
        fn = () => { stats.ops++; };
      }
      methodCache[name] = fn;
      return fn;
    },
    set(_t, key, value) {
      stats.ops++;
      if (key === 'shadowBlur' && value > 0) stats.shadowBlur++;
      return true;
    },
  });
}

/** 创建计数型离屏画布替身 */
function createOffscreenCanvas(stats) {
  stats.canvasCreated++;
  let ctx = null;
  const canvas = {
    _w: 300,
    _h: 150,
    style: {},
    get width() { return this._w; },
    set width(v) {
      // 真实浏览器里给 canvas.width 赋值会重新分配 backing store 并清空画布，
      // 是离屏缓存里最贵的单步操作。这里单独计数，让它无所遁形。
      stats.canvasRealloc++;
      this._w = v;
    },
    get height() { return this._h; },
    set height(v) { this._h = v; },
    getContext() {
      if (!ctx) ctx = createCountingCtx(stats, canvas);
      return ctx;
    },
  };
  return canvas;
}

/** 内存版 localStorage */
function createMemoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

/* ---------- 确定性随机源 ----------
   游戏里 `export const RNG = Math.random`：这是模块求值时抓取的引用，
   之后再替换 Math.random 已经晚了。所以必须在 Vite 加载任何游戏模块
   **之前**换掉它 —— 换到位之后，整局模拟（暴击、掉落、生成抖动）
   都变成可复现的，两次跑分才真的在比同一件事。 */
function seededRandom(seed) {
  let a = seed >>> 0;
  const fn = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  fn.reseed = (s) => { a = s >>> 0; };
  return fn;
}

const RNG_SEED = 0xc0ffee;

/**
 * 安装宿主替身到 globalThis。幂等。
 * @returns {{stats, mainCtx, bgCtx, mainCanvas, bgCanvas, resetRandom: () => void}}
 */
export function installHost() {
  const stats = createDrawStats();

  const rng = seededRandom(RNG_SEED);
  Math.random = rng;

  globalThis.localStorage ??= createMemoryStorage();

  globalThis.document ??= {
    createElement(tag) {
      if (tag === 'canvas') return createOffscreenCanvas(stats);
      return { style: {}, appendChild() {}, setAttribute() {}, addEventListener() {} };
    },
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
    body: { appendChild() {} },
  };

  const mainCanvas = { width: 1280, height: 720, style: {} };
  const bgCanvas = { width: 1280, height: 720, style: {} };
  const mainCtx = createCountingCtx(stats, mainCanvas);
  const bgCtx = createCountingCtx(stats, bgCanvas);
  mainCanvas.getContext = () => mainCtx;
  bgCanvas.getContext = () => bgCtx;

  return {
    stats, mainCtx, bgCtx, mainCanvas, bgCanvas,
    resetRandom: () => rng.reseed(RNG_SEED),
  };
}
