/* =========================================================
   蚀月远征 · 基准测试：运行器
   接管渲染循环，逐帧采样，计算统计指标
   ========================================================= */
import type { BenchScenario, BenchResult, FrameSample, Stats, EntityCounts } from './types.js';
import { computeStats } from './stats.js';
import { eSt } from '../../state/accessors.js';
import { render } from '../../render/index.js';
import { setBenchActive } from './state.js';

/** 运行器状态 */
export type BenchState = 'idle' | 'warmup' | 'sampling' | 'done';

export class BenchRunner {
  _state: BenchState = 'idle';
  _scenario: BenchScenario | null = null;
  _results: BenchResult[] = [];
  _samples: FrameSample[] = [];
  _phaseStart: number = 0;
  _lastFrame: number = 0;
  _rafId: number = 0;
  _running: boolean = false;
  _onComplete: ((results: BenchResult[]) => void) | null = null;
  _onProgress: ((scenario: string, progress: number) => void) | null = null;
  _scenarioIndex: number = 0;
  _scenarios: BenchScenario[] = [];
  _canceled: boolean = false;

  /** 计算统计指标（委托到纯函数） */
  static computeStats(samples: number[]): Stats {
    return computeStats(samples);
  }

  /** 获取当前实体数量快照 */
  static getEntityCounts(): EntityCounts {
    const es = eSt();
    return {
      enemies: es.enemies.length,
      projectiles: es.projectiles.length,
      particles: es.particles.length,
      drops: es.drops.length,
      phantoms: es.phantoms.length,
    };
  }

  /** 运行所有场景 */
  runAll(
    scenarios: BenchScenario[],
    onComplete?: (results: BenchResult[]) => void,
    onProgress?: (scenario: string, progress: number) => void,
  ): void {
    if (this._running) return;
    this._scenarios = scenarios;
    this._scenarioIndex = 0;
    this._results = [];
    this._onComplete = onComplete || null;
    this._onProgress = onProgress || null;
    this._canceled = false;
    this._running = true;

    // 通知 game.ts 暂停正常渲染
    setBenchActive(true);

    this._startNextScenario();
  }

  /** 开始下一个场景 */
  private _startNextScenario(): void {
    if (this._canceled || this._scenarioIndex >= this._scenarios.length) {
      this._finish();
      return;
    }

    this._scenario = this._scenarios[this._scenarioIndex];
    this._samples = [];
    this._state = 'warmup';

    // 设置场景
    this._scenario.setup();

    // 启动独立 RAF 循环
    this._phaseStart = performance.now();
    this._lastFrame = this._phaseStart;
    this._rafId = requestAnimationFrame(this._frame.bind(this));
  }

  /** 单帧处理 */
  private _frame(ts: number): void {
    if (!this._running || !this._scenario) return;

    const frameDt = ts - this._lastFrame;
    this._lastFrame = ts;
    const elapsed = ts - this._phaseStart;

    // 当前阶段应持续多长时间
    const phaseDuration = this._state === 'warmup'
      ? this._scenario.warmup * 1000
      : this._scenario.duration * 1000;

    // 阶段切换
    if (elapsed >= phaseDuration) {
      if (this._state === 'warmup') {
        // 预热结束 → 进入采样
        this._state = 'sampling';
        this._phaseStart = ts;
        this._rafId = requestAnimationFrame(this._frame.bind(this));
        return;
      } else {
        // 采样结束 → 记录结果 → 下一个场景
        this._recordResult();
        this._scenario.teardown();
        this._scenarioIndex++;
        this._startNextScenario();
        return;
      }
    }

    // 渲染并采样
    const renderStart = performance.now();
    render();
    const renderEnd = performance.now();

    if (this._state === 'sampling') {
      this._samples.push({
        total: frameDt,
        render: renderEnd - renderStart,
        drawCalls: 0,
        entities: BenchRunner.getEntityCounts(),
      });

      if (this._onProgress && this._scenario) {
        this._onProgress(this._scenario.label, elapsed / phaseDuration);
      }
    } else if (this._onProgress && this._scenario) {
      this._onProgress(this._scenario.label, elapsed / phaseDuration);
    }

    this._rafId = requestAnimationFrame(this._frame.bind(this));
  }

  /** 记录当前场景结果 */
  private _recordResult(): void {
    if (!this._scenario) return;

    const totalTimes = this._samples.map(s => s.total);
    const renderTimes = this._samples.map(s => s.render);
    const drawCalls = this._samples.map(s => s.drawCalls);

    const droppedFrames = totalTimes.filter(t => t > 33).length;

    // 平均实体数量
    const avgEntities = this._samples.reduce(
      (acc, s) => {
        acc.enemies += s.entities.enemies;
        acc.projectiles += s.entities.projectiles;
        acc.particles += s.entities.particles;
        acc.drops += s.entities.drops;
        acc.phantoms += s.entities.phantoms;
        return acc;
      },
      { enemies: 0, projectiles: 0, particles: 0, drops: 0, phantoms: 0 },
    );
    const n = this._samples.length || 1;
    for (const key of Object.keys(avgEntities) as (keyof EntityCounts)[]) {
      avgEntities[key] = Math.round(avgEntities[key] / n);
    }

    this._results.push({
      name: this._scenario.label,
      duration: this._scenario.duration,
      frameCount: this._samples.length,
      total: BenchRunner.computeStats(totalTimes),
      render: BenchRunner.computeStats(renderTimes),
      drawCalls: BenchRunner.computeStats(drawCalls),
      entities: avgEntities,
      raw: this._samples,
      droppedFrames,
    });
  }

  /** 完成所有测试 */
  private _finish(): void {
    this._running = false;
    this._state = 'done';
    setBenchActive(false);

    if (this._onComplete) {
      this._onComplete(this._results);
    }
  }

  /** 取消运行 */
  cancel(): void {
    if (!this._running) return;
    this._canceled = true;
    this._running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._scenario) this._scenario.teardown();
    setBenchActive(false);
    this._state = 'idle';
  }

  get isRunning(): boolean { return this._running; }
  get state(): BenchState { return this._state; }
  get currentScenario(): string { return this._scenario?.label || ''; }
  get results(): BenchResult[] { return this._results; }
}

/** 全局单例 */
export const benchRunner = new BenchRunner();