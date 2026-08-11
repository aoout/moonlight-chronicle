/* =========================================================
   蚀月远征 · 手柄震动模块
   基于浏览器 GamepadHapticActuator API
   支持：dual-rumble（双马达震动）
   - Chrome 117+ / Edge : 完整支持（vibrationActuator + playEffect）
   - Firefox 55+ : 通过 hapticActuators 数组暴露，需 about:config 开启 dom.gamepad.extensions.enabled
   - Safari 16.4+ : 有限支持（静默降级）
   ========================================================= */
import { inputState } from '../../state/input.js';
import { settingsState } from '../../state/settings.js';

/* ---------- 震动预设 ---------- */
export interface RumblePreset {
  /** 持续时间（ms） */
  duration: number;
  /** 低频马达强度（0-1），大震 */
  strongMagnitude: number;
  /** 高频马达强度（0-1），小震 */
  weakMagnitude: number;
  /** 延迟触发（ms） */
  startDelay?: number;
}

// 常用预设（原始强度，运行时按设置缩放）
export const RUMBLE = {
  /** 轻击/命中反馈 */
  HIT: { duration: 80, strongMagnitude: 0.6, weakMagnitude: 0.3 },
  /** 暴击/重击 */
  HEAVY: { duration: 150, strongMagnitude: 1.0, weakMagnitude: 0.5 },
  /** 受击反馈 */
  DAMAGE: { duration: 120, strongMagnitude: 0.8, weakMagnitude: 0.4 },
  /** 爆炸/大范围 */
  EXPLOSION: { duration: 300, strongMagnitude: 1.0, weakMagnitude: 0.8 },
  /** 确认/UI 反馈 */
  CONFIRM: { duration: 40, strongMagnitude: 0.2, weakMagnitude: 0.5 },
  /** 取消/错误 */
  CANCEL: { duration: 60, strongMagnitude: 0.5, weakMagnitude: 0.1 },
  /** 持续微弱震动（如低血量警告） */
  LOW_HEALTH: { duration: 500, strongMagnitude: 0.15, weakMagnitude: 0.3 },
  /** 连击蓄力 */
  CHARGE: { duration: 200, strongMagnitude: 0.4, weakMagnitude: 0.7 },
} as const;

/* ---------- 内部状态 ---------- */
let _actuator: GamepadHapticActuator | null = null;
let _lastPlayed = 0;
const MIN_INTERVAL_MS = 30; // 防抖间隔

/** 震动可用性：true = 当前手柄支持震动 */
export function isVibrationAvailable(): boolean {
  return _actuator !== null;
}

/* ---------- 工具：从 Gamepad 对象提取震动致动器 ---------- */
/**
 * 跨浏览器兼容：从 Gamepad 中提取 GamepadHapticActuator。
 * - Chrome/Edge/Safari：p.vibrationActuator（单数）
 * - Firefox：p.hapticActuators（复数数组，取第一项；需 about:config 开启 dom.gamepad.extensions.enabled）
 */
function getActuator(p: Gamepad): GamepadHapticActuator | null {
  // Chrome/Edge 路径
  if ((p as any).vibrationActuator) return (p as any).vibrationActuator as GamepadHapticActuator;
  // Firefox 路径（hapticActuators 是数组）
  const ha = (p as any).hapticActuators as GamepadHapticActuator[] | undefined;
  if (ha && ha.length > 0 && ha[0]) return ha[0];
  return null;
}

/* ---------- 刷新震动器引用 ---------- */
export function refreshVibration(): void {
  const pads = navigator.getGamepads?.();
  if (!pads) { _actuator = null; return; }
  for (const p of pads) {
    if (!p) continue;
    const a = getActuator(p);
    if (a) {
      _actuator = a;
      console.debug('[振魄] 致动器已绑定:', {
        hasPlayEffect: typeof a.playEffect === 'function',
        hasPulse: typeof (a as any).pulse === 'function',
        hasReset: typeof a.reset === 'function',
        effects: (a as any).effects,
      });
      return;
    }
  }
  _actuator = null;
}

/* ---------- 获取当前强度缩放 ---------- */
function getIntensity(): number {
  return settingsState.get('rumbleIntensity');
}

/* ---------- 核心震动接口 ---------- */
export async function rumble(
  preset: RumblePreset | { duration: number; strongMagnitude?: number; weakMagnitude?: number; startDelay?: number },
): Promise<boolean> {
  const now = performance.now();
  if (now - _lastPlayed < MIN_INTERVAL_MS) return false;

  // 检查手柄是否连接且有震动致动器
  const gs = inputState.get('gamepad');
  if (!gs.connected) return false;

  // 读取强度设置
  const intensity = getIntensity();
  if (intensity <= 0) return false;

  // 延迟刷新 actuator 引用（惰性）
  if (!_actuator) refreshVibration();
  if (!_actuator) return false;

  // 应用强度缩放
  const strong = Math.min(1, (preset.strongMagnitude ?? 0.5) * intensity);
  const weak = Math.min(1, (preset.weakMagnitude ?? 0.5) * intensity);

  const params: GamepadEffectParameters = {
    duration: preset.duration,
    strongMagnitude: strong,
    weakMagnitude: weak,
    startDelay: preset.startDelay ?? 0,
  };

  // 策略：先试 playEffect('dual-rumble')（W3C 标准，Chrome/Edge/Firefox 均支持），
  // 失败再降级 pulse()（旧 API，Firefox 后备）。
  // 不依赖 effects 数组检测——Firefox 可能在没有 effects 属性的情况下仍支持 playEffect。
  try {
    await _actuator.playEffect('dual-rumble', params);
    _lastPlayed = now;
    return true;
  } catch {
    // 降级：pulse(magnitude, duration)
    if (typeof (_actuator as any).pulse === 'function') {
      try {
        await (_actuator as any).pulse(strong, preset.duration);
        _lastPlayed = now;
        return true;
      } catch { /* 静默失败 */ }
    }
    return false;
  }
}

/* ---------- 停止震动 ---------- */
export function stopRumble(): void {
  if (!_actuator) return;
  try {
    _actuator.reset();
  } catch { /* 静默 */ }
}

/* ---------- 便捷封装 ---------- */
export const rumbleHit = () => rumble(RUMBLE.HIT);
export const rumbleHeavy = () => rumble(RUMBLE.HEAVY);
export const rumbleDamage = () => rumble(RUMBLE.DAMAGE);
export const rumbleExplosion = () => rumble(RUMBLE.EXPLOSION);
export const rumbleConfirm = () => rumble(RUMBLE.CONFIRM);
export const rumbleCancel = () => rumble(RUMBLE.CANCEL);

/* ---------- 检测是否支持震动（外部调用） ---------- */
export function isVibrationSupported(): boolean {
  if (_actuator !== null) return true;
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return false;
  for (const p of navigator.getGamepads()) {
    if (!p) continue;
    if (getActuator(p)) return true;
  }
  return false;
}

/* ---------- 浏览器震动能力等级 ---------- */
export type VibrationSupportLevel = 'full' | 'partial' | 'none' | 'unknown';

/**
 * 检测当前浏览器/平台的手柄震动能力等级。
 * - 'full'    ：已知完整支持（Chrome/Edge/Opera，或 Firefox 已连手柄并检测到 hapticActuators）
 * - 'partial' ：需要标志或部分支持（Firefox，需 about:config 开启 dom.gamepad.extensions.enabled）
 * - 'none'    ：不支持（Safari / 旧版浏览器）
 * - 'unknown' ：无法判断
 */
export function getVibrationSupportLevel(): VibrationSupportLevel {
  if (typeof navigator === 'undefined') return 'none';
  if (!navigator.getGamepads) return 'none';

  // 如果已有手柄连接，运行时检测实际 actuator
  if (_actuator) return 'full';
  for (const p of navigator.getGamepads()) {
    if (p && getActuator(p)) return 'full';
  }

  // 通过 userAgent 判断浏览器族
  const ua = navigator.userAgent || '';
  // Chrome/Edge/Opera（Blink 内核）：已知完整支持 vibrationActuator
  if (/Chrome|Edge|Opera|OPR/i.test(ua) && !/Firefox/i.test(ua)) {
    return 'full';
  }
  // Firefox：支持 hapticActuators，但需 about:config 开启 dom.gamepad.extensions.enabled
  if (/Firefox/i.test(ua)) {
    return 'partial';
  }
  // Safari 或其他 webkit
  if (/Safari|AppleWebKit/i.test(ua)) {
    return 'none';
  }
  return 'unknown';
}

/* ---------- 诊断工具（可在控制台手动调用） ---------- */
export function rumbleDiagnostic(): void {
  console.group('[振魄] 诊断信息');
  console.log('浏览器:', navigator.userAgent);
  console.log('支持等级:', getVibrationSupportLevel());
  console.log('当前 actuator:', _actuator);
  const pads = navigator.getGamepads?.() || [];
  console.log('已连接手柄:', pads.filter(p => p).length);
  for (const p of pads) {
    if (!p) continue;
    const rawHA = (p as any).hapticActuators;
    const rawVA = (p as any).vibrationActuator;
    console.log(`  手柄 [${p.index}] ${p.id}:`);
    console.log('    vibrationActuator:', rawVA);
    console.log('    hapticActuators:', rawHA, '(type:', typeof rawHA, ')');
    if (rawHA) console.log('    hapticActuators.length:', rawHA.length);
    console.log('    actuator:', getActuator(p));
  }
  if (!_actuator) {
    console.warn('未检测到震动致动器。');
    if (/Firefox/i.test(navigator.userAgent)) {
      console.warn('Firefox 用户：请在 about:config 中将 dom.gamepad.extensions.enabled 设为 true');
      console.warn('设置后重启浏览器，重新接入手柄。');
    }
  }
  console.groupEnd();
}

// 挂到全局以便控制台直接调用
(window as any).rumbleDiagnostic = rumbleDiagnostic;