/* =========================================================
   蚀月远征 · 触摸输入核心
   虚拟摇杆 + 触摸事件管理
   设计：左半屏任意位置触摸即激活摇杆，以触摸点为中心
   ========================================================= */
import { inputState } from '../../state/input.js';

/* ---------- 常量 ---------- */
const DEAD_ZONE = 0.15;
const MAX_RADIUS_RATIO = 0.45;
const FADE_IDLE = 3.0;
const TOUCH_ZONE_RATIO = 0.5;  // 左半边屏幕作为摇杆感应区

/* ---------- 状态 ---------- */
let _touchId: number | null = null;
let _baseEl: HTMLElement | null = null;
let _knobEl: HTMLElement | null = null;
let _zoneEl: HTMLElement | null = null;
let _baseCenter = { x: 0, y: 0 };
let _baseRadius = 0;
let _lastActive = 0;
let _fadeTimer: number | null = null;
let _isTouchDevice = false;

/* ---------- 检测触摸设备 ---------- */
export function isTouchDevice(): boolean {
  return _isTouchDevice;
}

/* ---------- 创建摇杆 DOM ---------- */
function createJoystick(): void {
  if (_zoneEl) return;

  // 感应区：整个左半屏
  _zoneEl = document.createElement('div');
  _zoneEl.className = 'joystick-zone hidden';
  _zoneEl.style.position = 'fixed';
  _zoneEl.style.left = '0';
  _zoneEl.style.top = '0';
  _zoneEl.style.width = TOUCH_ZONE_RATIO * 100 + '%';
  _zoneEl.style.height = '100%';
  _zoneEl.style.zIndex = '16';
  _zoneEl.style.touchAction = 'none';

  // 基座（动态定位）
  const base = document.createElement('div');
  base.className = 'joystick-base';
  base.style.position = 'absolute';
  base.style.left = '0';
  base.style.top = '0';
  base.style.opacity = '0';
  base.style.transition = 'opacity .25s ease';
  _zoneEl.appendChild(base);

  // 摇杆柄
  const knob = document.createElement('div');
  knob.className = 'joystick-knob';
  knob.style.position = 'absolute';
  knob.style.left = '0';
  knob.style.top = '0';
  knob.style.opacity = '0';
  knob.style.transition = 'opacity .25s ease';
  _zoneEl.appendChild(knob);

  document.body.appendChild(_zoneEl);
  _baseEl = base;
  _knobEl = knob;
}

/* ---------- 缓存基座尺寸 ---------- */
function cacheBaseMetrics(): void {
  if (!_baseEl) return;
  const br = _baseEl.getBoundingClientRect();
  _baseRadius = br.width / 2;
  _baseCenter = {
    x: br.left + br.width / 2,
    y: br.top + br.height / 2,
  };
}

/* ---------- 显示摇杆（在指定坐标） ---------- */
function showJoystickAt(x: number, y: number): void {
  if (!_baseEl || !_knobEl) return;

  // 计算摇杆基座的尺寸
  const size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--joystick-size')) || 130;
  const half = size / 2;

  // 将摇杆放置在触摸点，但限制在感应区内
  if (!_zoneEl) return;
  const zoneRect = _zoneEl.getBoundingClientRect();
  const clampedX = Math.max(zoneRect.left + half, Math.min(zoneRect.right - half, x));
  const clampedY = Math.max(zoneRect.top + half, Math.min(zoneRect.bottom - half, y));

  // 设置基座位置（相对于视口）
  _baseEl.style.left = (clampedX - half) + 'px';
  _baseEl.style.top = (clampedY - half) + 'px';
  _baseEl.style.width = size + 'px';
  _baseEl.style.height = size + 'px';
  _baseEl.style.opacity = '1';

  // 设置摇杆柄初始位置（基座中心）
  const knobSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--joystick-knob')) || 44;
  _knobEl.style.left = (clampedX - knobSize / 2) + 'px';
  _knobEl.style.top = (clampedY - knobSize / 2) + 'px';
  _knobEl.style.width = knobSize + 'px';
  _knobEl.style.height = knobSize + 'px';
  _knobEl.style.opacity = '1';
  _knobEl.style.transform = '';

  // 更新基准中心（相对于视口坐标）
  _baseCenter = { x: clampedX, y: clampedY };
  _baseRadius = half;
}

/* ---------- 隐藏摇杆 ---------- */
function hideJoystickVisual(): void {
  if (_baseEl) _baseEl.style.opacity = '0';
  if (_knobEl) _knobEl.style.opacity = '0';
}

/* ---------- 设置摇杆柄位置 ---------- */
function setKnob(dx: number, dy: number): void {
  if (!_knobEl) return;
  // 先回到基座中心，再偏移
  const knobSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--joystick-knob')) || 44;
  _knobEl.style.left = (_baseCenter.x - knobSize / 2) + 'px';
  _knobEl.style.top = (_baseCenter.y - knobSize / 2) + 'px';
  _knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
}

/* ---------- 重置摇杆 ---------- */
function resetJoystick(): void {
  hideJoystickVisual();
  const gp = inputState.get('gamepad');
  inputState.patch({ gamepad: { ...gp, moveX: 0, moveY: 0, touchActive: false } });
  _touchId = null;
}

/* ---------- 淡出逻辑 ---------- */
function scheduleFade(): void {
  if (!_zoneEl) return;
  _lastActive = performance.now();
  if (_fadeTimer !== null) return;
  _fadeTimer = window.setInterval(() => {
    const elapsed = (performance.now() - _lastActive) / 1000;
    if (elapsed >= FADE_IDLE) {
      if (_baseEl) _baseEl.style.opacity = '0.35';
      if (_knobEl) _knobEl.style.opacity = '0.35';
      clearFade();
    }
  }, 500);
}

function clearFade(): void {
  if (_fadeTimer !== null) {
    clearInterval(_fadeTimer);
    _fadeTimer = null;
  }
}

function cancelFade(): void {
  clearFade();
  if (_baseEl) _baseEl.style.opacity = '1';
  if (_knobEl) _knobEl.style.opacity = '1';
}

/* ---------- 触摸事件处理 ---------- */

function handleTouchStart(e: TouchEvent): void {
  if (_touchId !== null) return;

  const touch = e.changedTouches[0];
  if (!touch) return;

  // 检查触摸点是否在摇杆感应区（左半屏）
  if (!_zoneEl) return;
  const zr = _zoneEl.getBoundingClientRect();
  if (touch.clientX < zr.left || touch.clientX > zr.right ||
      touch.clientY < zr.top || touch.clientY > zr.bottom) return;

  e.preventDefault();
  e.stopPropagation();
  _touchId = touch.identifier;
  cancelFade();
  showJoystickAt(touch.clientX, touch.clientY);
  updateKnob(touch.clientX, touch.clientY);
  scheduleFade();
}

function handleTouchMove(e: TouchEvent): void {
  if (_touchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    if (touch.identifier === _touchId) {
      e.preventDefault();
      e.stopPropagation();
      updateKnob(touch.clientX, touch.clientY);
      cancelFade();
      scheduleFade();
      return;
    }
  }
}

function handleTouchEnd(e: TouchEvent): void {
  if (_touchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === _touchId) {
      e.preventDefault();
      e.stopPropagation();
      resetJoystick();
      scheduleFade();
      return;
    }
  }
}

function handleTouchCancel(e: TouchEvent): void {
  if (_touchId === null) return;
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === _touchId) {
      resetJoystick();
      return;
    }
  }
}

/* ---------- 根据触摸坐标更新摇杆和输入 ---------- */
function updateKnob(touchX: number, touchY: number): void {
  const dx = touchX - _baseCenter.x;
  const dy = touchY - _baseCenter.y;
  const dist = Math.hypot(dx, dy);
  const maxDist = _baseRadius * MAX_RADIUS_RATIO;

  // 钳制距离
  const clamped = dist > maxDist ? maxDist / dist : 1;
  const knobX = dx * clamped;
  const knobY = dy * clamped;

  setKnob(knobX, knobY);

  // 计算输入向量（归一化到 [-1, 1]）
  const raw = dist > 0 ? dist / maxDist : 0;
  const magnitude = Math.min(1, raw);
  const dead = magnitude < DEAD_ZONE ? 0 : (magnitude - DEAD_ZONE) / (1 - DEAD_ZONE);

  const mx = dist > 0 ? (dx / dist) * dead : 0;
  const my = dist > 0 ? (dy / dist) * dead : 0;

  const gp = inputState.get('gamepad');
  inputState.patch({ gamepad: { ...gp, moveX: mx, moveY: my, touchActive: true } });
}

/* ---------- 显示/隐藏感应区 ---------- */
export function showJoystick(): void {
  if (!_zoneEl) return;
  _zoneEl.classList.remove('hidden');
  cacheBaseMetrics();
}

export function hideJoystick(): void {
  if (!_zoneEl) return;
  _zoneEl.classList.add('hidden');
  resetJoystick();
  clearFade();
}

/* ---------- 初始化 ---------- */
export function initTouch(): void {
  _isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!_isTouchDevice) return;

  createJoystick();

  // 摇杆区域事件（优先捕获）
  if (!_zoneEl) return;
  _zoneEl.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
  _zoneEl.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
  _zoneEl.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
  _zoneEl.addEventListener('touchcancel', handleTouchCancel, { passive: false, capture: true });

  // 窗口尺寸变化时刷新
  window.addEventListener('resize', () => {
    if (_zoneEl && !_zoneEl.classList.contains('hidden')) {
      cacheBaseMetrics();
    }
  });
}