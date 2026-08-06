/* =========================================================
   蚀月远征 · 移动端操作栏
   复用通用 HintBar 组件，提供：
   - 音频模式切换（对应 M 键）
   - 暂停/继续（对应 P 键）
   仅在触控设备的战斗阶段显示
   ========================================================= */

import { HintBar } from './components/HintBar.js';
import { AudioEngine } from '../../platform/audio/engine.js';
import { togglePause } from './pause_control.js';
import { toast } from './hud_utils.js';

let actionBar: HintBar | null = null;
let _checked = false;
let _isTouch = false;

function checkTouch(): boolean {
  if (!_checked) {
    _checked = true;
    _isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
  return _isTouch;
}

/** 创建移动操作栏（仅触控设备有效） */
export function initMobileActionBar(): void {
  if (!checkTouch()) return;
  if (actionBar) return;

  actionBar = new HintBar({
    pointerEvents: 'auto',
    className: 'mobile-action-bar',
    inline: true,
  });
  const hudRight = document.querySelector('.hud-right') as HTMLElement | null;
  actionBar.mount(hudRight || document.body, true);
  actionBar.hide();
}

/** 战斗开始时显示操作栏 */
export function showMobileActionBar(): void {
  if (!actionBar) initMobileActionBar();
  if (!actionBar) return;
  actionBar.setItems([
    {
      icon: buildAudioIcon(),
      label: '音频',
      onClick: () => {
        AudioEngine.toggleMode();
        toast('音频：' + AudioEngine.getModeLabel());
      },
    },
    {
      icon: buildPauseIcon(),
      label: '暂停',
      onClick: () => togglePause(),
    },
  ]);
  actionBar.show();
}

/** 战斗结束时隐藏操作栏 */
export function hideMobileActionBar(): void {
  actionBar?.hide();
}

/** 刷新音频标签（音频模式切换时调用） */
export function refreshAudioLabel(): void {
  if (!actionBar) return;
  // 直接重建项目，内部会重新定位
  const current = document.querySelector('.mobile-action-bar');
  if (current) {
    const audioLabel = current.querySelector('.hb-item:first-child .hb-label');
    if (audioLabel) audioLabel.textContent = '音频';
  }
}

/* ---------- 图标 ---------- */

function buildAudioIcon(): string {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>';
}

function buildPauseIcon(): string {
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
}
