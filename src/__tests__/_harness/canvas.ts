/* =========================================================
   测试地基 · 录制型 Canvas 2D 替身
   =========================================================

   相比原先散落在各测试文件里的 Proxy mock，这里多做两件事：

   1. 校验数值参数有限性。
      `ctx.arc(NaN, 0, 5, ...)` 在真实 canvas 上不抛错、不报警、什么都不画。
      这是渲染层最难查的一类 bug —— 画面少了一块，控制台干干净净。
      冒烟测试只断言「没抛异常」是抓不到的，必须主动拦。

   2. 录制调用序列与入参。
      让测试可以断言「画了什么」而不只是「没崩」。
   ========================================================= */

export interface DrawCall {
  name: string;
  args: unknown[];
}

export interface CanvasRecorder {
  /** 传给绘制函数的 ctx 替身 */
  readonly ctx: CanvasRenderingContext2D;
  /** 按调用顺序记录的全部绘制操作 */
  readonly calls: readonly DrawCall[];
  /** 调用过的方法名序列 */
  ops(): string[];
  /** 取某个方法的全部入参列表 */
  argsOf(name: string): unknown[][];
  /** 某个方法被调用了几次 */
  count(name: string): number;
  /** 是否调用过某方法 */
  called(name: string): boolean;
  /** 被写入过的属性（fillStyle / lineWidth / globalAlpha ...） */
  props(): Record<string, unknown[]>;
  /** 清空录制，复用同一个 ctx */
  clear(): void;
}

/** 半径类参数必须非负的方法：参数下标 → 说明 */
const RADIUS_ARGS: Record<string, number[]> = {
  arc: [2],
  arcTo: [4],
  ellipse: [2, 3],
  roundRect: [4],
  createRadialGradient: [2, 5],
};

/** 这些方法的入参允许非有限值（不参与绘制几何） */
const SKIP_FINITE_CHECK = new Set(['setLineDash', 'putImageData']);

function checkArgs(name: string, args: unknown[]): void {
  if (!SKIP_FINITE_CHECK.has(name)) {
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (typeof a === 'number' && !Number.isFinite(a)) {
        throw new Error(
          `ctx.${name}() 第 ${i} 个参数为 ${a}（非有限数值）。` +
            `真实 canvas 会静默跳过这次绘制，画面缺块但无任何报错。`,
        );
      }
    }
  }
  const radiusIdx = RADIUS_ARGS[name];
  if (radiusIdx) {
    for (const i of radiusIdx) {
      const r = args[i];
      if (typeof r === 'number' && r < 0) {
        throw new Error(`ctx.${name}() 第 ${i} 个参数是负半径 ${r}，真实 canvas 会抛 IndexSizeError。`);
      }
    }
  }
}

const GRADIENT_FACTORIES = new Set(['createRadialGradient', 'createLinearGradient', 'createConicGradient']);
const PATTERN_FACTORIES = new Set(['createPattern']);
const MEASURE = new Set(['measureText']);

/**
 * 创建一个录制型 ctx 替身。
 *
 * @param strict 默认 true：对非有限数值与负半径抛错。
 *               置 false 时只录制不校验（用于确实允许异常值的边界测试）。
 */
export function createCanvasRecorder(strict = true): CanvasRecorder {
  let calls: DrawCall[] = [];
  const propWrites: Record<string, unknown[]> = {};

  const ctx = new Proxy({} as Record<string | symbol, unknown>, {
    get(_t, key) {
      if (typeof key === 'symbol') return undefined;
      const name = String(key);

      // 画布尺寸等只读属性
      if (name === 'canvas') return { width: 1280, height: 720 };

      if (GRADIENT_FACTORIES.has(name)) {
        return (...args: unknown[]) => {
          if (strict) checkArgs(name, args);
          calls.push({ name, args });
          return { addColorStop() {} };
        };
      }
      if (PATTERN_FACTORIES.has(name)) {
        return (...args: unknown[]) => {
          calls.push({ name, args });
          return null;
        };
      }
      if (MEASURE.has(name)) {
        return (...args: unknown[]) => {
          calls.push({ name, args });
          return { width: 10, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 };
        };
      }
      if (name === 'getImageData') {
        return (...args: unknown[]) => {
          calls.push({ name, args });
          return { data: new Uint8ClampedArray(4), width: 1, height: 1 };
        };
      }
      if (name === 'isPointInPath' || name === 'isPointInStroke') {
        return (...args: unknown[]) => {
          calls.push({ name, args });
          return false;
        };
      }

      return (...args: unknown[]) => {
        if (strict) checkArgs(name, args);
        calls.push({ name, args });
        return undefined;
      };
    },
    set(_t, key, value) {
      const name = String(key);
      (propWrites[name] ??= []).push(value);
      if (strict && typeof value === 'number' && !Number.isFinite(value)) {
        throw new Error(`ctx.${name} 被赋值为 ${value}（非有限数值），会导致后续绘制静默失效。`);
      }
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  return {
    ctx,
    get calls() {
      return calls;
    },
    ops: () => calls.map((c) => c.name),
    argsOf: (name) => calls.filter((c) => c.name === name).map((c) => c.args),
    count: (name) => calls.reduce((n, c) => n + (c.name === name ? 1 : 0), 0),
    called: (name) => calls.some((c) => c.name === name),
    props: () => propWrites,
    clear: () => {
      calls = [];
      for (const k of Object.keys(propWrites)) delete propWrites[k];
    },
  };
}
