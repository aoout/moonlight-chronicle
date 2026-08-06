/* =========================================================
   蚀月远征 · ECS System：批量压缩
   在所有系统更新完成后统一压缩实体池，
   替代各系统分别 compact，减少遍历次数并改善缓存局部性
   ========================================================= */
import { System } from '../engine/core/system.js';
import { world } from '../engine/ecs/World.js';

export class CompactSystem extends System {
  name = 'CompactSystem';

  update(_dt: number): void {
    world.compactAll();
  }
}