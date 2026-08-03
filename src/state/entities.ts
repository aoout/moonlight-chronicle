/* =========================================================
   蚀月远征 · 状态切片：实体列表
   所有游戏实体集合
   ========================================================= */
import { Store } from '../core/store.js';
import type {
  EnemyInstance, Projectile, Drop, Particle, Phantom,
} from '../types/core.d.ts';

export interface EntityState {
  enemies: EnemyInstance[];
  projectiles: Projectile[];
  drops: Drop[];
  particles: Particle[];
  phantoms: Phantom[];
}

const INITIAL: EntityState = {
  enemies: [],
  projectiles: [],
  drops: [],
  particles: [],
  phantoms: [],
};

export const entityState = new Store<EntityState>(INITIAL);

/** 便捷访问 */
export const eState = () => entityState.state;
