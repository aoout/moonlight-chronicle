/* =========================================================
   蚀月远征 · 蚀月功勋（成就系统定义）
   守月人在月背留下的荣耀刻痕。
   cumulative = 跨局累计计数；single = 单局达成。
   rarity: common 寻常 / rare 非凡 / epic 史诗 / legend 传奇
   ========================================================= */

export type AchRarity = 'common' | 'rare' | 'epic' | 'legend';
export type AchKind = 'kill' | 'boss' | 'gold' | 'stage' | 'run' | 'level' | 'weapon' | 'item' | 'dodge' | 'crit' | 'codex' | 'depth' | 'damage' | 'shield' | 'thorns' | 'starfall' | 'chain' | 'boom' | 'timestop' | 'custom';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string;              // ICONS 键
  rarity: AchRarity;
  cumulative: boolean;       // true=跨局累计计数 / false=单局达成
  kind: AchKind;
  target: number;            // 目标值（计数型）
  hint?: string;             // 未解锁时的提示（世界观化）
}

export const ACHIEVEMENTS: AchievementDef[] = [
  /* ============ 累计计数（跨局） ============ */
  { id: 'a_kill_100',   name: '初踏月土', desc: '累计击杀 100 名蚀物。', icon: 'dotRing', rarity: 'common', cumulative: true, kind: 'kill', target: 100, hint: '月背上蠕动的第一片阴影' },
  { id: 'a_kill_1000',  name: '猎月者', desc: '累计击杀 1,000 名蚀物。', icon: 'moon', rarity: 'rare', cumulative: true, kind: 'kill', target: 1000, hint: '月光认得你每一次挥刃' },
  { id: 'a_kill_5000',  name: '蚀月屠夫', desc: '累计击杀 5,000 名蚀物。', icon: 'skull', rarity: 'epic', cumulative: true, kind: 'kill', target: 5000, hint: '蚀潮见你，潮退三丈' },
  { id: 'a_kill_20000', name: '灭潮者', desc: '累计击杀 20,000 名蚀物。', icon: 'storm', rarity: 'legend', cumulative: true, kind: 'kill', target: 20000, hint: '月背再无潮，只有你的名字' },
  { id: 'a_boss_5',     name: '领主之惧', desc: '累计击杀 5 位蚀月领主。', icon: 'crown', rarity: 'rare', cumulative: true, kind: 'boss', target: 5, hint: '领主之名，第一次被凡人所取' },
  { id: 'a_boss_30',    name: '噬月终结', desc: '累计击杀 30 位蚀月领主。', icon: 'moonFull', rarity: 'legend', cumulative: true, kind: 'boss', target: 30, hint: '蚀月之上的王座，已为你空悬' },
  { id: 'a_gold_2000',  name: '拾金不昧', desc: '累计获得 2,000 金币。', icon: 'coin', rarity: 'common', cumulative: true, kind: 'gold', target: 2000, hint: '月幕集市的第一个老主顾' },
  { id: 'a_gold_20000', name: '月下巨贾', desc: '累计获得 20,000 金币。', icon: 'goldChest', rarity: 'epic', cumulative: true, kind: 'gold', target: 20000, hint: '连蚀月都向你赊账' },
  { id: 'a_stage_30',   name: '守夜人', desc: '累计撑过 30 夜。', icon: 'hourglass', rarity: 'common', cumulative: true, kind: 'stage', target: 30, hint: '每一夜，月光都多记住你一分' },
  { id: 'a_stage_200',  name: '百夜守望', desc: '累计撑过 200 夜。', icon: 'moonFull', rarity: 'legend', cumulative: true, kind: 'stage', target: 200, hint: '你已与蚀月对峙了两百个黎明' },
  { id: 'a_run_10',     name: '深空旅人', desc: '累计完成 10 次远征。', icon: 'tideOath', rarity: 'rare', cumulative: true, kind: 'run', target: 10, hint: '远征之门为你常开' },
  { id: 'a_run_50',     name: '百战之躯', desc: '累计完成 50 次远征。', icon: 'expeditionBook', rarity: 'legend', cumulative: true, kind: 'run', target: 50, hint: '守月人的传说，在月背上刻了五十道痕' },
  { id: 'a_codex_half', name: '图鉴学者', desc: '蚀之图鉴解锁半数。', icon: 'book', rarity: 'rare', cumulative: true, kind: 'codex', target: 50, hint: '月光之下，没有你未见之物' },
  { id: 'a_codex_all',  name: '图鉴大师', desc: '蚀之图鉴全数解锁。', icon: 'book', rarity: 'legend', cumulative: true, kind: 'codex', target: 100, hint: '你所见的一切，皆已烙入月光' },

  /* ============ 单局达成 ============ */
  { id: 'a_beat_6',     name: '破晓之光', desc: '击败第一位蚀月领主。', icon: 'moon', rarity: 'common', cumulative: false, kind: 'stage', target: 6, hint: '蚀潮的第一道裂缝' },
  { id: 'a_beat_12',    name: '潮汐之惧', desc: '通关第 12 夜。', icon: 'tideOath', rarity: 'rare', cumulative: false, kind: 'stage', target: 12, hint: '潮声在你耳中已成了战歌' },
  { id: 'a_beat_18',    name: '深渊之影', desc: '通关第 18 夜。', icon: 'half', rarity: 'epic', cumulative: false, kind: 'stage', target: 18, hint: '深渊望着你，你却望着前方' },
  { id: 'a_beat_20',    name: '月蚀终焉', desc: '通关第 20 夜，斩落蚀月终焉。', icon: 'sun', rarity: 'legend', cumulative: false, kind: 'stage', target: 20, hint: '蚀月陨落，黎明终于垂怜月背' },
  { id: 'a_noHit_stage', name: '无伤之夜', desc: '某一夜未受任何伤害通关。', icon: 'shield', rarity: 'epic', cumulative: false, kind: 'custom', target: 1, hint: '蚀物的爪牙，连你的衣角都触不到' },
  { id: 'a_noHit_run',  name: '完美远征', desc: '全程未受伤通关终焉。', icon: 'moonFull', rarity: 'legend', cumulative: false, kind: 'custom', target: 1, hint: '蚀月倾其所有，却伤不了你分毫' },
  { id: 'a_kill_500',   name: '屠潮盛宴', desc: '单局击杀 500 名蚀物。', icon: 'crossbow', rarity: 'rare', cumulative: false, kind: 'kill', target: 500, hint: '蚀潮成宴，你是唯一的宾客' },
  { id: 'a_kill_3000',  name: '万军之潮', desc: '单局击杀 3,000 名蚀物。', icon: 'storm', rarity: 'legend', cumulative: false, kind: 'kill', target: 3000, hint: '月背之潮，被你一人饮尽' },
  { id: 'a_level_15',   name: '满级之月', desc: '单局升到 15 级。', icon: 'star', rarity: 'rare', cumulative: false, kind: 'level', target: 15, hint: '月光为你的修行加冕' },
  { id: 'a_level_30',   name: '月之巅峰', desc: '单局升到 30 级。', icon: 'sun', rarity: 'legend', cumulative: false, kind: 'level', target: 30, hint: '你已站在月光之巅' },
  { id: 'a_gold_1000',  name: '富翁之夜', desc: '单局攒下 1,000 金币。', icon: 'coin', rarity: 'rare', cumulative: false, kind: 'gold', target: 1000, hint: '月幕集市为你清空货架' },
  { id: 'a_gold_8000',  name: '金币如雨', desc: '单局攒下 8,000 金币。', icon: 'goldChest', rarity: 'legend', cumulative: false, kind: 'gold', target: 8000, hint: '连蚀月都嫉妒你的富有' },
  { id: 'a_weapon_5',   name: '全副武装', desc: '单局拥有 5 把武器。', icon: 'sword', rarity: 'epic', cumulative: false, kind: 'weapon', target: 5, hint: '五刃同辉，月光为之让路' },
  { id: 'a_item_15',    name: '秘宝满仓', desc: '单局获得 15 个道具。', icon: 'gem', rarity: 'epic', cumulative: false, kind: 'item', target: 15, hint: '你的行囊里装着整座月幕集市' },
  { id: 'a_dmg_2000',   name: '一锤定音', desc: '单次伤害突破 2,000。', icon: 'meteor', rarity: 'legend', cumulative: false, kind: 'damage', target: 2000, hint: '一击之下，蚀月也要侧目' },
  { id: 'a_crit_200',   name: '暴击之月', desc: '单局暴击 200 次。', icon: 'diamond', rarity: 'rare', cumulative: false, kind: 'crit', target: 200, hint: '你的每一刃都落在要害' },
  { id: 'a_dodge_150',  name: '闪电步伐', desc: '单局闪避 150 次。', icon: 'windBoot', rarity: 'epic', cumulative: false, kind: 'dodge', target: 150, hint: '月影追不上你的衣角' },
  { id: 'a_thorns_15',  name: '荆棘之誓', desc: '单局反伤击杀 15 名蚀物。', icon: 'thornCrown', rarity: 'rare', cumulative: false, kind: 'thorns', target: 15, hint: '伤你者，必自伤' },
  { id: 'a_starfall_30', name: '星陨如雨', desc: '单局群星陨落击杀 30 名蚀物。', icon: 'starfall', rarity: 'epic', cumulative: false, kind: 'starfall', target: 30, hint: '你呼唤的群星，从不落空' },
  { id: 'a_chain_30',   name: '链雷天罚', desc: '单局连锁闪电击杀 30 名蚀物。', icon: 'stormChain', rarity: 'epic', cumulative: false, kind: 'chain', target: 30, hint: '雷霆在你指尖成网' },
  { id: 'a_boom_50',    name: '爆裂美学', desc: '单局爆炸击杀 50 名蚀物。', icon: 'boomCore', rarity: 'rare', cumulative: false, kind: 'boom', target: 50, hint: '每一场爆炸，都是一幅月下的画' },
  { id: 'a_boss_noHit', name: '无伤领主', desc: '单局无伤击杀 3 位蚀月领主。', icon: 'crown', rarity: 'legend', cumulative: false, kind: 'boss', target: 3, hint: '领主在你面前，如潮水退去' },
  { id: 'a_moon_only',  name: '孤月远征', desc: '仅用初始武器通关第 20 夜。', icon: 'wMoonRing', rarity: 'legend', cumulative: false, kind: 'custom', target: 1, hint: '一刃一月光，足矣' },
  { id: 'a_no_death',   name: '一命传奇', desc: '从未死亡通关终焉。', icon: 'moonFull', rarity: 'legend', cumulative: false, kind: 'custom', target: 1, hint: '死亡未曾追上过你' },
  { id: 'a_fast_boss',  name: '迅捷如影', desc: '90 秒内通关一个领主夜。', icon: 'windBoot', rarity: 'epic', cumulative: false, kind: 'custom', target: 1, hint: '领主尚未看清你，潮已平息' },
  { id: 'a_depth9',     name: '深空之王', desc: '在蚀月深度 9 通关第 20 夜。', icon: 'moonFull', rarity: 'legend', cumulative: false, kind: 'depth', target: 9, hint: '深渊之底，你是唯一的光' },
  { id: 'a_shield_800', name: '护盾如壁', desc: '单局护盾吸收 800 伤害。', icon: 'starShield', rarity: 'rare', cumulative: false, kind: 'shield', target: 800, hint: '月光在你身前砌成坚壁' },
  { id: 'a_critdmg_100k', name: '暴击洪流', desc: '单局暴击伤害总和 100,000。', icon: 'diamond', rarity: 'legend', cumulative: false, kind: 'crit', target: 100000, hint: '你的暴击，汇成月下洪流' },
  { id: 'a_timestop_5', name: '时之观者', desc: '单局触发时之残响 5 次。', icon: 'frozenHourglass', rarity: 'rare', cumulative: false, kind: 'timestop', target: 5, hint: '你让时间在月背驻足' },
  { id: 'a_item_legend3', name: '秘宝收藏家', desc: '单局同时拥有 3 个神恩道具。', icon: 'moonGem', rarity: 'epic', cumulative: false, kind: 'item', target: 3, hint: '神恩与你同行' },
];

export const ACH_RARITY_ORDER: Record<AchRarity, number> = { common: 0, rare: 1, epic: 2, legend: 3 };
