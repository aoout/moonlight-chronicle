/* =========================================================
   蚀月远征 · 状态切片：输入
   按键状态
   ========================================================= */
import { Store } from '../core/store.js';

export interface InputState {
  keys: Record<string, boolean>;
}

const INITIAL: InputState = {
  keys: {},
};

export const inputState = new Store<InputState>(INITIAL);

/** 便捷访问 */
export const iState = () => inputState.state;
