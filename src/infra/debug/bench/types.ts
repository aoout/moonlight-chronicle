/* =========================================================
   蚀月远征 · 基准测试：类型定义
   ========================================================= */

/** 单帧采样数据 */
export interface FrameSample {
  /** 帧总耗时（ms），从 RAF 到 render 结束 */
  total: number;
  /** 逻辑更新耗时（ms） */
  update?: number;
  /** 渲染耗时（ms） */
  render: number;
  /** 本帧实际工作耗时（update + render，ms） */
  work?: number;
  /** 各 System 的本帧 update 耗时（ms） */
  systems?: Record<string, number>;
  /** Draw call 数量 */
  drawCalls: number;
  /** 实体数量快照 */
  entities: EntityCounts;
}

/** 实体数量快照 */
export interface EntityCounts {
  enemies: number;
  projectiles: number;
  particles: number;
  drops: number;
  phantoms: number;
}

/** 单场景测试结果 */
export interface BenchResult {
  /** 场景名称 */
  name: string;
  /** 场景模式：fixed=固定负载，simulation=真实模拟 */
  mode?: BenchScenarioMode;
  /** 采样持续时间（秒） */
  duration: number;
  /** 有效采样帧数 */
  frameCount: number;
  /** 帧总耗时统计（ms） */
  total: Stats;
  /** 渲染耗时统计（ms） */
  render: Stats;
  /** 逻辑更新耗时统计（ms） */
  update?: Stats;
  /** 实际工作耗时统计（ms） */
  work?: Stats;
  /** 各 System 的 update 耗时统计（ms） */
  systems?: Record<string, Stats>;
  /** Draw call 统计 */
  drawCalls: Stats;
  /** 实体数量统计 */
  entities: EntityCounts;
  /** 原始帧采样数据（用于深度分析） */
  raw: FrameSample[];
  /** 掉帧数（帧时间 > 33ms 即 < 30fps） */
  droppedFrames: number;
}

/** 统计指标 */
export interface Stats {
  min: number;
  max: number;
  avg: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}

/** 场景定义 */
export type BenchScenarioMode = 'fixed' | 'simulation';

export interface BenchScenario {
  /** 场景唯一标识 */
  id: string;
  /** 显示名称 */
  label: string;
  /** 描述 */
  desc: string;
  /** 场景模式：固定负载用于稳定实体数；真实模拟保留敌人技能/衍生实体 */
  mode?: BenchScenarioMode;
  /** 采样持续时间（秒） */
  duration: number;
  /** 预热时间（秒，不计入采样） */
  warmup: number;
  /** 场景设置函数 */
  setup: () => void;
  /** 场景清理函数 */
  teardown: () => void;
}

/** 完整基准测试报告 */
export interface BenchReport {
  /** 时间戳 */
  timestamp: number;
  /** 标签（如 "优化前 v1.0"） */
  label: string;
  /** 各场景结果 */
  results: BenchResult[];
  /** 运行环境信息 */
  env: EnvInfo;
}

/** 环境信息 */
export interface EnvInfo {
  userAgent: string;
  canvasSize: string;
  devicePixelRatio: number;
  settings: string;
}

/** 两次报告的对比 */
export interface BenchComparison {
  baseline: BenchReport;
  current: BenchReport;
  deltas: DeltaRow[];
}

export interface DeltaRow {
  scenario: string;
  /** 各项指标的变化百分比（正数 = 变好，负数 = 变差） */
  totalAvg: number | null;
  totalP95: number | null;
  renderAvg: number | null;
  renderP95: number | null;
  droppedFramesDelta: number | null;
}
