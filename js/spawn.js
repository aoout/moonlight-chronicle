/* =========================================================
   蚀月远征 · 生成层 — 重导出入口
   所有生成逻辑已迁移至 systems/SpawnSystem.js
   保留此文件为向后兼容的重导出代理
   ========================================================= */
import { SpawnSystem } from './systems/SpawnSystem.js';

export const spawnEnemy = SpawnSystem.spawnEnemy;
export const spawnBoss = SpawnSystem.spawnBoss;
export const spawnEnemyProjectile = SpawnSystem.spawnEnemyProjectile;