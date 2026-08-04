/* =========================================================
   蚀月远征 · 手柄输入核心
   每帧轮询 navigator.getGamepads()：
   - 左摇杆 / D-Pad → 合成移动向量写入 inputState.gamepad
   - 按钮边沿检测 → 派发高层动作（确认/取消/翻页/暂停）
   - 方向导航带节流重复（首触发即时，350ms 后每 120ms 重复）
   连接/断开由 window 事件负责提示 toast；轮询负责状态写入。
   ========================================================= */
import { inputState } from '../state/input.js';
import { toast } from '../ui/hud_utils.js';
import {
  navTick, handleNav, handleConfirm, handleCancel,
  handlePrev, handleNext, handleStart,
} from '../ui/gamepad_nav.js';
import { refreshHint } from '../ui/gamepad_hint.js';

const DEAD = 0.28;             // 摇杆死区
const REPEAT_DELAY = 0.35;     // 首次触发后等待
const REPEAT_RATE = 0.12;      // 重复间隔

const _prevButtons: boolean[] = new Array(17).fill(false);
let _navDir: string | null = null;
let _navHoldTime = 0;
let _navRepeatTimer = 0;
let _hasNotifiedConnect = false;

/* ---------- 连接事件 ---------- */

export function initGamepad(): void {
  window.addEventListener('gamepadconnected', () => {
    inputState.patch({ gamepad: { ...inputState.get('gamepad'), connected: true } });
    if (!_hasNotifiedConnect) {
      _hasNotifiedConnect = true;
      toast('手柄已接入 · 守月人，月下同行');
    }
    refreshHint();
  });
  window.addEventListener('gamepaddisconnected', () => {
    const remaining = (navigator.getGamepads() || []).filter(g => g).length;
    if (remaining === 0) {
      inputState.patch({ gamepad: { ...inputState.get('gamepad'), connected: false, moveX: 0, moveY: 0 } });
      _hasNotifiedConnect = false;
      toast('手柄已断开');
      refreshHint();
    }
  });
}

/* ---------- 按钮派发 ---------- */

function onButtonPress(i: number): void {
  switch (i) {
    case 0: handleConfirm(); break;   // A
    case 1: handleCancel(); break;    // B
    case 3: handleStart(); break;     // Y — 游戏中切暂停
    case 4: handlePrev(); break;      // LB
    case 5: handleNext(); break;      // RB
    case 8: handleStart(); break;     // View/Back
    case 9: handleStart(); break;     // Start/Menu
    // 2 (X) / 6 (LT) / 7 (RT) / 10 (L3) / 11 (R3) 暂未映射
  }
}

/* ---------- 方向导航节流 ---------- */

function updateNavRepeat(dir: string | null, dt: number): void {
  if (dir !== _navDir) {
    // 方向变化或释放：首次立即触发
    if (dir) handleNav(dir as 'up' | 'down' | 'left' | 'right');
    _navDir = dir;
    _navHoldTime = 0;
    _navRepeatTimer = REPEAT_DELAY;
    return;
  }
  if (!dir) return;
  _navHoldTime += dt;
  if (_navHoldTime >= REPEAT_DELAY) {
    _navRepeatTimer -= dt;
    if (_navRepeatTimer <= 0) {
      handleNav(dir as 'up' | 'down' | 'left' | 'right');
      _navRepeatTimer = REPEAT_RATE;
    }
  }
}

/* ---------- 每帧轮询 ---------- */

export function pollGamepad(ts: number, dt: number): void {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) {
    navTick();
    refreshHint();
    return;
  }
  const pads = navigator.getGamepads();
  let gp: Gamepad | null = null;
  for (const p of pads) { if (p) { gp = p; break; } }

  const gs = inputState.get('gamepad');

  if (!gp) {
    // 无手柄：清零移动轴（防止残留），但仍刷新焦点/提示
    inputState.patch({ gamepad: { ...gs, moveX: 0, moveY: 0 } });
    navTick();
    refreshHint();
    return;
  }

  // 静默置位 connected（事件负责 toast）
  if (!gs.connected) {
    gs.connected = true;
    refreshHint();
  }
  gs.lastInputAt = ts;

  // 左摇杆
  const lx = gp.axes[0] || 0;
  const ly = gp.axes[1] || 0;
  let mx = Math.abs(lx) > DEAD ? lx : 0;
  let my = Math.abs(ly) > DEAD ? ly : 0;
  // D-Pad 覆盖（优先级高于摇杆）
  if (gp.buttons[12]?.pressed) my = -1;
  if (gp.buttons[13]?.pressed) my = 1;
  if (gp.buttons[14]?.pressed) mx = -1;
  if (gp.buttons[15]?.pressed) mx = 1;
  gs.moveX = mx;
  gs.moveY = my;

  // 按钮边沿检测
  gp.buttons.forEach((b, i) => {
    const pressed = b.pressed;
    if (pressed && !_prevButtons[i]) onButtonPress(i);
    _prevButtons[i] = pressed;
  });

  // 方向导航（取四向最大轴）
  let dir: string | null = null;
  const ax = Math.abs(mx), ay = Math.abs(my);
  if (ay > ax && my < -DEAD) dir = 'up';
  else if (ay > ax && my > DEAD) dir = 'down';
  else if (ax > 0 && mx < -DEAD) dir = 'left';
  else if (ax > 0 && mx > DEAD) dir = 'right';
  updateNavRepeat(dir, dt);

  navTick();
  refreshHint();
}
