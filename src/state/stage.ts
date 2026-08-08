/* =========================================================
   蚀月远征 · 状态切片：关卡
   关卡流程、时间、Boss、深度、诅咒
   ========================================================= */
import { Store } from '../engine/core/store.js';
import { CONFIG } from '../config/stages.js';
import type { EnemyInstance, CurseDef } from '../types/core.d.ts';

export interface StageState {
  stage: number;
  stageTime: number;
  stageMax: number;
  stageName: string;
  time: number;
  spawnAcc: number;
  boss: EnemyInstance | null;
  depth: number;
  /** 当前局生效的蚀之诅咒（开局选择，深度 ≥5 时 2 个；真相源） */
  curses: CurseDef[];
  /** 兼容字段：curses 的第一个（旧存档 / 旧 UI 引用） */
  curse: CurseDef | null;
  unlocked: number;
  paused: boolean;
}

const INITIAL: StageState = {
  stage: 1,
  stageTime: 0,
  stageMax: CONFIG.STAGE_TIME,
  stageName: '',
  time: 0,
  spawnAcc: 0,
  boss: null,
  depth: 0,
  curses: [],
  curse: null,
  unlocked: 0,
  paused: false,
};

export const stageState = new Store<StageState>(INITIAL);

/** 便捷访问 */
export const sState = () => stageState.state;
