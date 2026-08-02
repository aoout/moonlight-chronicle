// @ts-check
/* =========================================================
   蚀月远征 · ECS Systems 统一导出
   ========================================================= */
import { SystemManager } from '../core/system_manager.js';
import { CombatSystem } from './CombatSystem.js';
import { PlayerSystem } from './PlayerSystem.js';
import { BossCheckSystem } from './BossCheckSystem.js';
import { SpawnSystem } from './SpawnSystem.js';
import { SpatialSystem } from './SpatialSystem.js';
import { ProjectileSystem } from './ProjectileSystem.js';
import { DropSystem } from './DropSystem.js';
import { EnemySystem } from './EnemySystem.js';
import { OrbitSystem } from './OrbitSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { StageTimerSystem } from './StageTimerSystem.js';

/**
 * 创建并注册所有 ECS System，返回 SystemManager 实例
 * 注册顺序即 update 执行顺序，与原有逻辑保持一致：
 *   Boss检查 → 玩家更新 → 敌人生成 → 空间网格 → 投射物 → 掉落物 → 敌人 → 环绕 → 粒子 → 关卡计时
 */
export function createSystemManager() {
  const sm = new SystemManager();

  // 注册系统类（SystemManager 自动注入依赖）
  sm.add(BossCheckSystem);    // 0: Boss 死亡检查（兜底，早于其他逻辑）
  sm.add(PlayerSystem);       // 1: 玩家诅咒/光环/时停/移动/回血/武器
  sm.add(CombatSystem);       // 2: 战斗逻辑（事件驱动，空 update）
  sm.add(SpawnSystem);        // 3: 敌人生成
  sm.add(SpatialSystem);      // 4: 空间哈希网格重建
  sm.add(ProjectileSystem);   // 5: 投射物更新+压缩
  sm.add(DropSystem);         // 6: 掉落物更新+压缩
  sm.add(EnemySystem);        // 7: 敌人更新+压缩
  sm.add(OrbitSystem);        // 8: 环舞之刃+月影残像
  sm.add(ParticleSystem);     // 9: 粒子更新+压缩
  sm.add(StageTimerSystem);   // 10: 关卡计时

  return sm;
}