/* =========================================================
   蚀月远征 · 基准测试单元测试
   测试纯逻辑部分：统计计算、报告生成、对比分析
   注意：本文件仅测试纯函数，不依赖浏览器 API
   ========================================================= */
import { describe, it, expect } from 'vitest';
import { computeStats } from '../infra/debug/bench/stats.js';
import { compareReports, generateReportText, generateReportHTML, generateComparisonText } from '../infra/debug/bench/reporter.js';
import type { BenchReport, BenchResult, FrameSample } from '../infra/debug/bench/types.js';

/* ========== computeStats ========== */

describe('computeStats', () => {
  it('should return zeros for empty array', () => {
    const s = computeStats([]);
    expect(s.min).toBe(0);
    expect(s.max).toBe(0);
    expect(s.avg).toBe(0);
    expect(s.median).toBe(0);
    expect(s.p95).toBe(0);
    expect(s.p99).toBe(0);
    expect(s.stdDev).toBe(0);
  });

  it('should compute correct values for single element', () => {
    const s = computeStats([16.67]);
    expect(s.min).toBe(16.67);
    expect(s.max).toBe(16.67);
    expect(s.avg).toBe(16.67);
    expect(s.median).toBe(16.67);
    expect(s.p95).toBe(16.67);
    expect(s.p99).toBe(16.67);
    expect(s.stdDev).toBe(0);
  });

  it('should compute correct values for uniform data', () => {
    const data = [10, 10, 10, 10, 10];
    const s = computeStats(data);
    expect(s.min).toBe(10);
    expect(s.max).toBe(10);
    expect(s.avg).toBe(10);
    expect(s.median).toBe(10);
    expect(s.p95).toBe(10);
    expect(s.p99).toBe(10);
    expect(s.stdDev).toBe(0);
  });

  it('should sort and compute percentiles correctly', () => {
    const data = Array.from({ length: 20 }, (_, i) => i + 1);
    const s = computeStats(data);
    expect(s.min).toBe(1);
    expect(s.max).toBe(20);
    expect(s.avg).toBe(10.5);
    expect(s.median).toBe(10.5);
    expect(s.p95).toBe(20);
    expect(s.p99).toBe(20);
  });

  it('should handle unsorted input', () => {
    const data = [50, 10, 30, 20, 40];
    const s = computeStats(data);
    expect(s.min).toBe(10);
    expect(s.max).toBe(50);
    expect(s.median).toBe(30);
    expect(s.p95).toBe(50);
  });

  it('should compute std dev correctly', () => {
    const data = [2, 4, 4, 4, 5, 5, 7, 9];
    const s = computeStats(data);
    // avg = 5, variance = (9+1+1+1+0+0+4+16)/8 = 4, stdDev = 2
    expect(s.avg).toBe(5);
    expect(s.stdDev).toBe(2);
  });
});

/* ========== compareReports ========== */

describe('compareReports', () => {
  const makeSample = (total: number, render: number): FrameSample => ({
    total, render, drawCalls: 0,
    entities: { enemies: 0, projectiles: 0, particles: 0, drops: 0, phantoms: 0 },
  });

  const makeResult = (name: string, ...values: number[]): BenchResult => {
    const samples = values.map(v => makeSample(v, v * 0.6));
    return {
      name,
      duration: 5,
      frameCount: samples.length,
      total: computeStats(values),
      render: computeStats(values.map(v => v * 0.6)),
      drawCalls: computeStats(values.map(() => 0)),
      entities: { enemies: 0, projectiles: 0, particles: 0, drops: 0, phantoms: 0 },
      raw: samples,
      droppedFrames: values.filter(v => v > 33).length,
    };
  };

  const baseReport: BenchReport = {
    timestamp: 1000,
    label: '基线',
    results: [makeResult('空闲', 16, 15, 17, 16, 16)],
    env: { userAgent: 'test', canvasSize: '800x600', devicePixelRatio: 1, settings: 'ultra' },
  };

  const betterReport: BenchReport = {
    timestamp: 2000,
    label: '优化后',
    results: [makeResult('空闲', 12, 11, 13, 12, 12)],
    env: { userAgent: 'test', canvasSize: '800x600', devicePixelRatio: 1, settings: 'ultra' },
  };

  const worseReport: BenchReport = {
    timestamp: 3000,
    label: '变差后',
    results: [makeResult('空闲', 20, 22, 19, 21, 20)],
    env: { userAgent: 'test', canvasSize: '800x600', devicePixelRatio: 1, settings: 'ultra' },
  };

  it('should return positive delta for improvement', () => {
    const cmp = compareReports(baseReport, betterReport);
    expect(cmp.deltas).toHaveLength(1);
    const d = cmp.deltas[0];
    expect(d.scenario).toBe('空闲');
    expect(d.totalAvg).toBeGreaterThan(0);
    expect(d.totalP95).toBeGreaterThan(0);
  });

  it('should return negative delta for regression', () => {
    const cmp = compareReports(baseReport, worseReport);
    expect(cmp.deltas).toHaveLength(1);
    const d = cmp.deltas[0];
    expect(d.totalAvg).toBeLessThan(0);
  });

  it('should handle new scenario not in baseline', () => {
    const extraResult = makeResult('新场景', 20, 20, 20);
    const newReport: BenchReport = {
      timestamp: 4000,
      label: '新场景测试',
      results: [makeResult('空闲', 16, 16), extraResult],
      env: { userAgent: 'test', canvasSize: '800x600', devicePixelRatio: 1, settings: 'ultra' },
    };
    const cmp = compareReports(baseReport, newReport);
    expect(cmp.deltas).toHaveLength(2);
    const newScene = cmp.deltas.find(d => d.scenario === '新场景');
    expect(newScene).toBeDefined();
    expect(newScene!.totalAvg).toBeNull();
  });

  it('should compute dropped frames delta correctly', () => {
    const baseWithDrops: BenchReport = {
      ...baseReport,
      results: [{
        ...makeResult('空闲', 16, 16, 16),
        droppedFrames: 5,
      }],
    };
    const curWithDrops: BenchReport = {
      ...betterReport,
      results: [{
        ...makeResult('空闲', 12, 12, 12),
        droppedFrames: 2,
      }],
    };
    const cmp = compareReports(baseWithDrops, curWithDrops);
    expect(cmp.deltas[0].droppedFramesDelta).toBe(-3);
  });
});

/* ========== 报告生成 ========== */

describe('generateReportText', () => {
  it('should produce a string that contains the report label', () => {
    const report: BenchReport = {
      timestamp: Date.now(),
      label: '我的测试',
      results: [],
      env: { userAgent: 'test', canvasSize: '800x600', devicePixelRatio: 1, settings: 'ultra' },
    };
    const text = generateReportText(report);
    expect(text).toContain('我的测试');
    expect(text).toContain('基准测试报告');
  });

  it('should include scenario names in output', () => {
    const makeSample = (total: number): FrameSample => ({
      total, render: total * 0.6, drawCalls: 0,
      entities: { enemies: 0, projectiles: 0, particles: 0, drops: 0, phantoms: 0 },
    });
    const report: BenchReport = {
      timestamp: Date.now(),
      label: '测试',
      results: [{
        name: '空闲',
        mode: 'fixed',
        duration: 5,
        frameCount: 60,
        total: computeStats([16, 17, 16]),
        render: computeStats([10, 11, 10]),
        drawCalls: computeStats([0]),
        entities: { enemies: 0, projectiles: 0, particles: 0, drops: 0, phantoms: 0 },
        raw: [16, 17, 16].map(v => makeSample(v)),
        droppedFrames: 0,
      }],
      env: { userAgent: 'test', canvasSize: '800x600', devicePixelRatio: 1, settings: 'ultra' },
    };
    const text = generateReportText(report);
    const html = generateReportHTML(report);
    expect(text).toContain('[空闲]');
    expect(text).toContain('固定负载');
    expect(html).toContain('<th>模式</th>');
    expect(html).toContain('<td>固定负载</td>');
    expect(text).toContain('60');
    expect(text).toContain('16.00ms');
  });
});

describe('generateComparisonText', () => {
  it('should produce a string with delta information', () => {
    const makeSample = (total: number): FrameSample => ({
      total, render: total * 0.6, drawCalls: 0,
      entities: { enemies: 0, projectiles: 0, particles: 0, drops: 0, phantoms: 0 },
    });

    const baseReport: BenchReport = {
      timestamp: 1000,
      label: '基线',
      results: [{
        name: '空闲',
        duration: 5, frameCount: 60,
        total: computeStats([16, 16, 16]),
        render: computeStats([10, 10, 10]),
        drawCalls: computeStats([0]),
        entities: { enemies: 0, projectiles: 0, particles: 0, drops: 0, phantoms: 0 },
        raw: [16, 16, 16].map(v => makeSample(v)),
        droppedFrames: 0,
      }],
      env: { userAgent: 'test', canvasSize: '800x600', devicePixelRatio: 1, settings: 'ultra' },
    };
    const curReport: BenchReport = {
      timestamp: 2000,
      label: '优化后',
      results: [{
        name: '空闲',
        duration: 5, frameCount: 60,
        total: computeStats([12, 12, 12]),
        render: computeStats([7, 7, 7]),
        drawCalls: computeStats([0]),
        entities: { enemies: 0, projectiles: 0, particles: 0, drops: 0, phantoms: 0 },
        raw: [12, 12, 12].map(v => makeSample(v)),
        droppedFrames: 0,
      }],
      env: { userAgent: 'test', canvasSize: '800x600', devicePixelRatio: 1, settings: 'ultra' },
    };
    const cmp = compareReports(baseReport, curReport);
    const text = generateComparisonText(cmp);
    expect(text).toContain('性能对比报告');
    expect(text).toContain('基线');
    expect(text).toContain('优化后');
    expect(text).toContain('[空闲]');
  });
});
