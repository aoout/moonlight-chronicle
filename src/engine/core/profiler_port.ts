/* =========================================================
   蚀月远征 · 性能剖析端口（依赖倒置）
   engine 层只声明"需要什么"，不知道具体实现。
   真正的 profiler 由 infra/debug 在启动时注册进来；
   未注册时使用零开销的空实现，引擎因此不依赖 infra。
   ========================================================= */

export interface FrameProfiler {
  resetFrame(): void;
  begin(label: string): void;
  end(): void;
  finishFrame(): void;
}

const NOOP_PROFILER: FrameProfiler = {
  resetFrame() {},
  begin() {},
  end() {},
  finishFrame() {},
};

let active: FrameProfiler = NOOP_PROFILER;

/** 由 infra/debug 注册真实实现；传 null 可恢复空实现 */
export function setFrameProfiler(p: FrameProfiler | null): void {
  active = p || NOOP_PROFILER;
}

/** 引擎内部使用的剖析入口 */
export function profiler(): FrameProfiler {
  return active;
}
