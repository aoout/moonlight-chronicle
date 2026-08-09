/* =========================================================
   蚀月远征 · 组装根：主循环
   只负责固定步长推进 + 渲染 + UI tick 的编排。
   关卡与开局流程已下沉到 commands/run.ts。
   ========================================================= */
import { STATE, sm } from '../engine/core/states.js';
import { stageState } from '../state/stage.js';
import { gSt } from '../state/accessors.js';
import { render } from '../features/render/index.js';
import { getSysMan } from '../systems/index.js';
import { uiTick } from '../features/ui/hud.js';
import { pollGamepad } from '../features/input/gamepad.js';
import { settingsState } from '../state/settings.js';
import { isBenchActive } from '../infra/debug/bench/state.js';

/* ---------- 主更新（薄调度层） ---------- */

export function update(dt: number): void {
  stageState.set('time', gSt().time + dt);
  getSysMan().update(dt);
}

/* ---------- 固定时间步长 + 累积器 ---------- */
const FIXED_DT = 1 / 60;          // 固定步长 ≈16.67ms
const MAX_STEPS = 4;               // 单帧最大逻辑步数（防螺旋死锁）
let _accum = 0;
let _lastT = 0;
let _lastRenderT = 0;

export function gameLoop(ts: number): void {
  requestAnimationFrame(gameLoop);
  // 基准测试激活时，跳过正常更新/渲染，由 runner 的独立 RAF 循环接管
  if (isBenchActive()) { _lastT = ts; _lastRenderT = ts; return; }
  if (_lastT === 0) { _lastT = ts; _lastRenderT = ts; return; }  // 首帧初始化基线
  // 潮汐节律：近似帧率上限（30 / 60 / 0=无羁），含 1ms 容差。
  // 跳帧不推进 _lastT，累积器将在下一帧补足逻辑步数，模拟节奏不受限帧影响。
  const fpsLimit = settingsState.get('fpsLimit');
  if (fpsLimit > 0 && ts - _lastRenderT < 1000 / fpsLimit - 1) return;
  _lastRenderT = ts;
  let frameDt = (ts - _lastT) / 1000;
  _lastT = ts;
  // 超大 dt 保护（切标签页、休眠唤醒），防 ts 倒退
  frameDt = Math.max(0, Math.min(0.2, frameDt || FIXED_DT));

  // 手柄轮询：菜单 / 暂停 / 覆盖层中亦需响应，故置于战斗分支之外
  pollGamepad(ts, frameDt);

  // 战斗中推进模拟；其余状态（升级/商店/结算）完全暂停（不渲染）。
  if (sm.is(STATE.PLAYING) && !gSt().paused) {
    _accum += frameDt;
    let steps = 0;
    while (_accum >= FIXED_DT && steps < MAX_STEPS) {
      update(FIXED_DT);
      _accum -= FIXED_DT;
      steps++;
    }
    if (_accum >= FIXED_DT) _accum = _accum % FIXED_DT;
    render();
    uiTick();
  } else {
    _accum = 0;  // 非战斗状态重置累积器，避免切回时追赶时间
  }

  // 界面切换由状态机钩子（state_hooks.ts）驱动，不再轮询
}
