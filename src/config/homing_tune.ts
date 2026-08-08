/* =========================================================
   蚀月远征 · 追踪弹差异化调校（可操作性旋钮表）
   ---------------------------------------------------------
   追踪弹的"可操作性"由三个旋钮决定：
     turnRate  转向率（rad/s） —— 越低越钝，急转弯越容易甩开
     speedMax  极速（px/s）   —— 玩家基础移速 240；<240 可纯直线拖，
                                  >320 跑不赢只能靠转向差绕
     lockT     锁定秒数        —— 到期失锁，退化为直线（"拖过期"解法）
   每个 Boss 的追踪弹 = 一种解法指纹（绕圈甩 / 直线拖 / 急转骗 /
   撑时限 / 大圈绕 / 蛇形 / 雾里慢走…），避免千篇一律的"必中税"。
   ========================================================= */

export interface HomingTune {
  turnRate: number;
  speedMax: number;
  lockT: number;
}

export const HOMING_TUNE: Record<string, HomingTune> = {
  /* 蚀潮巨兽：最钝的球 —— 绕圈甩（边躲双层潮弹边遛球） */
  tidalWave:  { turnRate: 2.0, speedMax: 242, lockT: 3.2 },
  /* 潮噬之母：追不上但不失锁 —— 直线拖（清小怪时不能停，跑动中输出） */
  spawnTide:  { turnRate: 2.3, speedMax: 235, lockT: 4.5 },
  /* 噬月君主：敏锐但短命 —— 急转骗（躲完斩击一个急弯让它失锁） */
  moonSlash:  { turnRate: 3.2, speedMax: 289, lockT: 2.2 },
  /* 月影巫王·快球：双球分层应对的"先甩"层 */
  shadowOrbF: { turnRate: 2.4, speedMax: 255, lockT: 2.6 },
  /* 月影巫王·慢球：双球分层应对的"靠拖"层 */
  shadowOrbS: { turnRate: 1.9, speedMax: 235, lockT: 3.2 },
  /* 断月剑豪：斩击的延伸 —— 撑时限（最凶最短命，和剑芒同生共死） */
  triSlash:   { turnRate: 4.2, speedMax: 306, lockT: 1.5 },
  /* 裂空魔龙：极速跑不赢 —— 大圈绕（在火焰扇形里绕大圈甩火球） */
  breath:     { turnRate: 2.6, speedMax: 365, lockT: 3.0 },
  /* 蚀雷巨枭：与落雷共舞 —— 蛇形（追踪弹逼你不能直着钻雷缝） */
  lightning:  { turnRate: 3.0, speedMax: 298, lockT: 2.4 },
  /* 深渊巢母：最钝同速 —— 雾里慢走（毒雾减速下选最短路线） */
  acidMist:   { turnRate: 1.8, speedMax: 235, lockT: 4.5 },
  /* 蚀月终焉：终焉级压迫 —— 撑时限（4 球难甩，策略是等失锁不是尝试甩） */
  eclipse:    { turnRate: 3.6, speedMax: 360, lockT: 2.0 },
  /* 通用弹幕波：中规中矩 */
  wave:       { turnRate: 2.8, speedMax: 272, lockT: 2.8 },
  /* 通用召唤：温和 */
  minions:    { turnRate: 2.6, speedMax: 255, lockT: 3.0 },
};
