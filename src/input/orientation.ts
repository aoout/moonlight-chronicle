/* =========================================================
   蚀月远征 · 横屏锁定
   移动端竖屏时显示旋转提示，横屏时隐藏
   ========================================================= */

const LANDSCAPE_THRESHOLD = 0.75; // 宽高比 ≥ 此值视为横屏（含正方形）

let _lockEl: HTMLElement | null = null;
let _isTouchDevice = false;

export function isTouchDevice(): boolean {
  return _isTouchDevice;
}

/** 检测当前是否为横屏 */
function isLandscape(): boolean {
  return window.innerWidth / window.innerHeight >= LANDSCAPE_THRESHOLD;
}

/** 更新横屏提示的可见性 */
function updateOrientation(): void {
  if (!_lockEl || !_isTouchDevice) return;
  _lockEl.style.display = isLandscape() ? 'none' : 'flex';
}

/** 初始化横屏锁定 */
export function initOrientation(): void {
  _isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!_isTouchDevice) return;

  _lockEl = document.getElementById('orientation-lock');

  // 初始检查
  updateOrientation();

  // resize 和 orientationchange 时重新检查
  window.addEventListener('resize', updateOrientation);
  window.addEventListener('orientationchange', () => {
    // orientationchange 后 resize 尚未触发，延迟检查
    setTimeout(updateOrientation, 400);
  });
}