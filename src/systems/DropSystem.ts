/* =========================================================
   蚀月远征 · ECS System：掉落物更新 + 压缩（生命周期壳）
   实际掉落逻辑已迁至 domain/drop.ts
   ========================================================= */
import { System } from '../core/system.js';
import { world } from '../ecs/World.js';
import { dropTick } from '../domain/drop.js';

export class DropSystem extends System {
  name = 'DropSystem';

  update(dt: number): void {
    const drops = world.query('drops');
    for (const d of drops) dropTick(d, dt);
    world.compact('drops', d => !!d.take);
  }
}
