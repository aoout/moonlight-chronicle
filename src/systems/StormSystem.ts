/* =========================================================
   蚀月远征 · ECS System：风暴之眼（双核环绕弹幕）
   ========================================================= */
import { System } from '../core/system.js';
import { stormTick } from '../weapons/index.js';

export class StormSystem extends System {
  name = 'StormSystem';

  update(dt: number): void {
    stormTick(dt);
  }
}
