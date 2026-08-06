/* =========================================================
   蚀月远征 · 状态切片：辉光调校（性能设置）
   画质预设与细项设置，持久化于月痕（localStorage）
   ========================================================= */
import { Store } from '../engine/core/store.js';

export type PresetId = 'low' | 'medium' | 'high' | 'ultra' | 'custom';

export interface SettingsState {
  preset: PresetId;
  /** 月镜析度：渲染分辨率缩放（0.5 / 0.75 / 1） */
  renderScale: number;
  /** 蚀尘浓度：粒子密度系数（0.5 / 0.75 / 1） */
  particleDensity: number;
  /** 辉光溢彩：星芒/流光等复杂光效 */
  glowFx: boolean;
  /** 月震：屏幕震动 */
  shake: boolean;
  /** 蚀痕：伤害数字 */
  dmgNumbers: boolean;
  /** 月面蚀刻：背景月海、环形山与微尘 */
  bgDetail: boolean;
  /** 潮汐节律：帧率上限（0 = 无羁） */
  fpsLimit: number;
}

/* ---------- 蚀相档位预设 ---------- */
export const PRESETS: Record<Exclude<PresetId, 'custom'>, Omit<SettingsState, 'preset'>> = {
  /* 蚀辉 · 幽暗：蚀月最沉，辉光几近熄灭 — 极致省电 */
  low: {
    renderScale: 0.5, particleDensity: 0.5,
    glowFx: false, shake: false, dmgNumbers: false, bgDetail: false,
    fpsLimit: 30,
  },
  /* 月芒 · 清冷：月轮半掩，寒光流转 */
  medium: {
    renderScale: 0.75, particleDensity: 0.75,
    glowFx: false, shake: true, dmgNumbers: true, bgDetail: false,
    fpsLimit: 60,
  },
  /* 皎月 · 澄明：皓月当空，万物分明 */
  high: {
    renderScale: 1, particleDensity: 1,
    glowFx: true, shake: true, dmgNumbers: true, bgDetail: true,
    fpsLimit: 60,
  },
  /* 满月 · 辉耀：蚀月盛放，辉光无羁 */
  ultra: {
    renderScale: 1, particleDensity: 1,
    glowFx: true, shake: true, dmgNumbers: true, bgDetail: true,
    fpsLimit: 0,
  },
};

const DEFAULT: SettingsState = { preset: 'high', ...PRESETS.high };
const SAVE_KEY = 'eclipse_settings_v1';

export const settingsState = new Store<SettingsState>(DEFAULT);

/* ---------- 持久化 ---------- */
export function persistSettings(): void {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(settingsState.state)); } catch (e) { /* 静默 */ }
}

export function loadSettings(): void {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    const merged: SettingsState = { ...DEFAULT, ...s };
    // 校验数值范围，防止脏数据
    merged.renderScale = [0.5, 0.75, 1].includes(merged.renderScale) ? merged.renderScale : 1;
    merged.particleDensity = [0.5, 0.75, 1].includes(merged.particleDensity) ? merged.particleDensity : 1;
    merged.fpsLimit = [0, 30, 60].includes(merged.fpsLimit) ? merged.fpsLimit : 60;
    // 以细项组合重算档位，杜绝「preset 名称与细项矛盾」的脏数据
    merged.preset = matchPresetFor(merged);
    settingsState.patch(merged);
  } catch (e) { /* 静默 */ }
}

/* ---------- 预设判定与切换 ---------- */
/** 纯函数：细项组合是否恰好等于某预设；返回预设名或 'custom' */
export function matchPresetFor(s: SettingsState): PresetId {
  for (const id of Object.keys(PRESETS) as Array<Exclude<PresetId, 'custom'>>) {
    const p = PRESETS[id];
    if (
      s.renderScale === p.renderScale &&
      s.particleDensity === p.particleDensity &&
      s.glowFx === p.glowFx &&
      s.shake === p.shake &&
      s.dmgNumbers === p.dmgNumbers &&
      s.bgDetail === p.bgDetail &&
      s.fpsLimit === p.fpsLimit
    ) return id;
  }
  return 'custom';
}

/** 当前细项组合是否恰好等于某预设 */
export function matchPreset(): PresetId {
  return matchPresetFor(settingsState.state);
}

/** 应用蚀相档位 */
export function applyPreset(id: Exclude<PresetId, 'custom'>): void {
  settingsState.patch({ preset: id, ...PRESETS[id] });
  persistSettings();
}

/** 设置单个细项；自动重算档位（匹配预设或为自定义） */
export function setSetting<K extends keyof Omit<SettingsState, 'preset'>>(key: K, value: SettingsState[K]): void {
  settingsState.set(key, value);
  settingsState.set('preset', matchPreset());
  persistSettings();
}

/* 模块加载时即恢复上次调校 */
loadSettings();
