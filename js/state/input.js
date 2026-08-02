/* =========================================================
   蚀月远征 · 状态切片：输入
   按键状态
   ========================================================= */
import { Store } from '../core/store.js';

const INITIAL = {
  keys: {},
};

/** @type {Store<typeof INITIAL>} */
export const inputState = new Store(INITIAL);

/** 便捷访问 */
export const iState = () => inputState.state;