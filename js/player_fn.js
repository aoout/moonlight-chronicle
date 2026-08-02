/* =========================================================
   蚀月远征 · 玩家管理 — 重导出入口
   所有玩家管理逻辑已迁移至 systems/PlayerSystem.js
   保留此文件为向后兼容的重导出代理
   ========================================================= */
import { PlayerSystem } from './systems/PlayerSystem.js';

export const computeDerived = PlayerSystem.computeDerived;
export const createPlayer = PlayerSystem.createPlayer;
export const xpNeeded = PlayerSystem.xpNeeded;
export const addWeapon = PlayerSystem.addWeapon;
export const upgradeWeapon = PlayerSystem.upgradeWeapon;
export const removeWeapon = PlayerSystem.removeWeapon;
export const addGold = PlayerSystem.addGold;
export const gainXp = PlayerSystem.gainXp;