/* =========================================================
   蚀月远征 · 暂停控制（UI 叶子模块）
   独立持有 PausePanel 单例与 togglePause，
   使 scheduler 与 mobile_action_bar 都只依赖它，消除两者循环引用。
   ========================================================= */
import { PausePanel } from './components/PausePanel.js';

export const pausePanel = new PausePanel();

/* ---------- 暂停（委托给组件） ---------- */
export function togglePause(): void {
  pausePanel.open();
}
