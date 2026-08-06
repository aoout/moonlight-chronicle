/* =========================================================
   蚀月远征 · 现实月相计算
   「你的月亮」：守月人守护的月亮，映照玩家世界的夜空。
   依据朔望月周期（29.53058867 天）与 2000-01-06 18:14 UTC 的
   新月参考时刻，将一个月相周期均分为 8 相。
   支持注入时间戳，便于测试固定月相。
   ========================================================= */

export const MOON_NAMES = ['新月', '娥眉', '上弦', '盈凸', '满月', '亏凸', '下弦', '残月'] as const;

const SYNODIC = 29.53058867;               // 朔望月周期（天）
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14); // 参考新月时刻

/** 由时间戳计算现实月相（0=新月 … 7=残月，等分 8 段） */
export function moonPhaseAt(ms: number): number {
  const days = (ms - NEW_MOON_REF) / 86400000;
  const x = days / SYNODIC - Math.floor(days / SYNODIC);
  return Math.floor((x + 0.0625) * 8) % 8;
}

/** 月面照明度（0=新月 0% … 满月 100%） */
export function moonIlluminationAt(ms: number): number {
  const days = (ms - NEW_MOON_REF) / 86400000;
  const x = days / SYNODIC - Math.floor(days / SYNODIC);
  return (1 - Math.cos(x * Math.PI * 2)) / 2;
}

/** 当前现实月相 */
export function currentMoonPhase(): number {
  return moonPhaseAt(Date.now());
}

/** 当前月面照明度 */
export function currentMoonIllumination(): number {
  return moonIlluminationAt(Date.now());
}

const MOON_EFFECT_DESCS: Record<number, string> = {
  0: '闪避 +25%',
  1: '攻击 +15%，经验获取 +15%',
  2: '暴击率 +12%，攻速 +12%',
  3: '攻击 +10%，范围 +10%，投射物 +1',
  4: '攻击 +25%，暴伤 +25%',
  5: '生命上限 +15%（含等额回复），伤害转化护盾',
  6: '冷却缩减 +15%，受击生成护盾',
  7: '暴伤 +25%，击杀计数 → 必爆',
};

/** 获取当前月相的效果描述，用于商店和详情页展示 */
export function currentMoonPhaseDesc(): string {
  const ph = currentMoonPhase();
  const ill = Math.round(currentMoonIllumination() * 100);
  return `当前月相：<span class="stat-up">${MOON_NAMES[ph]}</span>（月面照明 ${ill}%），效果：<span class="stat-up">${MOON_EFFECT_DESCS[ph]}</span>。`;
}
