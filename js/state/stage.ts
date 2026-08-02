/* =========================================================
   蚀月远征 · 状态切片：关卡
   关卡流程、时间、Boss、深度、诅咒
   ========================================================= */
import { Store } from '../core/store.js';
import type { EntityView } from '../entity_pool.js';

interface StageState {
  stage: number;
  stageTime: number;
  stageMax: number;
  stageName: string;
  time: number;
  spawnAcc: number;
  boss: EntityView | null;
  depth: number;
  curse: any | null;
  unlocked: number;
  paused: boolean;
}

const INITIAL: StageState = {
  stage: 1,
  stageTime: 0,
  stageMax: 300,
  stageName: '',
  time: 0,
  spawnAcc: 0,
  boss: null,
  depth: 0,
  curse: null,
  unlocked: 0,
  paused: false,
};

export const stageState = new Store<StageState>(INITIAL);

/** 便捷访问 */
export const sState = () => stageState.state;
