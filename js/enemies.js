/* =========================================================
   蚀月远征 · 敌人层 —— 统一导出入口（纯重导出）
   所有实现已迁移至各自系统/模块
   ========================================================= */

/* ---------- 统一导出：保留原有 API 兼容 ---------- */
export { spawnEnemy, spawnBoss, spawnEnemyProjectile } from './spawn.js';
export { calcDamage, damageEnemy, killEnemy, hurtPlayer, healPlayer, meleeHit, spawnDrop, boomExplosion } from './combat.js';
export { dropTick, collectDrop, explodeEnemy } from './drops.js';
export { bossTick, bossWave, bossMinions, bossDash } from './boss_skills.js';
export { ENEMY_SKILLS } from './enemy_skills.js';