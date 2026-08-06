/* =========================================================
   蚀月远征 · 月蚀之仪（设置面板）
   辉光调校：画质档位与性能细项，即时生效并烙于月痕
   ========================================================= */
import { AudioEngine } from '../../platform/audio/engine.js';
import { settingsState, applyPreset, setSetting, PRESETS } from '../../state/settings.js';
import { resizeCanvas } from '../../state/render.js';
import { invalidateBackgroundCache } from '../render/background.js';
import { $ } from './hud_utils.js';

/* ---------- 打开 / 关闭 ---------- */
export function openSettings(): void {
  refreshSettingsUI();
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
}

/* ---------- 设置键白名单（防御未知 data-key 写入状态） ---------- */
const SETTING_KEYS = ['renderScale', 'particleDensity', 'fpsLimit', 'glowFx', 'shake', 'dmgNumbers', 'bgDetail', 'enemyAnimStride'];
function isSettingKey(key: string): boolean {
  return SETTING_KEYS.includes(key);
}
