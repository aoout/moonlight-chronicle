/* =========================================================
   蚀月远征 · 领域端口：成就汇报
   领域层只知道「有事发生要上报 / 需要读成就数」，不知道成就系统的存在。
   具体实现由 systems/AchievementSystem 在加载时注册（依赖倒置）。

   用直接函数引用而非 EventBus：achOnDamage 属于每帧高频调用，
   避免事件对象分配带来的 GC 压力。
   ========================================================= */

export interface AchievementSink {
  onDamage(dmg: number, crit: boolean): void;
  onHurt(): void;
  onDodge(): void;
  onShieldAbsorb(amount: number): void;
  onWeapon(): void;
  /** 已解锁成就总数（「成就审判」词条按此增益） */
  earnedTotal(): number;
}

const NOOP: AchievementSink = {
  onDamage() {}, onHurt() {}, onDodge() {}, onShieldAbsorb() {}, onWeapon() {},
  earnedTotal() { return 0; },
};

let _sink: AchievementSink = NOOP;

/** 由成就系统在模块加载时调用 */
export function setAchievementSink(sink: AchievementSink): void { _sink = sink; }

/** 领域层取用 */
export function achievements(): AchievementSink { return _sink; }
