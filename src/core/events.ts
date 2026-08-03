/* =========================================================
   蚀月远征 · 事件类型常量与事件映射
   集中管理所有 EventBus 事件名称与 payload 类型
   ========================================================= */

/** 事件名称常量 */
export const EVENTS = {
  /** 游戏运行开始 */
  GAME_RUN_START: 'game:runStart',
  /** 游戏运行结束 */
  GAME_RUN_END: 'game:runEnd',

  /** 关卡开始 */
  STAGE_START: 'stage:start',

  /** 商店打开 */
  SHOP_OPEN: 'shop:open',
  /** 商店关闭 */
  SHOP_CLOSE: 'shop:close',

  /** 玩家升级 */
  PLAYER_LEVELUP: 'player:levelup',
  /** 玩家受伤 */
  PLAYER_HURT: 'player:hurt',
  /** 玩家治疗 */
  PLAYER_HEAL: 'player:heal',
  /** 玩家死亡 */
  PLAYER_DIED: 'player:died',

  /** 敌人被击杀 */
  ENEMY_KILLED: 'enemy:killed',
  /** Boss 被击杀 */
  BOSS_KILLED: 'boss:killed',

  /** 战斗命中（用于统计/特效） */
  COMBAT_HIT: 'combat:hit',

  /* ========== 视觉特效（领域层 emit，渲染层 subscribe） ========== */
  /** 粒子爆发 */
  VISUAL_BURST: 'visual:burst',
  /** 光环扩散 */
  VISUAL_RING: 'visual:ring',
  /** 命中数字 */
  VISUAL_HIT_FX: 'visual:hitFx',
  /** 浮动文字 */
  UI_SPAWN_TEXT: 'ui:spawnText',

  /* ========== 音频（领域层 emit，音频层 subscribe） ========== */
  /** 播放音效 */
  AUDIO_SFX: 'audio:sfx',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/** 事件 payload 映射：每个事件名对应其 payload 类型 */
export interface EventMap {
  'game:runStart': { depth: number; curse: unknown };
  'game:runEnd': { win: boolean; stage: number; kills: number; gold: number };
  'stage:start': { stage: number; name: string; boss: boolean };
  'shop:open': { stage: number; gold: number };
  'shop:close': { stage: number };
  'player:levelup': { level: number; queue: number };
  'player:hurt': { damage: number; hp: number; maxHp: number };
  'player:heal': { amount: number; hp: number; maxHp: number };
  'player:died': void;
  'enemy:killed': { type: string; boss: boolean };
  'boss:killed': { type: string; stage: number };
  'combat:hit': { target: unknown; damage: number; crit: boolean; srcType?: string; srcW?: string };

  /* ========== 视觉特效 ========== */
  'visual:burst': { x: number; y: number; color: string; count: number };
  'visual:ring': { x: number; y: number; color: string; life: number; radius: number; width: number };
  'visual:hitFx': { x: number; y: number; dmg: number; crit: boolean };
  'ui:spawnText': { x: number; y: number; text: string; color?: string };
  'audio:sfx': { name: string };
}