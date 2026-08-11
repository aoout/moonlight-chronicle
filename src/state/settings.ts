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
  /**
   * 蚀影律动：敌影身姿离屏缓存的重绘步长（每 N 帧重绘一次）。
   * 1 = 逐帧重绘，身姿最灵动；4 = 每四帧一次，重绘开销降至四分之一。
   * 后期敌群密集时这是渲染层最大的一笔可省开销，但会让身姿动画变顿，
   * 因此交由玩家取舍，默认保持逐帧。
   */
  enemyAnimStride: number;
  /**
   * 振魄：手柄震动强度（0 = 关闭，1 = 满强度）。
   * 仅 Chrome/Edge 完整支持，Firefox 部分支持，Safari 不支持（静默降级）。
   */
  rumbleIntensity: number;
}

/** 可调细项的全部键 —— 新增设置项时在此登记一次即可 */
const TUNABLE_KEYS = [
  'renderScale', 'particleDensity', 'glowFx', 'shake',
  'dmgNumbers', 'bgDetail', 'fpsLimit', 'enemyAnimStride', 'rumbleIntensity',
] as const satisfies readonly (keyof Omit<SettingsState, 'preset'>)[];

/** v1 存档里已有的键：给老存档补齐新增字段时，只比对这些 */
const LEGACY_V1_KEYS = [
  'renderScale', 'particleDensity', 'glowFx', 'shake',
  'dmgNumbers', 'bgDetail', 'fpsLimit',
] as const satisfies readonly (keyof Omit<SettingsState, 'preset'>)[];

type TunableKey = (typeof TUNABLE_KEYS)[number];

/* ---------- 蚀相档位预设 ---------- */
export const PRESETS: Record<Exclude<PresetId, 'custom'>, Omit<SettingsState, 'preset'>> = {
  /* 蚀辉 · 幽暗：蚀月最沉，辉光几近熄灭 — 极致省电 */
  low: {
    renderScale: 0.5, particleDensity: 0.5,
    glowFx: false, shake: false, dmgNumbers: false, bgDetail: false,
    fpsLimit: 30, enemyAnimStride: 4, rumbleIntensity: 1,
  },
  /* 月芒 · 清冷：月轮半掩，寒光流转 */
  medium: {
    renderScale: 0.75, particleDensity: 0.75,
    glowFx: false, shake: true, dmgNumbers: true, bgDetail: false,
    fpsLimit: 60, enemyAnimStride: 2, rumbleIntensity: 1,
  },
  /* 皎月 · 澄明：皓月当空，万物分明 */
  high: {
    renderScale: 1, particleDensity: 1,
    glowFx: true, shake: true, dmgNumbers: true, bgDetail: true,
    fpsLimit: 60, enemyAnimStride: 1, rumbleIntensity: 1,
  },
  /* 满月 · 辉耀：蚀月盛放，辉光无羁 */
  ultra: {
    renderScale: 1, particleDensity: 1,
    glowFx: true, shake: true, dmgNumbers: true, bgDetail: true,
    fpsLimit: 0, enemyAnimStride: 1, rumbleIntensity: 1,
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
    // v1 存档没有 enemyAnimStride：按旧细项推出的档位补齐，
    // 否则老玩家精心调好的「幽暗」会因为凭空多出一个字段被判成「自定义」
    if (typeof s.enemyAnimStride !== 'number') {
      const legacy = matchPresetFor(merged, LEGACY_V1_KEYS);
      merged.enemyAnimStride = legacy === 'custom'
        ? DEFAULT.enemyAnimStride
        : PRESETS[legacy].enemyAnimStride;
    }
    merged.enemyAnimStride = [1, 2, 4].includes(merged.enemyAnimStride) ? merged.enemyAnimStride : 1;
    merged.rumbleIntensity = typeof merged.rumbleIntensity === 'number'
      ? Math.max(0, Math.min(1, merged.rumbleIntensity))
      : 1;
    // 以细项组合重算档位，杜绝「preset 名称与细项矛盾」的脏数据
    merged.preset = matchPresetFor(merged);
    settingsState.patch(merged);
  } catch (e) { /* 静默 */ }
}

/* ---------- 预设判定与切换 ---------- */
/**
 * 纯函数：细项组合是否恰好等于某预设；返回预设名或 'custom'。
 * keys 可缩小比对范围，用于老存档迁移时忽略尚不存在的字段。
 */
export function matchPresetFor(
  s: SettingsState,
  keys: readonly TunableKey[] = TUNABLE_KEYS,
): PresetId {
  for (const id of Object.keys(PRESETS) as Array<Exclude<PresetId, 'custom'>>) {
    const p = PRESETS[id];
    if (keys.every((k) => s[k] === p[k])) return id;
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
