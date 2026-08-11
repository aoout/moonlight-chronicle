/* =========================================================
   蚀月远征 · 手柄震动战斗集成
   通过 EventBus 监听战斗事件，自动触发对应震动预设。
   与 combat.ts 零耦合，新增/移除震动仅需调整下方映射表。
   ========================================================= */
import { EVENTS } from '../../engine/core/events.js';
import { EventBus } from '../../engine/core/event_bus.js';
import { rumble, rumbleHit, rumbleHeavy, rumbleDamage, rumbleExplosion, rumbleCancel } from './gamepad_vibration.js';

/* ---------- 事件-震动映射表 ---------- */
/* 在此一行登记新的事件映射，无需修改其他逻辑 */

interface CombatHitPayload {
  target: { x: number; y: number };
  damage: number;
  crit?: boolean;
  srcType?: string;
  srcW?: string;
}

interface PlayerHurtPayload {
  damage: number;
  hp: number;
  maxHp: number;
}

/* ---------- 初始化 ---------- */

let _initialized = false;

export function initVibrationIntegration(): void {
  if (_initialized) return;
  _initialized = true;

  /* 命中敌人（区分暴击 vs 普通） */
  EventBus.on(EVENTS.COMBAT_HIT, (payload: CombatHitPayload) => {
    if (payload.crit) {
      rumbleHeavy();
    } else {
      rumbleHit();
    }
  });

  /* 玩家受击 */
  EventBus.on(EVENTS.PLAYER_HURT, (payload: PlayerHurtPayload) => {
    rumbleDamage();
  });

  /* 玩家死亡 */
  EventBus.on(EVENTS.PLAYER_DIED, () => {
    rumbleCancel();
  });

  /* 爆炸（爆裂之核 / 自爆） */
  EventBus.on(EVENTS.VFX_EXPLOSION, () => {
    rumbleExplosion();
  });

  /* 近战范围攻击（Boss 重击、小怪拍击） */
  EventBus.on(EVENTS.COMBAT_MELEE, () => {
    rumbleDamage();
  });

  /* 击杀 Boss（重震庆祝） */
  EventBus.on(EVENTS.BOSS_KILLED, () => {
    rumbleHeavy();
  });
}