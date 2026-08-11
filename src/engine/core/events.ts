/* =========================================================
   蚀月远征 · 事件名常量表
   统一管理 EventBus 的全部事件名，避免裸字符串散落各处：
   - 拼写错误会在编译期暴露（而非静默失败）
   - 支持 IDE 跳转与重命名
   - 新事件必须登记于此，形成单一事实来源
   ========================================================= */

export const EVENTS = {
  /* ---- 战斗 ---- */
  COMBAT_HIT: 'combat:hit',
  COMBAT_MELEE: 'combat:melee',
  ENEMY_KILLED: 'enemy:killed',
  BOSS_KILLED: 'boss:killed',
  PLAYER_HURT: 'player:hurt',
  PLAYER_HEAL: 'player:heal',
  PLAYER_DIED: 'player:died',
  PLAYER_LEVELUP: 'player:levelup',
  VFX_EXPLOSION: 'vfx:explosion',

  /* ---- 流程 ---- */
  GAME_RUN_START: 'game:runStart',
  GAME_RUN_END: 'game:runEnd',
  STAGE_START: 'stage:start',
  STAGE_CLEARED: 'stage:cleared',
  PROGRESS_UNLOCKED: 'progress:unlocked',
  PAUSE_OPEN: 'pause:open',
  PAUSE_CLOSE: 'pause:close',
  SHOP_OPEN: 'shop:open',
  SHOP_CLOSE: 'shop:close',
  SHOP_PANEL_REFRESH: 'shop:panelRefresh',
  ACHIEVEMENT_UNLOCKED: 'achievement:unlocked',

  /* ---- 音频 ---- */
  AUDIO_SFX: 'audio:sfx',

  /* ---- UI ---- */
  UI_SPAWN_TEXT: 'ui:spawnText',
  UI_DMG_NUMBER: 'ui:dmgNumber',

  /* ---- 视觉特效 ---- */
  VISUAL_RING: 'visual:ring',
  VISUAL_BURST: 'visual:burst',
  VISUAL_SPARK: 'visual:spark',
  VISUAL_GLOW: 'visual:glow',
  VISUAL_STAR: 'visual:star',
  VISUAL_SHARD: 'visual:shard',
  VISUAL_STREAK: 'visual:streak',
  VISUAL_HIT_FX: 'visual:hitFx',
} as const;

/** 全部事件名的联合类型（供未来 EventBus 强类型化使用） */
export type GameEventName = (typeof EVENTS)[keyof typeof EVENTS];
