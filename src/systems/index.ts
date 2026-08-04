/* =========================================================
   蚀月远征 · ECS Systems 统一导出
   ========================================================= */
import { SystemManager } from '../core/system_manager.js';
import { PlayerSystem } from './PlayerSystem.js';
import { SpawnSystem } from './SpawnSystem.js';
import { SpatialSystem } from './SpatialSystem.js';
import { ProjectileSystem } from './ProjectileSystem.js';
import { DropSystem } from './DropSystem.js';
import { EnemySystem } from './EnemySystem.js';
import { OrbitSystem } from './OrbitSystem.js';
import { StormSystem } from './StormSystem.js';
import { ParticleSystem } from './ParticleSystem.js';
import { StageTimerSystem } from './StageTimerSystem.js';
import { entityState } from '../state/entities.js';

let _sysMan: SystemManager | null = null;

/**
 * 惰性获取 SystemManager 单例（首次调用时创建并初始化）
 * 替代原来的 DI 容器，避免 import 时的 TDZ 问题
 */
export function getSysMan(): SystemManager {
  if (!_sysMan) {
    _sysMan = createSystemManager();
    _sysMan.initWorld(entityState.state as any);
  }
  return _sysMan;
}

/**
 * 创建并注册所有 ECS System，返回 SystemManager 实例
 * 注册顺序即 update 执行顺序，与原有逻辑保持一致：
 *   玩家更新 → 敌人生成 → 空间网格 → 投射物 → 掉落物 → 敌人 → 环绕 → 粒子 → 关卡计时
 * 注：渲染由 render/index.ts 的独立 render() 函数处理，不纳入 ECS System 循环
 *     以避免每帧渲染 ≥2 次（SystemManager.update 内调用 + gameLoop 内独立调用）
 */
export function createSystemManager(): SystemManager {
  const sm = new SystemManager();

  // 注册系统类（SystemManager 自动注入依赖）
  sm.add(PlayerSystem);       // 0: 玩家诅咒/光环/时停/移动/回血/武器
  sm.add(SpawnSystem);        // 2: 敌人生成
  sm.add(SpatialSystem);      // 3: 空间哈希网格重建
  sm.add(ProjectileSystem);   // 4: 投射物更新+压缩
  sm.add(DropSystem);         // 5: 掉落物更新+压缩
  sm.add(EnemySystem);        // 6: 敌人更新+压缩
  sm.add(OrbitSystem);        // 7: 环舞之刃+月影残像
  sm.add(StormSystem);        // 8: 风暴之眼（双核环绕弹幕）
  sm.add(ParticleSystem);     // 9: 粒子更新+压缩
  sm.add(StageTimerSystem);   // 10: 关卡计时

  return sm;
}
