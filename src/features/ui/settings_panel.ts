/* =========================================================
   蚀月远征 · 月蚀之仪（设置面板）
   辉光调校：画质档位与性能细项，即时生效并烙于月痕
   ========================================================= */
import { AudioEngine } from '../../platform/audio/engine.js';
import { settingsState, applyPreset, setSetting, PRESETS } from '../../state/settings.js';
import { resizeCanvas } from '../../state/render.js';
import { invalidateBackgroundCache } from '../render/background.js';
import { $ } from './hud_utils.js';
import { isVibrationAvailable, refreshVibration, getVibrationSupportLevel } from '../input/gamepad_vibration.js';

/* ---------- 打开 / 关闭 ---------- */
export function openSettings(): void {
  refreshSettingsUI();
  refreshRumbleStatus();
  $('settings').classList.remove('hidden');
}

export function closeSettings(): void {
  $('settings').classList.add('hidden');
}

export function isSettingsOpen(): boolean {
  return !$('settings').classList.contains('hidden');
}

/* ---------- 即时应用（分辨率 / 背景缓存需立即重算，其余每帧读取） ---------- */
function applyLiveSettings(): void {
  resizeCanvas();
  invalidateBackgroundCache();
}

/* ---------- 值解析：按设置键转换 data-v 字符串 ---------- */
function parseValue(key: string, raw: string): number | boolean {
  if (key === 'glowFx' || key === 'shake' || key === 'dmgNumbers' || key === 'bgDetail') {
    return raw === 'true';
  }
  return parseFloat(raw);
}

/* ---------- 振魄状态刷新 ---------- */
function refreshRumbleStatus(): void {
  refreshVibration();
  const avail = isVibrationAvailable();
  const level = getVibrationSupportLevel();
  const dot = $('rumble-status')?.querySelector('.rumble-dot');
  const label = $('rumble-status')?.querySelector('.rumble-label');
  const desc = $('rumble-status-desc');
  if (!dot || !label) return;
  if (avail) {
    dot.className = 'rumble-dot dot-avail';
    label.textContent = '可用';
    if (desc) desc.textContent = '手柄震动已就绪 · 振魄随行';
  } else if (level === 'full') {
    dot.className = 'rumble-dot dot-unavail';
    label.textContent = '等待手柄';
    if (desc) desc.textContent = '浏览器支持震动 · 接入手柄后自动启用';
  } else if (level === 'partial') {
    dot.className = 'rumble-dot dot-unavail';
    label.textContent = '部分支持';
    if (desc) desc.textContent = 'Firefox 需在 about:config 开启 dom.gamepad.extensions.enabled';
  } else if (level === 'none') {
    dot.className = 'rumble-dot dot-unavail';
    label.textContent = '不支持';
    if (desc) desc.textContent = '当前浏览器不支持手柄震动 · 功能静默降级';
  } else {
    dot.className = 'rumble-dot dot-unknown';
    label.textContent = '检测中';
    if (desc) desc.textContent = '无法判断浏览器震动能力 · 功能可能不可用';
  }
}

/* ---------- 振魄滑块绑定 ---------- */
let _sliderBound = false;
function bindRumbleSlider(): void {
  if (_sliderBound) return;
  _sliderBound = true;
  const slider = document.getElementById('rumble-slider') as HTMLInputElement | null;
  if (!slider) return;
  slider.addEventListener('input', () => {
    const v = parseInt(slider.value, 10);
    const valEl = document.getElementById('rumble-val');
    if (valEl) valEl.textContent = String(v);
    // 转为 0-1 存储
    setSetting('rumbleIntensity', v / 100);
    // 实时测试震动（仅当值 > 0 且未打开时）
    if (v > 0) import('../input/gamepad_vibration.js').then(m => m.rumbleConfirm());
  });
}

/* ---------- UI 刷新 ---------- */
function refreshSettingsUI(): void {
  const s = settingsState.state;
  // 蚀相档位高亮（custom 时不点亮任何档位）
  document.querySelectorAll<HTMLElement>('#set-preset .set-preset-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.preset === s.preset);
  });
  // 细项按钮高亮
  document.querySelectorAll<HTMLElement>('.set-opts').forEach(group => {
    const key = group.dataset.key || '';
    const cur = (s as any)[key];
    group.querySelectorAll<HTMLElement>('button').forEach(b => {
      b.classList.toggle('active', String(cur) === b.dataset.v);
    });
  });
  // 振魄滑块同步
  const slider = document.getElementById('rumble-slider') as HTMLInputElement | null;
  const valEl = document.getElementById('rumble-val');
  if (slider) {
    const displayVal = Math.round(s.rumbleIntensity * 100);
    slider.value = String(displayVal);
    if (valEl) valEl.textContent = String(displayVal);
  }
}

/* ---------- 事件绑定 ---------- */
export function bindSettingsUI(): void {
  $('btn-settings').onclick = () => { AudioEngine.playSfx('click'); openSettings(); };
  $('btn-settings-close').onclick = () => { AudioEngine.playSfx('close'); closeSettings(); };

  // 蚀相档位：一键调校
  document.querySelectorAll<HTMLElement>('#set-preset .set-preset-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.preset;
      if (!id || !(id === 'low' || id === 'medium' || id === 'high' || id === 'ultra')) return;
      AudioEngine.playSfx('click');
      applyPreset(id);
      applyLiveSettings();
      refreshSettingsUI();
      refreshRumbleStatus();
    };
  });

  // 细项：单独调校（自动重算档位）
  document.querySelectorAll<HTMLElement>('.set-opts').forEach(group => {
    const key = group.dataset.key || '';
    if (!isSettingKey(key)) return;
    group.querySelectorAll<HTMLElement>('button').forEach(btn => {
      btn.onclick = () => {
        const raw = btn.dataset.v;
        if (raw === undefined) return;
        AudioEngine.playSfx('click');
        setSetting(key as any, parseValue(key, raw) as any);
        applyLiveSettings();
        refreshSettingsUI();
      };
    });
  });

  // 振魄滑块
  bindRumbleSlider();
}

/* ---------- 设置键白名单（防御未知 data-key 写入状态） ---------- */
const SETTING_KEYS = ['renderScale', 'particleDensity', 'fpsLimit', 'glowFx', 'shake', 'dmgNumbers', 'bgDetail', 'enemyAnimStride', 'rumbleIntensity'];
function isSettingKey(key: string): boolean {
  return SETTING_KEYS.includes(key);
}