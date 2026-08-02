/* =========================================================
   蚀月远征 · 全局状态聚合层
   状态切片：新代码直接导入 Store；G 作为向后兼容的 Proxy 聚合层
   ========================================================= */
import { CONFIG } from './data/index.js';
import { STATE, sm } from './core/states.js';
import { playerState } from './state/player.js';
import { stageState } from './state/stage.js';
import { statsState } from './state/stats.js';
import { renderState } from './state/render.js';
import { inputState } from './state/input.js';
import { entityState } from './state/entities.js';
import { gameState } from './state/game.js';
import type { Store } from './core/store.js';
import type { GState } from './types/core.d.ts';

/* 重新导出 Store 实例，供新代码直接导入使用 */
export { playerState } from './state/player.js';
export { stageState } from './state/stage.js';
export { statsState } from './state/stats.js';
export { renderState } from './state/render.js';
export { inputState } from './state/input.js';
export { entityState } from './state/entities.js';
export { gameState } from './state/game.js';

/* 重新导出状态常量与状态机实例（向后兼容） */
export { STATE, sm } from './core/states.js';

/* Store 到属性前缀的映射表，用于 G Proxy 路由 */
interface StoreMapEntry {
  store: Store<any>;
  prefix: string;
  props: string[];
}

const STORE_MAP: StoreMapEntry[] = [
  { store: playerState,  prefix: 'player', props: ['player', 'weaponCd', 'weaponCdFull'] },
  { store: gameState,    prefix: 'game',   props: ['state', 'levelUpOpen', 'shopOpen', '_resumeState', '_timeScale', '_echoSlowT'] },
  { store: stageState,   prefix: 'stage',  props: ['stage', 'stageTime', 'stageMax', 'stageName', 'time', 'spawnAcc', 'boss', 'depth', 'curse', 'unlocked', 'paused'] },
  { store: statsState,   prefix: 'stats',  props: ['kills', 'gold', 'xp', 'xpNeeded', 'level', 'levelQueue', 'runStats'] },
  { store: renderState,  prefix: 'render', props: ['shake', 'hitFlash', 'timestopTimer', 'width', 'height', 'canvas', 'ctx', 'ctxBg'] },
  { store: inputState,   prefix: 'input',  props: ['keys'] },
  { store: entityState,  prefix: 'entity', props: ['enemies', 'projectiles', 'drops', 'particles', 'phantoms'] },
];

/** 查找属性所属的 Store */
function findStore(key: string | symbol): Store<any> | null {
  if (typeof key !== 'string') return null;
  for (const entry of STORE_MAP) {
    if (entry.props.includes(key)) {
      return entry.store;
    }
  }
  return null;
}

/**
 * 向后兼容的 G 对象 — 通过 Proxy 代理到各 Store
 * 读取：G.player → playerState.get('player')
 * 写入：G.gold = 100 → statsState.set('gold', 100)
 */
export const G: GState & Record<string, any> = new Proxy({} as Record<string, any>, {
  get(_target: Record<string, any>, prop: string | symbol): any {
    if (typeof prop !== 'string') return undefined;
    const store = findStore(prop);
    if (store) return store.get(prop as any);
    return undefined;
  },
  set(_target: Record<string, any>, prop: string | symbol, value: any): boolean {
    if (typeof prop !== 'string') return true;
    const store = findStore(prop);
    if (store) { store.set(prop as any, value); return true; }
    return true;
  },
  has(_target: Record<string, any>, prop: string | symbol): boolean {
    return findStore(prop) !== null;
  },
  ownKeys(): (string | symbol)[] {
    return STORE_MAP.flatMap(e => e.props);
  },
}) as any;

// 状态机同步：每次状态转换后更新 gameState.state
sm.onTransition('*', '*', () => { gameState.set('state', sm.current); });

/* 震屏 */
export function shakeScreen(n: number): void {
  renderState.set('shake', Math.max(renderState.get('shake'), n));
}

/* 关卡结算 */
export function endStage(_early?: boolean): void {
  sm.transition(STATE.SHOP);
}

/* 玩家死亡 */
export function playerDeath(): void {
  sm.transition(STATE.OVER);
}
