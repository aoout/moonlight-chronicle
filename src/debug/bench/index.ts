/* =========================================================
   蚀月远征 · 基准测试：入口与 UI 集成
   提供 F5 运行 / F6 切换 UI 的快捷键绑定
   ========================================================= */
import { benchRunner } from './runner.js';
import { ALL_SCENARIOS } from './scenarios.js';
import {
  generateReportText,
  generateReportHTML,
  generateComparisonText,
  compareReports,
  generateComparisonHTML,
} from './reporter.js';
import { rSt } from '../../state/accessors.js';
import type { BenchReport, BenchResult } from './types.js';

/* ---------- 存储 ---------- */

let _reports: BenchReport[] = [];
let _lastReport: BenchReport | null = null;
let _benchmarkVisible = false;
let _progress: { scenario: string; pct: number } = { scenario: '', pct: 0 };
let _statusText = '';

/* ---------- 公共 API ---------- */

/** 切换基准测试 UI 显示 */
export function toggleBenchmarkUI(): void {
  _benchmarkVisible = !_benchmarkVisible;
}

/** 运行完整基准测试 */
export function runBenchmark(): void {
  if (benchRunner.isRunning) return;
  _statusText = '运行中...';
  _progress = { scenario: '', pct: 0 };

  benchRunner.runAll(
    ALL_SCENARIOS,
    (results: BenchResult[]) => {
      const report: BenchReport = {
        timestamp: Date.now(),
        label: `测试 #${_reports.length + 1}`,
        results,
        env: {
          userAgent: navigator.userAgent,
          canvasSize: rSt().width + 'x' + rSt().height,
          devicePixelRatio: window.devicePixelRatio || 1,
          settings: 'ultra',
        },
      };
      _reports.push(report);
      _lastReport = report;
      _statusText = '完成';
      _progress = { scenario: '', pct: 0 };

      // 打印到控制台
      console.log(generateReportText(report));

      // 如果有前一次报告，自动对比
      if (_reports.length >= 2) {
        const prev = _reports[_reports.length - 2];
        const cmp = compareReports(prev, report);
        console.log(generateComparisonText(cmp));
      }
    },
    (scenario: string, pct: number) => {
      _progress = { scenario, pct };
    },
  );
}

/** 取消运行 */
export function cancelBenchmark(): void {
  benchRunner.cancel();
  _statusText = '已取消';
  _progress = { scenario: '', pct: 0 };
}

/** 获取最后一份报告 */
export function getLastReport(): BenchReport | null {
  return _lastReport;
}

/** 获取所有报告 */
export function getAllReports(): BenchReport[] {
  return _reports;
}

/** 在前一份报告与最新报告之间执行对比 */
export function compareLastTwo(): void {
  if (_reports.length < 2) {
    console.warn('需要至少两份报告才能对比');
    return;
  }
  const prev = _reports[_reports.length - 2];
  const cur = _reports[_reports.length - 1];
  const cmp = compareReports(prev, cur);
  console.log(generateComparisonText(cmp));
}

/** 导出上次报告为 HTML（打印到控制台） */
export function exportReportHTML(): void {
  if (!_lastReport) {
    console.warn('没有可导出的报告');
    return;
  }
  console.log('%c=== 基准测试报告 HTML ===', 'font-weight:bold;font-size:14px;');
  console.log('%c复制以下内容保存为 .html 文件，在浏览器中打开查看', 'color:#888;');
  console.log(generateReportHTML(_lastReport));
}

/** 导出对比报告为 HTML */
export function exportComparisonHTML(): void {
  if (_reports.length < 2) {
    console.warn('需要至少两份报告才能对比');
    return;
  }
  const prev = _reports[_reports.length - 2];
  const cur = _reports[_reports.length - 1];
  const cmp = compareReports(prev, cur);
  console.log('%c=== 性能对比报告 HTML ===', 'font-weight:bold;font-size:14px;');
  console.log(generateComparisonHTML(cmp));
}

/** 获取当前状态（供 UI 渲染） */
export function getBenchState(): {
  visible: boolean;
  running: boolean;
  scenario: string;
  progress: number;
  status: string;
} {
  return {
    visible: _benchmarkVisible,
    running: benchRunner.isRunning,
    scenario: _progress.scenario,
    progress: _progress.pct,
    status: _statusText,
  };
}

/** 在调试面板上绘制基准测试 UI */
export function drawBenchUI(ctx: any): void {
  if (!_benchmarkVisible || !ctx) return;
  const state = getBenchState();
  const x = ctx.canvas.width - 220;
  const y = 4;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(x, y, 216, state.running ? 80 : 60);
  ctx.fillStyle = '#e8d48b';
  ctx.font = 'bold 12px monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('基准测试', x + 8, y + 6);

  if (state.running) {
    ctx.fillStyle = '#7fd6a4';
    ctx.fillText('场景: ' + state.scenario, x + 8, y + 24);
    // 进度条
    const barW = 196;
    const barH = 8;
    ctx.fillStyle = '#1a1e3a';
    ctx.fillRect(x + 8, y + 42, barW, barH);
    ctx.fillStyle = '#7fd6a4';
    ctx.fillRect(x + 8, y + 42, barW * Math.min(1, state.progress), barH);
    ctx.fillStyle = '#8890a8';
    ctx.font = '10px monospace';
    ctx.fillText(Math.round(state.progress * 100) + '%', x + barW - 30, y + 54);
  } else {
    ctx.fillStyle = _statusText === '完成' ? '#7fd6a4' : '#8890a8';
    ctx.fillText('状态: ' + _statusText, x + 8, y + 24);
    if (_lastReport) {
      ctx.fillStyle = '#8890a8';
      ctx.font = '10px monospace';
      ctx.fillText('报告数: ' + _reports.length + ' | F5 运行 | F6 切换', x + 8, y + 42);
    }
  }
  ctx.restore();
}

/** 绑定键盘事件 */
export function bindBenchKeys(): void {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      if (benchRunner.isRunning) {
        cancelBenchmark();
      } else {
        runBenchmark();
      }
    } else if (e.key === 'F6') {
      e.preventDefault();
      toggleBenchmarkUI();
    }
  });
}