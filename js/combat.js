/* =========================================================
   蚀月远征 · 战斗层 — 重导出入口
   所有战斗逻辑已迁移至 systems/CombatSystem.js
   保留此文件为向后兼容的重导出代理
   ========================================================= */
export {
  calcDamage,
  damageEnemy,
  killEnemy,
  hurtPlayer,
  healPlayer,
  meleeHit,
  spawnDrop,
  boomExplosion,
} from './systems/CombatSystem.js';