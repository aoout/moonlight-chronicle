/* =========================================================
   蚀月远征 · 事件类型常量
   集中管理所有 EventBus 事件名称，保证类型安全与可发现性
   ========================================================= */

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
};