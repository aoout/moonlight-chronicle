/* =========================================================
   蚀月远征 · 全局状态 + 状态常量 + 状态机
   状态切片策略：新代码直接导入 Store，G 作为向后兼容的 Proxy 聚合层
   ========================================================= */
import { CONFIG } from './data/index.js';
import { StateMachine } from './core/state_machine.js';
import { playerState } from './state/player.js';
import { stageState } from './state/stage.js';
import { statsState } from './state/stats.js';
import { renderState } from './state/render.js';
import { inputState } from './state/input.js';
import { entityState } from './state/entities.js';
import type { Store } from './core/store.js';
import type { GState } from './types/core.d.ts';

/* 重新导出 Store 实例，供新代码直接导入使用 */
export { playerState } from './state/player.js';
export { stageState } from './state/stage.js';
export { statsState } from './state/stats.js';
export { renderState } from './state/render.js';
export { inputState } from './state/input.js';
export { entityState } from './state/entities.js';

/* 游戏状态常量枚举 */
export const STATE = {
  MENU: 'menu',
  PLAYING: 'playing',
  LEVELUP: 'levelup',
  SHOP: 'shop',
  OVER: 'over',
  WIN: 'win',
  RESULT: 'result',
} as const;

/* 状态机定义 */
export const sm = new StateMachine({
  initial: STATE.MENU,
  states: {
    [STATE.MENU]:     { transitions: [STATE.PLAYING] },
    [STATE.PLAYING]:  { transitions: [STATE.LEVELUP, STATE.SHOP, STATE.OVER, STATE.WIN, STATE.MENU] },
    [STATE.LEVELUP]:  { transitions: [STATE.PLAYING] },
    [STATE.SHOP]:     { transitions: [STATE.PLAYING] },
    [STATE.OVER]:     { transitions: [STATE.RESULT] },
    [STATE.WIN]:      { transitions: [STATE.RESULT] },
    [STATE.RESULT]:   { transitions: [STATE.MENU, STATE.PLAYING] },
  },
});

/* Store 到属性前缀的映射表，用于 G Proxy 路由 */
interface StoreMapEntry {
  store: Store<any>;
  prefix: string;
  props: string[];
}

const STORE_MAP: StoreMapEntry[] = [
  { store: playerState,  prefix: 'player', props: ['player', 'weaponCd', 'weaponCdFull'] },
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

/** G Proxy 内部状态 */
interface GInternal {
  state: string;
  stageMax: number;
  xpNeeded: number;
  levelUpOpen: boolean;
  shopOpen: boolean;
  _resumeState: string;
  _timeScale: number;
  _echoSlowT: number;
  _dynamic: Record<string, any>;
}

/**
 * 向后兼容的 G 对象 — 通过 Proxy 代理到各 Store
 * 读取：G.player → playerState.get('player')
 * 写入：G.gold = 100 → statsState.set('gold', 100)
 */
export const G: GState & Record<string, any> = new Proxy<GInternal>({
  state: STATE.MENU,
  stageMax: CONFIG.STAGE_TIME,
  xpNeeded: CONFIG.XP_PER_LEVEL,
  levelUpOpen: false,
  shopOpen: false,
  _resumeState: STATE.PLAYING,
  _timeScale: 1,
  _echoSlowT: 0,
  _dynamic: {},
}, {
  get(target: GInternal, prop: string | symbol): any {
    if (typeof prop === 'string') {
      if (prop === 'state') return target.state;
      if (prop === 'stageMax') return target.stageMax;
      if (prop === 'xpNeeded') return target.xpNeeded;
      if (prop === 'levelUpOpen') return target.levelUpOpen;
      if (prop === 'shopOpen') return target.shopOpen;
      if (prop === '_resumeState') return target._resumeState;
      if (prop === '_timeScale') return target._timeScale;
      if (prop === '_echoSlowT') return target._echoSlowT;
      if (prop === '_dynamic') return target._dynamic;
      const store = findStore(prop);
      if (store) return store.get(prop as any);
      if (prop in target._dynamic) return target._dynamic[prop];
    }
    return undefined;
  },
  set(target: GInternal, prop: string | symbol, value: any): boolean {
    if (typeof prop !== 'string') return true;
    if (prop === 'state') { target.state = value; return true; }
    if (prop === 'stageMax') { target.stageMax = value; return true; }
    if (prop === 'xpNeeded') { target.xpNeeded = value; return true; }
    if (prop === 'levelUpOpen') { target.levelUpOpen = value; return true; }
    if (prop === 'shopOpen') { target.shopOpen = value; return true; }
    if (prop === '_resumeState') { target._resumeState = value; return true; }
    if (prop === '_timeScale') { target._timeScale = value; return true; }
    if (prop === '_echoSlowT') { target._echoSlowT = value; return true; }
    if (prop === '_dynamic') { target._dynamic = value; return true; }
    const store = findStore(prop);
    if (store) { store.set(prop as any, value); return true; }
    target._dynamic[prop] = value;
    return true;
  },
  has(target: GInternal, prop: string | symbol): boolean {
    if (typeof prop === 'string' && prop in target) return true;
    if (findStore(prop)) return true;
    return typeof prop === 'string' && prop in target._dynamic;
  },
  ownKeys(target: GInternal): (string | symbol)[] {
    const staticKeys = ['state', 'stageMax', 'xpNeeded', 'levelUpOpen', 'shopOpen', '_resumeState', '_timeScale', '_echoSlowT'];
    const storeKeys = STORE_MAP.flatMap(e => e.props);
    const dynamicKeys = Object.keys(target._dynamic);
    return [...staticKeys, ...storeKeys, ...dynamicKeys];
  },
}) as any;

// 状态机同步：每次状态转换后更新 G.state
sm.onTransition('*', '*', () => { G.state = sm.current; });

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
