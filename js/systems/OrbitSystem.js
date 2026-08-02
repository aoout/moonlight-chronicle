// @ts-check
/* =========================================================
   蚀月远征 · ECS System：环舞之刃 + 月影残像
   ========================================================= */
import { System } from '../core/system.js';
import { orbitTick, phantomTick } from '../weapons/index.js';

export class OrbitSystem extends System {
  name = 'OrbitSystem';

  /** @param {number} dt */
  update(dt) {
    orbitTick(dt);
    phantomTick(dt);
  }
}