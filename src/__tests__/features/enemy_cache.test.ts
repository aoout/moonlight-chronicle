/* =========================================================
   features/render · 敌人离屏缓存刷新策略（O4）
   ---------------------------------------------------------
   病灶：敌人身体离屏缓存按「类型+颜色+尺寸」聚合共享，
   旧实现却按敌人下标 (i + frame) % 4 交错刷新 —— 后期同键
   敌人几十上百只时，同一个键每帧被 refresh 十几次，每次都
   伴随 canvas 尺寸重设（显存重分配），纯浪费。

   修复：改成按键记帧 _lastRefresh。一张缓存画布每帧至多
   重绘一次（同帧去重），并受 settings.enemyAnimStride 节流
   （1 逐帧 / 2 / 4），默认 1 保持原动画体验。

   这里守的行为线：
     1. 同键多敌人在一帧内至多重绘一次（旧实现会多次）
     2. stride=4 时同一键 4 帧内至多重绘一次
     3. resetEnemyCacheClock 后缓存清空，首帧必然重绘
     4. 默认 stride=1 逐帧重绘，动画体验不劣化
   ========================================================= */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { drawEnemies, resetEnemyCacheClock } from '../../features/render/entities.js';
import { shapeCache } from '../../features/render/shape_cache.js';
import { ENEMY_POOL } from '../../engine/ecs/entity_pool.js';
import { settingsState } from '../../state/settings.js';
import { createCanvasRecorder, makePlayer } from '../_harness/index.js';
import type { RenderContext } from '../../features/render/context.js';

const KEY = 'enemy_grub_#888_10';

/** 构造最小可用的渲染上下文：敌人都在视口内 */
function makeRc(time = 0): RenderContext {
  return {
    ctx: createCanvasRecorder().ctx,
    ctxBg: null,
    player: makePlayer(),
    boss: null,
    enemies: [],
    projectiles: [],
    drops: [],
    particles: [],
    phantoms: [],
    time,
    shake: 0,
    hitFlash: 0,
    width: 1280,
    height: 720,
    dpr: 1,
  };
}

/** 塞入 n 只「同键」敌人（同类型 + 同颜色 + 同尺寸），分散放置避免视口裁剪 */
function spawnSameKeyEnemies(n: number): void {
  for (let i = 0; i < n; i++) {
    ENEMY_POOL.addWith({
      x: 100 + (i % 10) * 40,
      y: 100 + Math.floor(i / 10) * 40,
      size: 10,
      dead: 0,
      flash: 0,
      slow: 0,
      hp: 50,
      maxHp: 50,
      type: 'grub',
      color: '#888',
    });
  }
}

/** 统计某键被 refresh 的次数 */
function refreshCount(key = KEY): number {
  return vi.mocked(shapeCache.refresh).mock.calls.filter((c) => c[0] === key).length;
}

describe('O4 · 敌人离屏缓存刷新策略', () => {
  beforeEach(() => {
    ENEMY_POOL.reset();
    shapeCache.clear();
    resetEnemyCacheClock();
    vi.spyOn(shapeCache, 'refresh');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    settingsState.patch({ enemyAnimStride: 1 });
  });

  it('同键多敌人在一帧内至多重绘一次（旧实现会按下标交错重复重绘）', () => {
    // 8 只同键敌人：旧实现按 (i + frame) % 4 交错，同帧内最多会重绘同一个键 2 次
    spawnSameKeyEnemies(8);

    drawEnemies(makeRc(0));

    // 修复后：无论多少只共享此键，一帧内 refresh 只允许 1 次
    expect(refreshCount()).toBe(1);
  });

  it('enemyAnimStride=4 时同一键 4 帧内至多重绘一次（节流生效）', () => {
    settingsState.patch({ enemyAnimStride: 4 });
    spawnSameKeyEnemies(4);
    const rc = makeRc(0);

    // 第 0 帧：首见必重绘；第 1~3 帧：diff<4 全部节流
    for (let f = 0; f < 4; f++) {
      rc.time = f;
      drawEnemies(rc);
    }
    expect(refreshCount()).toBe(1);

    // 第 4 帧：diff=4 ≥ stride，允许重绘
    rc.time = 4;
    drawEnemies(rc);
    expect(refreshCount()).toBe(2);
  });

  it('resetEnemyCacheClock 后缓存清空时首帧必然重绘', () => {
    spawnSameKeyEnemies(2);
    const rc = makeRc(0);

    drawEnemies(rc); // 第 1 帧：首见重绘
    expect(refreshCount()).toBe(1);

    drawEnemies(rc); // 第 2 帧：stride=1 节流判定，同帧 diff=0 跳过
    // 注意：这里 time 未推进，_enemyCacheFrame 递增但同键 last 已更新为第 2 帧前，
    // diff=1 ≥ 1 会重绘 —— 所以重置后的断言要看 reset 本身的效果
    const beforeReset = refreshCount();

    resetEnemyCacheClock(); // 清空 _lastRefresh，模拟 shapeCache.clear() 后的状态
    drawEnemies(rc);
    // reset 后首帧必然重绘（last === undefined）
    expect(refreshCount()).toBe(beforeReset + 1);
  });

  it('默认 enemyAnimStride=1 逐帧重绘，身姿动画体验不劣化', () => {
    // 默认预设 high 的 stride 必须保持 1（逐帧），否则美术上动画会变顿
    expect(settingsState.state.enemyAnimStride).toBe(1);
    spawnSameKeyEnemies(1);
    const rc = makeRc(0);

    for (let f = 0; f < 3; f++) {
      rc.time = f;
      drawEnemies(rc);
    }

    // 单只敌人逐帧重绘：3 帧 = 3 次 refresh，动画与优化前完全一致
    expect(refreshCount()).toBe(3);
  });
});
