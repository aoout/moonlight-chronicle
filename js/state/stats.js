/* =========================================================
   蚀月远征 · 状态切片：统计
   击杀数、金币、经验、等级、战斗统计
   ========================================================= */

export const statsState = {
  kills: 0,
  gold: 0,
  xp: 0,
  xpNeeded: 100,
  level: 1,
  levelQueue: 0,
  runStats: { totalDmg: 0, bossKills: 0, win: false, wDmg: {} },
};