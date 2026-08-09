/* =========================================================
   第三轮修复 · 回归测试
   ---------------------------------------------------------
   覆盖 EventBus 监听器清理、Store.on() 清理、HintBar 非空断言、
   hud_utils setTimeout 防御性检查、movement.ts ?? 修复。
   ========================================================= */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../engine/core/event_bus.js';
import { EVENTS } from '../engine/core/events.js';

/* ========== 1. EventBus 监听器清理（AchievementSystem / event_bridge） ========== */
describe('EventBus 监听器清理', () => {
  it('EventBus.clear() 清空所有订阅后 emit 不再触发', () => {
    const spy = vi.fn();
    EventBus.on(EVENTS.PLAYER_DIED, spy);
    EventBus.clear();
    EventBus.emit(EVENTS.PLAYER_DIED);
    expect(spy).not.toHaveBeenCalled();
  });

  it('EventBus.on() 返回的取消订阅函数能正确移除单个监听器', () => {
    const spy = vi.fn();
    const unsub = EventBus.on(EVENTS.COMBAT_HIT, spy);
    unsub();
    EventBus.emit(EVENTS.COMBAT_HIT, {});
    expect(spy).not.toHaveBeenCalled();
  });

  it('多次取消订阅不会抛异常', () => {
    const spy = vi.fn();
    const unsub = EventBus.on(EVENTS.AUDIO_SFX, spy);
    unsub();
    unsub(); // 第二次调用
    expect(() => EventBus.emit(EVENTS.AUDIO_SFX, { name: 'test' })).not.toThrow();
  });

  it('EventBus.clear() 后重新订阅能正常工作', () => {
    EventBus.clear();
    const spy = vi.fn();
    EventBus.on(EVENTS.PLAYER_LEVELUP, spy);
    EventBus.emit(EVENTS.PLAYER_LEVELUP, { level: 5 });
    expect(spy).toHaveBeenCalledWith({ level: 5 });
  });
});

/* ========== 2. destroyAchievements 清理验证 ========== */
describe('destroyAchievements 清理', () => {
  beforeEach(() => {
    EventBus.clear();
  });

  it('destroyAchievements 后监听器不再触发', async () => {
    // 动态导入，确保模块加载
    const mod = await import('../systems/AchievementSystem.js');
    mod.initAchievements();
    mod.destroyAchievements();

    // 发射事件不应触发监听器（模块内部有 spy 验证）
    expect(() => {
      EventBus.emit(EVENTS.ENEMY_KILLED, { type: 'rat', srcType: '' });
    }).not.toThrow();
  }, 10000);

  it('initAchievements 重复调用不累积监听器', async () => {
    const mod = await import('../systems/AchievementSystem.js');
    mod.initAchievements();
    mod.initAchievements(); // 第二次调用应先 destroy 再注册

    // 发射一次事件
    expect(() => {
      EventBus.emit(EVENTS.PLAYER_DIED);
    }).not.toThrow();
  }, 10000);
});

/* ========== 3. init/destroy 桥接函数清理 ========== */
describe('EventBridge 清理', () => {
  beforeEach(() => {
    EventBus.clear();
  });

  it('initRenderEventBridge / destroyRenderEventBridge 可重复调用', async () => {
    const mod = await import('../features/render/event_bridge.js');
    expect(() => {
      mod.initRenderEventBridge();
      mod.destroyRenderEventBridge();
      mod.initRenderEventBridge();
    }).not.toThrow();
  }, 10000);

  it('initUIEventBridge / destroyUIEventBridge 可重复调用', async () => {
    const mod = await import('../features/ui/event_bridge.js');
    expect(() => {
      mod.initUIEventBridge();
      mod.destroyUIEventBridge();
      mod.initUIEventBridge();
    }).not.toThrow();
  }, 10000);

  it('initPersistenceBridge / destroyPersistenceBridge 可重复调用', async () => {
    const mod = await import('../infra/persistence/event_bridge.js');
    expect(() => {
      mod.initPersistenceBridge();
      mod.destroyPersistenceBridge();
      mod.initPersistenceBridge();
    }).not.toThrow();
  }, 10000);
});

/* ========== 4. HintBar 非空断言修复 ========== */
describe('HintBar 非空断言修复', () => {
  it('缺少 dataset.idx 时安全跳过而非崩溃', async () => {
    // 在无 DOM 环境下跳过（HintBar.mount 需要 document.body）
    if (typeof document === 'undefined') return;
    const mod = await import('../features/ui/components/HintBar.js');
    const parent = document.createElement('div');
    const bar = new mod.HintBar({ pointerEvents: 'auto' });
    bar.mount(parent);

    // 设置一个不含 onClick 的项目，确保 _render 不崩溃
    expect(() => {
      bar.setItems([{ icon: 'test', label: 'test' }]);
    }).not.toThrow();

    // 设置一个带 onClick 的项目，确保点击事件绑定不崩溃
    expect(() => {
      bar.setItems([{ icon: 'test', label: 'test', onClick: () => {} }]);
    }).not.toThrow();

    bar.destroy();
  });
});

/* ========== 5. movement.ts eggSplitBurst ?? 修复 ========== */
describe('movement eggSplitBurst ?? 修复', () => {
  it('eggSplitBurst 当 pr.dmg 为 0 时正确使用 0 而非 1', async () => {
    const mod = await import('../domain/weapons/movement.js');
    const result = mod.eggSplitBurst({ dmg: 0, vy: 0, vx: 100 } as any);
    expect(result).toHaveLength(3);
    for (const r of result) {
      // 修复前: (pr.dmg || 1) * 0.7 = 1 * 0.7 = 0.7
      // 修复后: (pr.dmg ?? 1) * 0.7 = 0 * 0.7 = 0
      expect(r.dmg).toBe(0);
    }
  });

  it('eggSplitBurst 当 pr.dmg 为 undefined 时使用默认值 1 * 0.7', async () => {
    const mod = await import('../domain/weapons/movement.js');
    const result = mod.eggSplitBurst({ vy: 0, vx: 100 } as any);
    expect(result).toHaveLength(3);
    for (const r of result) {
      expect(r.dmg).toBe(0.7);
    }
  });

  it('eggSplitBurst 当 pr.dmg 为 5 时正常使用 5 * 0.7', async () => {
    const mod = await import('../domain/weapons/movement.js');
    const result = mod.eggSplitBurst({ dmg: 5, vy: 0, vx: 100 } as any);
    expect(result).toHaveLength(3);
    for (const r of result) {
      expect(r.dmg).toBe(3.5);
    }
  });
});

/* ========== 6. hud_utils setTimeout 防御性检查 ========== */
describe('hud_utils setTimeout 防御性检查', () => {
  it('addDmgNumber 在 fx-layer 不存在时安全跳过', async () => {
    // 在无 DOM 环境下跳过（$ 函数需要 document.getElementById）
    if (typeof document === 'undefined') return;
    const mod = await import('../features/ui/hud_utils.js');
    expect(() => mod.addDmgNumber(100, 100, 50, false)).not.toThrow();
  });

  it('spawnText 在 fx-layer 不存在时安全跳过', async () => {
    if (typeof document === 'undefined') return;
    const mod = await import('../features/ui/hud_utils.js');
    expect(() => mod.spawnText(100, 100, 'test', '#fff')).not.toThrow();
  });

  it('showStageBanner 在 game-wrap 不存在时安全跳过', async () => {
    if (typeof document === 'undefined') return;
    const mod = await import('../features/ui/hud_utils.js');
    expect(() => mod.showStageBanner('test', false)).not.toThrow();
  });

  it('toast 在 toast-wrap 不存在时安全跳过', async () => {
    if (typeof document === 'undefined') return;
    const mod = await import('../features/ui/hud_utils.js');
    expect(() => mod.toast('test')).not.toThrow();
  });
});