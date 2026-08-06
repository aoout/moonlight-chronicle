/* =========================================================
   蚀月远征 · 状态切片：输入
   按键状态 + 手柄状态
   ========================================================= */
import { Store } from '../engine/core/store.js';

export interface GamepadSlice {
  /** 是否有手柄接入 */
  connected: boolean;
  /** 左摇杆 / D-Pad / 虚拟摇杆合成的移动向量（已含死区） */
  moveX: number;
  moveY: number;
  /** 最近一次手柄输入的时间戳（ms） */
  lastInputAt: number;
  /** 虚拟摇杆是否活跃中（触摸设备） */
  touchActive: boolean;
}

export interface InputState {
  keys: Record<string, boolean>;
  gamepad: GamepadSlice;
}

const INITIAL: InputState = {
  keys: {},
  gamepad: { connected: false, moveX: 0, moveY: 0, lastInputAt: 0, touchActive: false },
};

export const inputState = new Store<InputState>(INITIAL);

/** 便捷访问 */
export const iState = () => inputState.state;
